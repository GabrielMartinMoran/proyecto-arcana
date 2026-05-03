/**
 * ActorSheetV2 implementation for Arcana system.
 * Uses Foundry VTT v14 ApplicationV2 with HandlebarsApplicationMixin.
 */

import { CONFIG } from '../config';
import type { ArcanaActor } from '../types/actor';
import { buildSheetUrl, buildTokenSettings } from './sheet-url-builder';

const ActorSheetV2Base = foundry.applications.sheets.ActorSheetV2;
const MixedSheet = foundry.applications.api.HandlebarsApplicationMixin(ActorSheetV2Base);

interface SheetContext {
	actor: ArcanaActor;
	iframeUrl: string | null;
	isBestiary: boolean;
	localNotes: string;
	health: { value: number; max: number };
}

/**
 * Custom Actor Sheet V2 for Arcana system.
 * Renders an iframe with external web-based character sheet.
 */
export class ArcanaSheetV2 extends MixedSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ['arcana', 'sheet', 'actor'],
		tag: 'form',
		actions: {
			configureSheet: ArcanaSheetV2.#configureSheet,
		},
		window: {
			title: '',
			controls: [
				{
					action: 'configureSheet',
					icon: 'fas fa-cogs',
					label: 'Configuración',
					ownership: 'OWNER',
				},
			],
		},
		position: { width: 950, height: 800 },
	};

	/** @override */
	static PARTS = {
		form: {
			template: 'systems/arcana/template.html',
		},
	};

	/** Stored iframe reference for preservation across renders */
	private _existingIframe: HTMLIFrameElement | null = null;

	/** AbortController for drag pointer event listeners */
	#dragAbortController: AbortController | null = null;

	/** @override */
	async _preRender(context: any, options: any): Promise<void> {
		this._existingIframe =
			((this as any).element as HTMLElement | undefined)?.querySelector('iframe') ?? null;
		await super._preRender(context, options);
	}

	/**
	 * Prepare context data for the Handlebars template.
	 * Replaces V1 getData().
	 */
	async _prepareContext(options: any): Promise<SheetContext> {
		const context = (await super._prepareContext(options)) as Record<string, any>;
		const sheetUrl = this.actor.getFlag('arcana', 'sheetUrl') as string | null;
		const localNotes = this.actor.getFlag('arcana', 'localNotes') as string | null;

		const urlResult = buildSheetUrl({
			sheetUrl,
			baseUrl: CONFIG.BASE_URL,
			actor: {
				uuid: this.actor.uuid,
				id: this.actor.id as string,
				name: this.actor.name,
				system: this.actor.system as { health?: { value: number; max: number } },
			},
			localNotes,
		});

		return {
			...context,
			actor: this.actor as unknown as ArcanaActor,
			iframeUrl: urlResult.iframeUrl,
			isBestiary: urlResult.isBestiary,
			localNotes: urlResult.localNotes,
			health: urlResult.health,
		};
	}

	/**
	 * Post-render lifecycle hook.
	 * Replaces V1 activateListeners().
	 */
	_onRender(_context: any, options: any): void {
		const element = (this as any).element as HTMLElement | undefined;
		if (!element) return;

		const iframe = element.querySelector('iframe');

		// Preserve existing iframe unless forceReload is set
		if (this._existingIframe && !options.forceReload && iframe && iframe !== this._existingIframe) {
			iframe.replaceWith(this._existingIframe);
		}
		this._existingIframe = null;

		this.#attachBestiaryListeners(element);
		this.#attachDragPointerEvents(element, iframe);
	}

	/**
	 * Override render to prevent full re-renders when an iframe is already present.
	 * This avoids destroying the iframe state on every actor update.
	 */
	// @ts-expect-error ApplicationV2 render signature may differ between versions
	override render(options?: { forceReload?: boolean }): Promise<this> {
		const existingIframe = ((this as any).element as HTMLElement | undefined)?.querySelector(
			'iframe',
		);
		if (existingIframe && !options?.forceReload) {
			const titleEl = ((this as any).element as HTMLElement | undefined)?.querySelector(
				'.window-title',
			);
			if (titleEl) {
				titleEl.textContent = this.actor.name;
			}
			return Promise.resolve(this);
		}
		// @ts-expect-error super.render is not typed in this Foundry version
		return super.render(options);
	}

	/**
	 * Attach change listeners to bestiary inputs (HP, notes, etc.)
	 * so user edits are persisted back to the Actor document.
	 */
	#attachBestiaryListeners(element: HTMLElement): void {
		element.querySelectorAll('input, textarea').forEach((input: Element) => {
			input.addEventListener('change', async (ev: Event) => {
				const target = ev.target as HTMLInputElement | HTMLTextAreaElement;
				const field = target.name;
				const value = target.value;
				await this.actor.update({ [field]: value }, { render: false });
				ui?.actors?.render();
			});
		});
	}

	/**
	 * Disable pointer events on the iframe while the user drags or resizes
	 * the sheet window, then re-enable them on mouse up.
	 */
	#attachDragPointerEvents(element: HTMLElement, iframe: Element | null): void {
		this.#dragAbortController?.abort();
		this.#dragAbortController = new AbortController();
		const { signal } = this.#dragAbortController;

		const appWindow = element.closest('.application') as HTMLElement | null;
		if (!iframe || !appWindow) return;

		appWindow.addEventListener(
			'mousedown',
			(ev: MouseEvent) => {
				const target = ev.target as HTMLElement;
				if (target.closest('.window-header, .window-resizable-handle')) {
					(iframe as HTMLIFrameElement).style.pointerEvents = 'none';
				}
			},
			{ signal },
		);
		window.addEventListener(
			'mouseup',
			() => {
				(iframe as HTMLIFrameElement).style.pointerEvents = 'auto';
			},
			{ signal },
		);
	}

	/**
	 * Header controls fallback for V2.
	 * Ensures the configure button is present even if window.controls merging fails.
	 */
	protected _getHeaderControls(): any[] {
		// @ts-expect-error _getHeaderControls exists at runtime in ApplicationV2 but types are incomplete
		const controls: any[] = super._getHeaderControls();
		controls.unshift({
			action: 'configureSheet',
			icon: 'fas fa-cogs',
			label: 'Configuración',
			ownership: 'OWNER',
		});
		return controls;
	}

	/**
	 * Action handler for the configure-sheet header button.
	 */
	static async #configureSheet(
		this: InstanceType<typeof ArcanaSheetV2>,
		_event: PointerEvent,
		_target: HTMLElement,
	): Promise<void> {
		const currentUrl = this.actor.getFlag('arcana', 'sheetUrl') || '';
		const isLinked = (this.actor.prototypeToken as any).actorLink;

		new Dialog({
			title: `Configurar: ${this.actor.name}`,
			content: `
				<form>
					<div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
					<hr>
					<div class="form-group"><label>Personaje Único?</label><input type="checkbox" name="actorLink" ${isLinked ? 'checked' : ''} /></div>
					<p class="notes">
						<b>Check:</b> PJ (Vida sincronizada).<br>
						<b>Uncheck:</b> NPC/Bestiario (Vida independiente).<br>
						<i>Se configurará Barra 1, se ocultará Barra 2 y se activará Visión.</i>
					</p>
				</form>`,
			buttons: {
				save: {
					label: 'Guardar y Configurar',
					icon: "<i class='fas fa-save'></i>",
					callback: async (html: JQuery) => {
						const newUrl = html.find("input[name='url']").val() as string;
						const newLinkState = html.find("input[name='actorLink']").is(':checked');

						await this.actor.setFlag('arcana', 'sheetUrl', newUrl.trim());

						const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);
						await this.actor.update(tokenSettings as any);

						const activeTokens = this.actor.getActiveTokens();
						for (const t of activeTokens) {
							await (t as any).document.update({
								displayBars: 40,
								'bar1.attribute': 'health',
								'bar2.attribute': null,
								'sight.enabled': true,
							});
						}

						(this as any).render({ force: true, forceReload: true });
					},
				},
			},
			default: 'save',
		} as any).render(true);
	}
}
