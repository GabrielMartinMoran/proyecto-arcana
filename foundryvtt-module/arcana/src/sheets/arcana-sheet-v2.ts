/**
 * ActorSheetV2 implementation for Arcana system.
 * Uses Foundry VTT v14 ApplicationV2 with HandlebarsApplicationMixin.
 */

import { CONFIG } from '../config';
import {
	buildCreatureSizeId,
	CREATURE_SIZE_CATEGORIES,
	getCreatureSizeCategoryId,
	inferCreatureSize,
	LARGE_SIZE_VARIANTS,
	resolveCreatureSize,
	type CreatureSize,
	type CreatureSizeCategoryId,
} from '../constants/creature-sizes';
import {
	getTokenColorHex,
	resolveDefaultTokenColorId,
	resolveTokenColorId,
	TOKEN_COLORS,
	type TokenColorId,
} from '../constants/token-colors';
import { isCharacterURL } from '../helpers/actor-urls';
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
import type { ActorSystemData, ArcanaActor } from '../types/actor';
import { MESSAGE_TYPES } from '../types/messages';
import { buildSheetUrl, buildTokenSettings } from './sheet-url-builder';

const ActorSheetV2Base = foundry.applications.sheets.ActorSheetV2;
const MixedSheet = foundry.applications.api.HandlebarsApplicationMixin(ActorSheetV2Base);

const DEFAULT_SHEET_POSITION = { width: 950, height: 800 };
const REATTACH_BUTTON_CLASS = 'arcana-detach-return';
const REATTACH_BUTTON_LABEL = 'Volver a Foundry';

interface SheetContext {
	actor: ArcanaActor;
	iframeUrl: string | null;
	isBestiary: boolean;
	localNotes: string;
	health: { value: number; max: number; temp: number };
	npcAbilityGroups: NpcAbilityUsageGroup[];
	hasNpcAbilityUsage: boolean;
}

interface SheetRenderOptions {
	forceReload?: boolean;
	/** Render option used by ApplicationV2#detachWindow/attachWindow in Foundry v14. */
	window?: { detached?: boolean; windowId?: string };
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

	/** Floating re-attach control, present only while the sheet is detached. */
	#reattachButton: HTMLButtonElement | null = null;

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
		const tokenBorderColor = this.actor.getFlag('arcana', 'tokenBorderColor') as string | undefined;

		const urlResult = buildSheetUrl({
			sheetUrl,
			baseUrl: CONFIG.BASE_URL,
			actor: {
				uuid: this.actor.uuid,
				id: this.actor.id as string,
				name: this.actor.name,
				type: (this.actor as any).type,
				system: this.actor.system as ActorSystemData,
			},
			localNotes,
			tokenBorderColor,
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
	 *
	 * Detach/attach renders (`window` option) always pass through so Foundry can
	 * move the application DOM into (or out of) the detached window and fire
	 * _onDetach/_onAttach. The existing iframe preservation in _onRender keeps
	 * the embedded sheet alive without a forced reload.
	 */
	// @ts-expect-error ApplicationV2 render signature may differ between versions
	override render(options?: SheetRenderOptions): Promise<this> {
		const element = (this as any).element as HTMLElement | undefined;
		const existingIframe = element?.querySelector('iframe');
		const isWindowTransition = options?.window !== undefined;
		if (existingIframe && !options?.forceReload && !isWindowTransition) {
			if (element) {
				this.#refreshNpcAbilityControls(element);
				this.#refreshHealthInputs(element);
			}
			const titleEl = element?.querySelector('.window-title');
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
	 * Re-wire host-document bindings after Foundry moves the application into a
	 * detached browser window. The DOM now belongs to the detached document, so
	 * pointer events must be tracked on its window instead of the main workspace.
	 * The detached document also receives the actor name as OS window title and
	 * the floating control that brings the sheet back.
	 */
	protected _onDetach(_from: Document, _to: Document): void {
		// @ts-expect-error v14 lifecycle hook is missing from the installed v13 types
		super._onDetach?.(_from, _to);
		this.#rewireHostWindowBindings();
		_to.title = this.title;
		this.#addReattachButton(_to);
	}

	/**
	 * Re-wire host-document bindings after the application returns to the main
	 * workspace window, dropping the detached-only re-attach control.
	 */
	protected _onAttach(_from: Document, _to: Document): void {
		// @ts-expect-error v14 lifecycle hook is missing from the installed v13 types
		super._onAttach?.(_from, _to);
		this.#removeReattachButton();
		this.#rewireHostWindowBindings();
	}

	/**
	 * Add the floating control that re-attaches the sheet. Nodes are created
	 * with the detached document, and any previous control is replaced so the
	 * lifecycle stays idempotent.
	 */
	#addReattachButton(detachedDocument: Document): void {
		const element = (this as any).element as HTMLElement | undefined;
		if (!element) return;

		this.#removeReattachButton();

		const button = detachedDocument.createElement('button');
		button.type = 'button';
		button.className = REATTACH_BUTTON_CLASS;
		button.title = REATTACH_BUTTON_LABEL;
		button.setAttribute('aria-label', REATTACH_BUTTON_LABEL);

		const icon = detachedDocument.createElement('i');
		icon.className = 'fas fa-thumbtack';
		button.append(icon);

		button.addEventListener('click', () => this.#reattachWindow());
		element.append(button);
		this.#reattachButton = button;
	}

	#removeReattachButton(): void {
		this.#reattachButton?.remove();
		this.#reattachButton = null;
	}

	#reattachWindow(): void {
		const application = this as unknown as { attachWindow?: () => unknown };
		application.attachWindow?.();
	}

	#rewireHostWindowBindings(): void {
		const element = (this as any).element as HTMLElement | undefined;
		if (!element) return;

		const iframe = element.querySelector('iframe');
		this.#attachDragPointerEvents(element, iframe);

		const titleEl = element.querySelector('.window-title');
		if (titleEl) {
			titleEl.textContent = this.actor.name;
		}

		if (iframe) {
			this.#postHealthToIframe(iframe as HTMLIFrameElement);
		}
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
				const value = this.#normalizeBestiaryFieldValue(field, target.value);
				await this.actor.update({ [field]: value }, { render: false });
				ui?.actors?.render();
			});
		});
		this.#attachNpcAbilityListeners(element);
	}

	/**
	 * Normalize bestiary input values before persisting them.
	 * Temporary HP is a numeric pool clamped at zero; every other field keeps
	 * its existing raw-string behavior.
	 */
	#normalizeBestiaryFieldValue(field: string, value: string): string | number {
		if (field !== 'system.health.temp') return value;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
	}

	/**
	 * Keep the interactive bestiary health inputs in sync with the actor data
	 * when a cached iframe prevents a full sheet re-render (for example after
	 * damage applied from the Token HUD).
	 */
	#refreshHealthInputs(element: HTMLElement): void {
		const health = (this.actor.system as ActorSystemData).health;
		if (!health) return;

		const fields: Array<[string, number]> = [
			['system.health.value', health.value],
			['system.health.max', health.max],
			['system.health.temp', health.temp ?? 0],
		];
		for (const [name, value] of fields) {
			const input = element.querySelector<HTMLInputElement>(`input[name='${name}']`);
			if (input) input.value = String(value);
		}
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
	 *
	 * Uses the element's owner window so the mouseup listener follows the
	 * application DOM when Foundry moves it into a detached browser window.
	 */
	#attachDragPointerEvents(element: HTMLElement, iframe: Element | null): void {
		this.#dragAbortController?.abort();
		this.#dragAbortController = new AbortController();
		const { signal } = this.#dragAbortController;

		const appWindow = element.closest('.application') as HTMLElement | null;
		if (!iframe || !appWindow) return;

		const ownerWindow = element.ownerDocument.defaultView ?? window;
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
		ownerWindow.addEventListener(
			'mouseup',
			() => {
				(iframe as HTMLIFrameElement).style.pointerEvents = 'auto';
			},
			{ signal },
		);
	}

	#postHealthToIframe(iframe: HTMLIFrameElement): void {
		const hp = (this.actor.system as ActorSystemData).health;
		if (!hp || !iframe.contentWindow) return;

		iframe.contentWindow.postMessage(
			{
				type: MESSAGE_TYPES.FOUNDRY_HEALTH_UPDATE,
				payload: { hp: { value: hp.value, max: hp.max, temp: hp.temp ?? 0 } },
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
		const currentColorId = resolveTokenColorId(
			this.actor.getFlag('arcana', 'tokenBorderColor'),
			resolveDefaultTokenColorId((this.actor as any).type, !isCharacterURL(currentUrl)),
		);
		const currentCreatureSize = resolveCurrentCreatureSize(this.#actor());
		const currentCreatureCategory = currentCreatureSize
			? getCreatureSizeCategoryId(currentCreatureSize.id)
			: null;
		const isLargeCreatureCategory = currentCreatureCategory === 'inmenso';

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
					<style>
						.token-color-option:has(input:checked) { border-color: rgba(255,255,255,0.85) !important; background: rgba(255,255,255,0.12) !important; }
						.token-offset-value { flex: 0 0 auto; min-width: 4.5ch; text-align: center; margin-left: 0.5rem; }
					</style>
					<div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
					<hr>
					<div class="form-group"><label>Visión Nocturna:</label><select name="nightVision">${nightVisionOptions}</select></div>
					<hr>
					<div class="form-group"><label>Color del Borde:</label><div class="token-color-options" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; justify-content: space-between;">${renderTokenColorOptions(currentColorId)}</div></div>
					<hr>
					<div class="creature-size-group">
						<div class="form-group"><label>Tamaño de Criatura:</label><select name="creatureSizeCategory" onchange="this.closest('.creature-size-group').querySelector('[data-creature-size-variant]').style.display = this.value === 'inmenso' ? '' : 'none'">${renderCreatureSizeCategoryOptions(currentCreatureCategory)}</select></div>
						<div class="form-group" data-creature-size-variant style="${isLargeCreatureCategory ? '' : 'display: none'}"><label>Variante:</label><select name="creatureSizeVariant">${renderLargeSizeVariantOptions(currentCreatureSize?.width ?? 3)}</select></div>
					</div>
					<hr>
					<div class="form-group"><label>Desplazamiento X:</label><input type="range" name="tokenOffsetX" min="-50" max="50" value="${tokenOffsetX}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetX}%</span></div>
					<div class="form-group"><label>Desplazamiento Y:</label><input type="range" name="tokenOffsetY" min="-50" max="50" value="${tokenOffsetY}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetY}%</span></div>
					<hr>
					<div class="form-group"><label>Personaje Único?</label><input type="checkbox" name="actorLink" ${isLinked ? 'checked' : ''} /></div>
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
						const newColorId = resolveTokenColorId(
							html.find("input[name='tokenBorderColor']:checked").val() as string,
							currentColorId,
						);
						const newCreatureSize = resolveSelectedCreatureSize(
							html.find("select[name='creatureSizeCategory']").val() as string,
							html.find("select[name='creatureSizeVariant']").val() as string,
						);

						await this.actor.setFlag('arcana', 'sheetUrl', newUrl.trim());
						await this.actor.setFlag('arcana', 'tokenOffsetX', newTokenOffsetX);
						await this.actor.setFlag('arcana', 'tokenOffsetY', newTokenOffsetY);
						await this.actor.setFlag('arcana', 'tokenBorderColor', newColorId);
						if (newCreatureSize) {
							// The key is declared in ArcanaFlags; like the NPC ability flags it is
							// written through the ArcanaActor view because FlagConfig does not list it.
							await this.#actor().setFlag('arcana', 'creatureSize', newCreatureSize.id);
						}

						const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);
						const sightUpdate = getNightVisionSightUpdate(newNightVision as any);

						const prototypeTokenSight: Record<string, unknown> = {};
						for (const [key, value] of Object.entries(sightUpdate)) {
							prototypeTokenSight[`prototypeToken.${key}`] = value;
						}
						// Saving a size intentionally overwrites manual token resizes (D-B5).
						const prototypeTokenSize: Record<string, unknown> = newCreatureSize
							? {
									'prototypeToken.width': newCreatureSize.width,
									'prototypeToken.height': newCreatureSize.height,
								}
							: {};

						await this.actor.update({
							...tokenSettings,
							'system.nightVision': newNightVision,
							...prototypeTokenSight,
							...prototypeTokenSize,
						} as any);

						const tokenSize = newCreatureSize
							? { width: newCreatureSize.width, height: newCreatureSize.height }
							: {};
						const activeTokens = this.actor.getActiveTokens();
						for (const t of activeTokens) {
							await (t as any).document.update({
								displayBars: 40,
								'bar1.attribute': 'health',
								'bar2.attribute': null,
								'sight.enabled': true,
								...sightUpdate,
								...tokenSize,
							});
						}

						// Live color refresh: ask the embedded web sheet to regenerate the
						// token image instead of reloading the iframe. Reload when the web
						// URL or the token offsets changed: offsets are only propagated
						// through the iframe URL, so a live iframe cannot receive them
						// otherwise.
						if (newColorId !== currentColorId) {
							this.#postTokenColorToIframe(newColorId);
						}

						const urlChanged = newUrl.trim() !== currentUrl;
						const tokenOffsetsChanged =
							newTokenOffsetX !== tokenOffsetX || newTokenOffsetY !== tokenOffsetY;
						(this as any).render({
							force: true,
							forceReload: urlChanged || tokenOffsetsChanged,
						});
					},
				},
			},
			default: 'save',
		} as any).render(true);
	}

	#postTokenColorToIframe(colorId: TokenColorId): void {
		const iframe = ((this as any).element as HTMLElement | undefined)?.querySelector('iframe');
		if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) return;

		iframe.contentWindow.postMessage(
			{
				type: MESSAGE_TYPES.FOUNDRY_TOKEN_COLOR_UPDATE,
				color: getTokenColorHex(colorId),
			},
			'*',
		);
	}
}

function renderTokenColorOptions(currentColorId: TokenColorId): string {
	return TOKEN_COLORS.map((color) => {
		const isSelected = color.id === currentColorId;
		// Selection is rendered solely by the injected :has(input:checked) rule;
		// baking it into the inline style would leave the previous swatch
		// highlighted after the user clicks a different radio.
		return `
			<label class="token-color-option" data-color-id="${color.id}" data-selected="${isSelected}" title="${escapeHtml(color.label)}" style="display: inline-flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; padding: 3px 5px; border-radius: 6px; border: 2px solid transparent; background: transparent; width: 50px;">
				<input type="radio" name="tokenBorderColor" value="${color.id}" aria-label="${escapeHtml(color.label)}" ${isSelected ? 'checked' : ''} style="position: absolute; opacity: 0; width: 1px; height: 1px" />
				<span class="token-color-swatch" style="width: 22px; height: 22px; border-radius: 50%; background: ${color.hex}; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.45)"></span>
				<span class="token-color-label" style="font-size: 0.72rem">${escapeHtml(color.label)}</span>
			</label>`;
	}).join('');
}

/**
 * Resolve the size to preselect: the stored flag wins, then a unique match on
 * the prototype token dimensions, otherwise the neutral (no size) option.
 */
function resolveCurrentCreatureSize(actor: ArcanaActor): CreatureSize | null {
	const stored = resolveCreatureSize(actor.getFlag('arcana', 'creatureSize'));
	if (stored) return stored;
	return inferCreatureSize(actor.prototypeToken.width, actor.prototypeToken.height);
}

/**
 * Resolve the chosen dialog values into a size, or null for the neutral option.
 * Only the largest category combines with the variant selector footprint.
 */
function resolveSelectedCreatureSize(
	category: string,
	largeFootprint: string,
): CreatureSize | null {
	if (category === '') return null;
	const sizeId =
		category === 'inmenso' ? buildCreatureSizeId('inmenso', Number(largeFootprint)) : category;
	return resolveCreatureSize(sizeId);
}

function renderCreatureSizeCategoryOptions(currentCategory: CreatureSizeCategoryId | null): string {
	const neutralOption = `<option value=""${currentCategory === null ? ' selected' : ''}>— Sin configurar —</option>`;
	const categoryOptions = CREATURE_SIZE_CATEGORIES.map(
		(category) =>
			`<option value="${category.id}"${category.id === currentCategory ? ' selected' : ''}>${escapeHtml(category.label)}</option>`,
	).join('');
	return neutralOption + categoryOptions;
}

function renderLargeSizeVariantOptions(currentFootprint: number): string {
	return LARGE_SIZE_VARIANTS.map(
		(variant) =>
			`<option value="${variant.width}"${variant.width === currentFootprint ? ' selected' : ''}>${escapeHtml(variant.label)}</option>`,
	).join('');
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
