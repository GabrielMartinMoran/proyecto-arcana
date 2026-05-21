/**
 * ActorSheetV2 implementation for Arcana system.
 * Uses Foundry VTT v14 ApplicationV2 with HandlebarsApplicationMixin.
 */

import { CONFIG } from '../config';
import { getNightVisionSightUpdate, NIGHT_VISION_LABELS } from '../helpers/night-vision';
import {
	buildNpcAbilityUsageGroups,
	readUsage,
	resolveNpcAbilityUsageOwner,
	rollNpcAbilityRecharge,
	updateNpcAbilityCurrent,
	type NpcAbilityDefinition,
	type NpcAbilityUsageGroup,
} from '../services/npc-ability-usage';
import type { ArcanaActor } from '../types/actor';
import { MESSAGE_TYPES } from '../types/messages';
import { buildSheetUrl, buildTokenSettings } from './sheet-url-builder';

const ActorSheetV2Base = foundry.applications.sheets.ActorSheetV2;
const MixedSheet = foundry.applications.api.HandlebarsApplicationMixin(ActorSheetV2Base);

const DEFAULT_SHEET_POSITION = { width: 950, height: 800 };

interface SheetContext {
	actor: ArcanaActor;
	iframeUrl: string | null;
	isBestiary: boolean;
	localNotes: string;
	health: { value: number; max: number };
	npcAbilityGroups: NpcAbilityUsageGroup[];
	hasNpcAbilityUsage: boolean;
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
			resizable: true,
			controls: [
				{
					action: 'configureSheet',
					icon: 'fas fa-cogs',
					label: 'Configuración',
					ownership: 'OWNER',
				},
			],
		},
		position: DEFAULT_SHEET_POSITION,
	};

	/** @override */
	static PARTS = {
		form: {
			template: 'systems/arcana/template.html',
		},
	};

	/** @override */
	// @ts-expect-error title getter exists at runtime in DocumentSheetV2 but types are incomplete
	override get title(): string {
		return this.actor.name;
	}

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
		const tokenOffsetX = (this.actor.getFlag('arcana', 'tokenOffsetX') as number | undefined) ?? 0;
		const tokenOffsetY = (this.actor.getFlag('arcana', 'tokenOffsetY') as number | undefined) ?? 0;

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
			tokenOffsetX,
			tokenOffsetY,
		});

		const npcAbilityGroups = urlResult.isBestiary ? this.#getNpcAbilityGroups() : [];

		return {
			...context,
			actor: this.actor as unknown as ArcanaActor,
			iframeUrl: urlResult.iframeUrl,
			isBestiary: urlResult.isBestiary,
			localNotes: urlResult.localNotes,
			health: urlResult.health,
			npcAbilityGroups,
			hasNpcAbilityUsage: npcAbilityGroups.length > 0,
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
		if (iframe instanceof HTMLIFrameElement && !options.forceReload) {
			this.#postHealthToIframe(iframe);
		}

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
			const element = (this as any).element as HTMLElement | undefined;
			if (element) this.#refreshNpcAbilityControls(element);
			const titleEl = ((this as any).element as HTMLElement | undefined)?.querySelector(
				'.window-title',
			);
			if (titleEl) {
				titleEl.textContent = this.actor.name;
			}
			// @ts-expect-error bringToFront exists at runtime in ApplicationV2 but types are incomplete
			this.bringToFront?.();
			this.#postHealthToIframe(existingIframe as HTMLIFrameElement);
			return Promise.resolve(this);
		}
		// @ts-expect-error super.render is not typed in this Foundry version
		return super.render(options);
	}

	/**
	 * Override close to reset position so the sheet opens at default size next time.
	 * In V14 the sheet instance is cached, so without this the last resized dimensions persist.
	 */
	// @ts-expect-error close may not be typed in this Foundry version
	override async close(options?: any): Promise<this> {
		((this as any).position as { width: number; height: number }).width =
			DEFAULT_SHEET_POSITION.width;
		((this as any).position as { width: number; height: number }).height =
			DEFAULT_SHEET_POSITION.height;
		// @ts-expect-error super.close is not typed in this Foundry version
		return super.close(options);
	}

	/**
	 * Attach change listeners to bestiary inputs (HP, notes, etc.)
	 * so user edits are persisted back to the Actor document.
	 */
	#attachBestiaryListeners(element: HTMLElement): void {
		element.querySelectorAll('input, textarea').forEach((input: Element) => {
			if ((input as HTMLElement).dataset.npcAbilityControl) return;
			input.addEventListener('change', async (ev: Event) => {
				const target = ev.target as HTMLInputElement | HTMLTextAreaElement;
				const field = target.name;
				const value = target.value;
				await this.actor.update({ [field]: value }, { render: false });
				ui?.actors?.render();
			});
		});
		this.#attachNpcAbilityListeners(element);
	}

	#attachNpcAbilityListeners(element: HTMLElement): void {
		element.querySelectorAll<HTMLElement>('[data-npc-ability-control]').forEach((control) => {
			control.addEventListener('change', async (event) => {
				const target = event.target as HTMLInputElement;
				const abilityId = target.dataset.abilityId;
				if (!abilityId) return;
				await this.#setNpcAbilityCurrent(abilityId, Number(target.value));
			});
		});

		element.querySelectorAll<HTMLElement>('[data-npc-ability-action]').forEach((control) => {
			control.addEventListener('click', async () => {
				const abilityId = control.dataset.abilityId;
				if (!abilityId) return;
				if (control.dataset.npcAbilityAction === 'use') {
					const current = this.#getCurrentAbilityValue(abilityId) - 1;
					await this.#setNpcAbilityCurrent(abilityId, current);
				}
				if (control.dataset.npcAbilityAction === 'recharge') {
					await rollNpcAbilityRecharge(this.#actor(), abilityId, this.#getNpcAbilityDefinitions());
					this.#refreshNpcAbilityControls((this as any).element as HTMLElement);
				}
			});
		});
	}

	async #setNpcAbilityCurrent(abilityId: string, current: number): Promise<void> {
		const usage = await updateNpcAbilityCurrent(
			this.#actor(),
			abilityId,
			current,
			this.#getNpcAbilityDefinitions(),
		);
		const counter = usage[abilityId];
		if (!counter) return;
		this.#updateNpcAbilityDisplay(abilityId, counter.current, counter.max);
	}

	#getCurrentAbilityValue(abilityId: string): number {
		const usage = readUsage(resolveNpcAbilityUsageOwner(this.#actor()));
		return usage?.[abilityId]?.current ?? 0;
	}

	#getNpcAbilityDefinitions(): NpcAbilityDefinition[] {
		const definitions = this.#actor().getFlag('arcana', 'npcAbilityDefinitions');
		return Array.isArray(definitions) ? definitions : [];
	}

	#getNpcAbilityGroups(): NpcAbilityUsageGroup[] {
		return buildNpcAbilityUsageGroups(
			this.#getNpcAbilityDefinitions(),
			readUsage(resolveNpcAbilityUsageOwner(this.#actor())) ?? {},
		);
	}

	#actor(): ArcanaActor {
		return this.actor as unknown as ArcanaActor;
	}

	#refreshNpcAbilityControls(element: HTMLElement): void {
		const groups = this.#getNpcAbilityGroups();
		const existing = element.querySelector('.npc-ability-usage-section');
		if (groups.length === 0) {
			existing?.remove();
			return;
		}

		const html = this.#renderNpcAbilitySection(groups);
		if (existing) {
			existing.outerHTML = html;
		} else {
			element.querySelector('.bestiary-controls')?.insertAdjacentHTML('beforeend', html);
		}
		this.#attachNpcAbilityListeners(element);
	}

	#renderNpcAbilitySection(groups: NpcAbilityUsageGroup[]): string {
		const groupsHtml = groups.map((group) => this.#renderNpcAbilityGroup(group)).join('');
		return `<div class="npc-ability-usage-section npc-ability-usage-compact" style="margin-top: 6px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px">${groupsHtml}</div>`;
	}

	#renderNpcAbilityGroup(group: NpcAbilityUsageGroup): string {
		const abilitiesHtml = group.abilities
			.map(
				(ability) => `
					<div class="npc-ability-row npc-ability-row-compact" data-ability-id="${escapeHtml(ability.id)}" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px">
						<span class="npc-ability-name" style="flex: 1 1 140px">${escapeHtml(ability.name)}</span>
						<div class="npc-ability-controls-inline" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px">
							<button type="button" data-npc-ability-action="use" data-ability-id="${escapeHtml(ability.id)}">Usar</button>
							<input type="number" data-npc-ability-control="current" data-ability-id="${escapeHtml(ability.id)}" value="${ability.current}" min="0" max="${ability.max}" style="width: 44px; text-align: center" />
							<span style="font-size: 1.1rem" data-ability-display="${escapeHtml(ability.id)}">/${ability.max}</span>
							${ability.isRecharge ? `<button type="button" data-npc-ability-action="recharge" data-ability-id="${escapeHtml(ability.id)}">Recarga</button>` : ''}
						</div>
					</div>`,
			)
			.join('');
		return `<section style="flex: 1 1 calc((100% - 16px) / 3); min-width: 220px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between" class="npc-ability-group npc-ability-group-compact" data-npc-ability-group="${group.source}"><h4 style="margin: 2px 0; font-size: 1rem">${group.label}</h4>${abilitiesHtml}</section>`;
	}

	#updateNpcAbilityDisplay(abilityId: string, current: number, max: number): void {
		const element = (this as any).element as HTMLElement | undefined;
		const escapedId = cssEscape(abilityId);
		const input = element?.querySelector<HTMLInputElement>(
			`[data-npc-ability-control][data-ability-id="${escapedId}"]`,
		);
		const display = element?.querySelector<HTMLElement>(`[data-ability-display="${escapedId}"]`);
		if (input) input.value = String(current);
		if (display) display.textContent = `/${max}`;
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

	#postHealthToIframe(iframe: HTMLIFrameElement): void {
		const hp = (this.actor.system as { health?: { value: number; max: number } }).health;
		if (!hp || !iframe.contentWindow) return;

		iframe.contentWindow.postMessage(
			{
				type: MESSAGE_TYPES.FOUNDRY_HEALTH_UPDATE,
				payload: { hp: { value: hp.value, max: hp.max } },
			},
			'*',
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
		const currentNightVision = (this.actor.system as any).nightVision || 'none';
		const tokenOffsetX = (this.actor.getFlag('arcana', 'tokenOffsetX') as number | undefined) ?? 0;
		const tokenOffsetY = (this.actor.getFlag('arcana', 'tokenOffsetY') as number | undefined) ?? 0;

		const nightVisionOptions = Object.entries(NIGHT_VISION_LABELS)
			.map(
				([value, label]) =>
					`<option value="${value}" ${value === currentNightVision ? 'selected' : ''}>${label}</option>`,
			)
			.join('');

		new Dialog({
			title: `Configurar: ${this.actor.name}`,
			content: `
				<form>
					<div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
					<hr>
					<div class="form-group"><label>Visión Nocturna:</label><select name="nightVision">${nightVisionOptions}</select></div>
					<hr>
					<div class="form-group"><label>Desplazamiento X:</label><input type="range" name="tokenOffsetX" min="-50" max="50" value="${tokenOffsetX}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetX}%</span></div>
					<div class="form-group"><label>Desplazamiento Y:</label><input type="range" name="tokenOffsetY" min="-50" max="50" value="${tokenOffsetY}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetY}%</span></div>
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
						const newNightVision = html.find("select[name='nightVision']").val() as string;
						const newTokenOffsetX = Number(html.find("input[name='tokenOffsetX']").val());
						const newTokenOffsetY = Number(html.find("input[name='tokenOffsetY']").val());

						await this.actor.setFlag('arcana', 'sheetUrl', newUrl.trim());
						await this.actor.setFlag('arcana', 'tokenOffsetX', newTokenOffsetX);
						await this.actor.setFlag('arcana', 'tokenOffsetY', newTokenOffsetY);

						const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);
						const sightUpdate = getNightVisionSightUpdate(newNightVision as any);

						const prototypeTokenSight: Record<string, unknown> = {};
						for (const [key, value] of Object.entries(sightUpdate)) {
							prototypeTokenSight[`prototypeToken.${key}`] = value;
						}

						await this.actor.update({
							...tokenSettings,
							'system.nightVision': newNightVision,
							...prototypeTokenSight,
						} as any);

						const activeTokens = this.actor.getActiveTokens();
						for (const t of activeTokens) {
							await (t as any).document.update({
								displayBars: 40,
								'bar1.attribute': 'health',
								'bar2.attribute': null,
								'sight.enabled': true,
								...sightUpdate,
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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function cssEscape(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
