import { CONFIG } from '../config';
import type { ArcanaActor } from '../types/actor';
import { buildSheetUrl, buildTokenSettings } from './sheet-url-builder';

interface SheetData {
	actor: ArcanaActor;
	iframeUrl: string | null;
	isBestiary: boolean;
	localNotes: string;
	health: {
		value: number;
		max: number;
	};
}

interface SheetOptions {
	classes: string[];
	template: string;
	width: number;
	height: number;
	resizable: boolean;
	scrollY: string[];
}

/**
 * Custom Actor Sheet for Arcana system
 * Renders an iframe with external web-based character sheet
 * @ts-ignore - Extending FoundryVTT ActorSheet
 */
export class ArcanaSheet extends ActorSheet<any, any, any> {
	declare actor: ArcanaActor;

	static override get defaultOptions(): SheetOptions {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['arcana', 'sheet', 'actor'],
			template: 'modules/arcana/template.html',
			width: 950,
			height: 800,
			resizable: true,
			scrollY: [],
		}) as SheetOptions;
	}

	/**
	 * Render the sheet - only reload iframe when forced
	 */
	override async render(force?: boolean, options: any = {}): Promise<this> {
		const existingIframe = (this as any).element ? (this as any).element.find('iframe')[0] : null;

		if (existingIframe && !options.forceReload) {
			if (this.actor) {
				(this as any).element.find('.window-title').text(this.actor.name);

				// Visual update for bestiary panel
				const hpVal = (this.actor.system as any).health?.value ?? 0;
				const hpMax = (this.actor.system as any).health?.max ?? 0;
				const notes = this.actor.getFlag('arcana', 'localNotes') || '';

				(this as any).element.find("input[name='system.health.value']").val(hpVal);
				(this as any).element.find("input[name='system.health.max']").val(hpMax);
				(this as any).element.find("textarea[name='flags.arcana.localNotes']").val(notes);
			}
			return this;
		}

		return super.render(force, options);
	}

	/**
	 * Disable reactive updates
	 */
	protected override async _onUpdate(): Promise<void> {
		// Intentionally empty - we handle updates manually
	}

	/**
	 * Prepare sheet data
	 */
	override getData(): SheetData {
		const data = super.getData() as SheetData;
		const sheetUrl = this.actor.getFlag('arcana', 'sheetUrl') as string | null;
		const localNotes = this.actor.getFlag('arcana', 'localNotes') as string | null;

		const urlResult = buildSheetUrl({
			sheetUrl,
			baseUrl: CONFIG.BASE_URL,
			actor: {
				uuid: this.actor.uuid,
				id: this.actor.id,
				name: this.actor.name,
				system: this.actor.system as { health?: { value: number; max: number } },
			},
			localNotes,
		});

		data.iframeUrl = urlResult.iframeUrl;
		data.isBestiary = urlResult.isBestiary;
		data.localNotes = urlResult.localNotes;
		data.health = urlResult.health;

		return data;
	}

	/**
	 * Activate event listeners
	 */
	override activateListeners(html: JQuery): void {
		super.activateListeners(html);

		// Bestiary input handling
		html.find('input, textarea').on('change', async (ev) => {
			const input = ev.currentTarget as HTMLInputElement | HTMLTextAreaElement;
			const field = input.name;
			const value = input.value;
			await this.actor.update({ [field]: value });
		});

		// Fix iframe mouse interaction during drag/resize
		const iframe = html.find('iframe')[0];
		const appWindow = (this as any).element;
		if (iframe) {
			appWindow.on('mousedown', '.window-header, .window-resizable-handle', () => {
				iframe.style.pointerEvents = 'none';
			});
			$(window).on('mouseup', () => {
				iframe.style.pointerEvents = 'auto';
			});
		}
	}

	/**
	 * Add configuration button to header
	 */
	override _getHeaderButtons(): any[] {
		const buttons = super._getHeaderButtons();
		buttons.unshift({
			label: 'Configuración',
			class: 'configure-arcana',
			icon: 'fas fa-cogs',
			onclick: () => this.configureSheet(),
		});
		return buttons;
	}

	/**
	 * Show configuration dialog
	 */
	async configureSheet(): Promise<void> {
		const currentUrl = this.actor.getFlag('arcana', 'sheetUrl') || '';
		const isLinked = (this.actor.prototypeToken as any).actorLink;

		new Dialog({
			title: `Configurar: ${this.actor.name}`,
			content: `
        <form>
            <div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
            <hr>
            <div class="form-group"><label>¿Personaje Único?</label><input type="checkbox" name="actorLink" ${
							isLinked ? 'checked' : ''
						} /></div>
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

						// Automatic token configuration
						const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);

						await this.actor.update(tokenSettings);

						// Update existing tokens in the scene
						const activeTokens = this.actor.getActiveTokens();
						for (const t of activeTokens) {
							await (t as any).document.update({
								displayBars: 40,
								'bar1.attribute': 'health',
								'bar2.attribute': null,
								'sight.enabled': true,
							});
						}

						this.render(true, { forceReload: true });
					},
				},
			},
			default: 'save',
		} as any).render(true);
	}
}
