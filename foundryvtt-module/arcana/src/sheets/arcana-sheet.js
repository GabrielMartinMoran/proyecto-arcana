import { CONFIG } from '../config.js';

export class ArcanaSheet extends ActorSheet {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['arcana', 'sheet', 'actor'],
			template: 'modules/arcana/template.html',
			width: 950,
			height: 800,
			resizable: true,
			scrollY: [],
		});
	}

	/**
	 * --- RENDER ONCE ---
	 */
	async render(force, options = {}) {
		const existingIframe = this.element ? this.element.find('iframe')[0] : null;

		if (existingIframe && !options.forceReload) {
			if (this.actor) {
				this.element.find('.window-title').text(this.actor.name);

				// Actualización visual del panel Bestiario
				const hpVal = this.actor.system.health?.value ?? 0;
				const hpMax = this.actor.system.health?.max ?? 0;
				const notes = this.actor.getFlag('arcana', 'localNotes') || '';

				this.element.find("input[name='system.health.value']").val(hpVal);
				this.element.find("input[name='system.health.max']").val(hpMax);
				this.element.find("textarea[name='flags.arcana.localNotes']").val(notes);
			}
			return this;
		}
		return super.render(force, options);
	}

	/**
	 * --- LOBOTOMÍA REACTIVA ---
	 */
	async _onUpdate(changed, options, userId) {
		// Nada.
	}

	getData() {
		const data = super.getData();
		let urlWeb = this.actor.getFlag('arcana', 'sheetUrl');
		if (!urlWeb) urlWeb = CONFIG.BASE_URL;

		data.isBestiary = false;
		data.localNotes = '';
		data.health = { value: 0, max: 0 };

		if (urlWeb) {
			if (urlWeb.includes('/characters/shared/'))
				urlWeb = urlWeb.replace('/characters/shared/', '/embedded/characters/');
			const separator = urlWeb.includes('?') ? '&' : '?';

			data.health = this.actor.system.health || { value: 0, max: 0 };

			// Detectar modo Bestiario/NPC
			const isNpc = urlWeb.includes('/npc');
			if (urlWeb.includes('/bestiary/') || urlWeb.includes('/creatures/') || isNpc) {
				data.isBestiary = true;
				data.localNotes = this.actor.getFlag('arcana', 'localNotes') || '';
			}

			const targetId = this.actor.uuid || this.actor.id;

			let finalUrl = `${urlWeb}${separator}mode=foundry&uuid=${targetId}&startHp=${data.health.value}&startMax=${data.health.max}`;

			if (isNpc) {
				finalUrl += '&readonly=1';
			}

			data.iframeUrl = finalUrl;
		} else {
			data.iframeUrl = null;
		}
		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);

		// A. Inputs del Bestiario
		html.find('input, textarea').on('change', async (ev) => {
			const input = ev.currentTarget;
			const field = input.name;
			const value = input.value;
			await this.actor.update({ [field]: value });
		});

		// B. Fix del Iframe Mouse
		const iframe = html.find('iframe')[0];
		const appWindow = this.element;
		if (iframe) {
			appWindow.on('mousedown', '.window-header, .window-resizable-handle', () => {
				iframe.style.pointerEvents = 'none';
			});
			$(window).on('mouseup', () => {
				iframe.style.pointerEvents = 'auto';
			});
		}
	}

	_getHeaderButtons() {
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
	 * --- PANEL DE CONFIGURACIÓN ---
	 */
	async configureSheet() {
		const currentUrl = this.actor.getFlag('arcana', 'sheetUrl') || '';
		const isLinked = this.actor.prototypeToken.actorLink;

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
					callback: async (html) => {
						const newUrl = html.find("input[name='url']").val().trim();
						const newLinkState = html.find("input[name='actorLink']").is(':checked');

						await this.actor.setFlag('arcana', 'sheetUrl', newUrl);

						// --- CONFIGURACIÓN DE TOKEN AUTOMÁTICA ---
						const tokenSettings = {
							'prototypeToken.actorLink': newLinkState,
							'prototypeToken.displayBars': 40, // OWNER ONLY
							'prototypeToken.bar1.attribute': 'health',
							'prototypeToken.bar2.attribute': null, // Elimina barra 2
							'prototypeToken.sight.enabled': true, // <--- VISIÓN ACTIVADA POR DEFECTO
						};

						await this.actor.update(tokenSettings);

						// Actualizar tokens ya existentes en la escena
						const activeTokens = this.actor.getActiveTokens();
						for (let t of activeTokens) {
							await t.document.update({
								displayBars: 40,
								'bar1.attribute': 'health',
								'bar2.attribute': null,
								'sight.enabled': true, // <--- ACTUALIZA VISIÓN EN MAPA
							});
						}

						this.render(true, { forceReload: true });
					},
				},
			},
			default: 'save',
		}).render(true);
	}
}
