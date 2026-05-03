// src/combat/initiative-formula.ts
function buildInitiativeFormula(initMod, mode) {
  let formula = `1d8x + ${initMod}`;
  if (mode === "advantage") {
    formula += " + 1d4";
  } else if (mode === "disadvantage") {
    formula += " - 1d4";
  }
  return formula;
}
function buildInitiativeFlavor(name, mode) {
  const modeLabel = mode === "normal" ? "Normal" : mode === "advantage" ? "Ventaja" : "Desventaja";
  return `${name} tira Iniciativa (${modeLabel})`;
}

// src/combat/arcana-combat.ts
var ArcanaCombat = class extends Combat {
  /** @override */
  async rollInitiative(ids, _options = {}) {
    const combatantIds = typeof ids === "string" ? [ids] : ids;
    for (const id of combatantIds) {
      const combatant = this.combatants.get(id);
      if (!combatant) continue;
      const actor = combatant.actor;
      if (!actor) continue;
      await new Promise((resolve) => {
        new Dialog({
          title: `Tirar Iniciativa: ${combatant.name}`,
          content: `<p>Elige el tipo de tirada para <strong>${combatant.name}</strong></p>`,
          buttons: {
            normal: {
              label: "Normal",
              callback: async () => {
                await this._rollCombatantInitiative(id, "normal");
                resolve();
              }
            },
            advantage: {
              label: "Ventaja (+1d4)",
              callback: async () => {
                await this._rollCombatantInitiative(id, "advantage");
                resolve();
              }
            },
            disadvantage: {
              label: "Desventaja (-1d4)",
              callback: async () => {
                await this._rollCombatantInitiative(id, "disadvantage");
                resolve();
              }
            }
          },
          default: "normal",
          close: () => resolve()
          // Resolve if closed without choice to avoid hanging
        }).render(true);
      });
    }
    return this;
  }
  /**
   * Helper to execute the roll for a single combatant
   */
  async _rollCombatantInitiative(combatantId, mode) {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return;
    const initMod = combatant.actor?.system?.initiative ?? 0;
    const formula = buildInitiativeFormula(initMod, mode);
    const roll = await new Roll(formula, combatant.actor?.getRollData()).evaluate();
    await roll.toMessage({
      flavor: buildInitiativeFlavor(combatant.name ?? "", mode),
      speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token })
    });
    await this.setInitiative(combatantId, roll.total);
  }
};

// src/data-models/actor-data-model.ts
var CharacterData = class extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 })
      }),
      initiative: new fields.NumberField({ initial: 0 })
    };
  }
};
var NPCData = class extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 })
      }),
      initiative: new fields.NumberField({ initial: 0 })
    };
  }
};

// src/config.ts
var CONFIG2 = {
  BASE_URL: ""
};

// src/sheets/sheet-url-builder.ts
function buildSheetUrl(params) {
  const { sheetUrl, baseUrl, actor, localNotes } = params;
  let urlWeb = sheetUrl;
  if (!urlWeb) urlWeb = baseUrl;
  const result = {
    iframeUrl: null,
    isBestiary: false,
    localNotes: "",
    health: { value: 0, max: 0 }
  };
  if (urlWeb) {
    if (urlWeb.includes("/characters/shared/")) {
      urlWeb = urlWeb.replace("/characters/shared/", "/embedded/characters/");
    }
    result.health = actor.system.health || { value: 0, max: 0 };
    const isNpc = urlWeb.includes("/npc");
    if (urlWeb.includes("/bestiary/") || urlWeb.includes("/creatures/") || isNpc) {
      result.isBestiary = true;
      result.localNotes = localNotes || "";
    }
    const targetId = actor.uuid || actor.id;
    const url = new URL(urlWeb);
    url.searchParams.set("mode", "foundry");
    url.searchParams.set("uuid", targetId);
    url.searchParams.set("startHp", String(result.health.value));
    url.searchParams.set("startMax", String(result.health.max));
    if (isNpc) url.searchParams.set("readonly", "1");
    result.iframeUrl = url.toString();
  }
  return result;
}
function buildTokenSettings(isLinked, _actorName) {
  return {
    "prototypeToken.actorLink": isLinked,
    "prototypeToken.displayBars": 40,
    // OWNER ONLY
    "prototypeToken.bar1.attribute": "health",
    "prototypeToken.bar2.attribute": null,
    "prototypeToken.sight.enabled": true
  };
}

// src/sheets/arcana-sheet-v2.ts
var ActorSheetV2Base = foundry.applications.sheets.ActorSheetV2;
var MixedSheet = foundry.applications.api.HandlebarsApplicationMixin(ActorSheetV2Base);
var ArcanaSheetV2 = class _ArcanaSheetV2 extends MixedSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["arcana", "sheet", "actor"],
    tag: "form",
    actions: {
      configureSheet: _ArcanaSheetV2.#configureSheet
    },
    window: {
      title: "",
      controls: [
        {
          action: "configureSheet",
          icon: "fas fa-cogs",
          label: "Configuraci\xF3n",
          ownership: "OWNER"
        }
      ]
    },
    position: { width: 950, height: 800 }
  };
  /** @override */
  static PARTS = {
    form: {
      template: "systems/arcana/template.html"
    }
  };
  /** Stored iframe reference for preservation across renders */
  _existingIframe = null;
  /** AbortController for drag pointer event listeners */
  #dragAbortController = null;
  /** @override */
  async _preRender(context, options) {
    this._existingIframe = this.element?.querySelector("iframe") ?? null;
    await super._preRender(context, options);
  }
  /**
   * Prepare context data for the Handlebars template.
   * Replaces V1 getData().
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sheetUrl = this.actor.getFlag("arcana", "sheetUrl");
    const localNotes = this.actor.getFlag("arcana", "localNotes");
    const urlResult = buildSheetUrl({
      sheetUrl,
      baseUrl: CONFIG2.BASE_URL,
      actor: {
        uuid: this.actor.uuid,
        id: this.actor.id,
        name: this.actor.name,
        system: this.actor.system
      },
      localNotes
    });
    return {
      ...context,
      actor: this.actor,
      iframeUrl: urlResult.iframeUrl,
      isBestiary: urlResult.isBestiary,
      localNotes: urlResult.localNotes,
      health: urlResult.health
    };
  }
  /**
   * Post-render lifecycle hook.
   * Replaces V1 activateListeners().
   */
  _onRender(_context, options) {
    const element = this.element;
    if (!element) return;
    const iframe = element.querySelector("iframe");
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
  render(options) {
    const existingIframe = this.element?.querySelector(
      "iframe"
    );
    if (existingIframe && !options?.forceReload) {
      const titleEl = this.element?.querySelector(
        ".window-title"
      );
      if (titleEl) {
        titleEl.textContent = this.actor.name;
      }
      return Promise.resolve(this);
    }
    return super.render(options);
  }
  /**
   * Attach change listeners to bestiary inputs (HP, notes, etc.)
   * so user edits are persisted back to the Actor document.
   */
  #attachBestiaryListeners(element) {
    element.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("change", async (ev) => {
        const target = ev.target;
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
  #attachDragPointerEvents(element, iframe) {
    this.#dragAbortController?.abort();
    this.#dragAbortController = new AbortController();
    const { signal } = this.#dragAbortController;
    const appWindow = element.closest(".application");
    if (!iframe || !appWindow) return;
    appWindow.addEventListener(
      "mousedown",
      (ev) => {
        const target = ev.target;
        if (target.closest(".window-header, .window-resizable-handle")) {
          iframe.style.pointerEvents = "none";
        }
      },
      { signal }
    );
    window.addEventListener(
      "mouseup",
      () => {
        iframe.style.pointerEvents = "auto";
      },
      { signal }
    );
  }
  /**
   * Header controls fallback for V2.
   * Ensures the configure button is present even if window.controls merging fails.
   */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.unshift({
      action: "configureSheet",
      icon: "fas fa-cogs",
      label: "Configuraci\xF3n",
      ownership: "OWNER"
    });
    return controls;
  }
  /**
   * Action handler for the configure-sheet header button.
   */
  static async #configureSheet(_event, _target) {
    const currentUrl = this.actor.getFlag("arcana", "sheetUrl") || "";
    const isLinked = this.actor.prototypeToken.actorLink;
    new Dialog({
      title: `Configurar: ${this.actor.name}`,
      content: `
				<form>
					<div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
					<hr>
					<div class="form-group"><label>Personaje \xDAnico?</label><input type="checkbox" name="actorLink" ${isLinked ? "checked" : ""} /></div>
					<p class="notes">
						<b>Check:</b> PJ (Vida sincronizada).<br>
						<b>Uncheck:</b> NPC/Bestiario (Vida independiente).<br>
						<i>Se configurar\xE1 Barra 1, se ocultar\xE1 Barra 2 y se activar\xE1 Visi\xF3n.</i>
					</p>
				</form>`,
      buttons: {
        save: {
          label: "Guardar y Configurar",
          icon: "<i class='fas fa-save'></i>",
          callback: async (html) => {
            const newUrl = html.find("input[name='url']").val();
            const newLinkState = html.find("input[name='actorLink']").is(":checked");
            await this.actor.setFlag("arcana", "sheetUrl", newUrl.trim());
            const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);
            await this.actor.update(tokenSettings);
            const activeTokens = this.actor.getActiveTokens();
            for (const t of activeTokens) {
              await t.document.update({
                displayBars: 40,
                "bar1.attribute": "health",
                "bar2.attribute": null,
                "sight.enabled": true
              });
            }
            this.render({ force: true, forceReload: true });
          }
        }
      },
      default: "save"
    }).render(true);
  }
};

// src/sidebar/actor-directory.ts
var ActorDirectoryBase = foundry.applications.sidebar.tabs.ActorDirectory;
var ArcanaActorDirectory = class extends ActorDirectoryBase {
  static DEFAULT_OPTIONS = {
    ...ActorDirectoryBase.DEFAULT_OPTIONS,
    renderUpdateKeys: [
      "name",
      "img",
      "system.health.value",
      "system.health.max",
      "system.initiative"
    ]
  };
};

// src/hooks/init.ts
function init() {
  console.log("ARCANA SYSTEM | Inicializando...");
  CONFIG.Actor.dataModels = {
    // @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
    character: CharacterData,
    // @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
    npc: NPCData
  };
  CONFIG.Actor.trackableAttributes = {
    arcana: {
      bar: ["health"],
      value: ["initiative"]
    }
  };
  CONFIG.Combat.documentClass = ArcanaCombat;
  CONFIG.Combat.initiative = {
    formula: "1d8x + @system.initiative",
    decimals: 2
  };
  CONFIG.ui.actors = ArcanaActorDirectory;
  Actors.registerSheet("arcana", ArcanaSheetV2, {
    label: "Arcana Web",
    makeDefault: true,
    types: ["character", "npc"]
  });
}

// src/helpers/actor-urls.ts
var BASE_EMBEDDED_PATH = "embedded";
var DEVELOP_URL_PREFIX = "http://localhost:";
var URL_IDENTIFIERS = {
  CHARACTER: "characters",
  BESTIARY: "bestiary",
  NPC: "npc"
};
var isEmbeddedURLFor = (url, identifier) => {
  return url.includes(`/${BASE_EMBEDDED_PATH}/${identifier}`);
};
var isCharacter = (actor) => {
  const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
  return isEmbeddedURLFor(sheetUrl, URL_IDENTIFIERS.CHARACTER);
};
var isCharacterURL = (url) => {
  return isEmbeddedURLFor(url, URL_IDENTIFIERS.CHARACTER);
};
var isDevelopURL = (url) => {
  return url.startsWith(DEVELOP_URL_PREFIX);
};

// src/hooks/render-token-hud.ts
function renderTokenHUD(app, html) {
  const $html = $(html);
  const tokenDocument = app.object.document;
  console.log("TOKEN DOC", tokenDocument);
  console.log("IS CHARACTER", isCharacter(tokenDocument.baseActor));
  if (tokenDocument.actorLink && isCharacter(tokenDocument.baseActor)) {
    const barInputs = $html.find(".attribute.bar1 input, .attribute.bar2 input");
    if (barInputs.length > 0) {
      barInputs.prop("disabled", true);
      barInputs.css({
        opacity: "0.5",
        cursor: "not-allowed",
        "background-color": "#222",
        color: "#999",
        border: "1px solid #444"
      });
      barInputs.attr("title", "Vida gestionada por la web.");
    }
  }
}

// src/helpers.ts
function safeNum(val) {
  if (val === null || val === void 0) return 0;
  return Number(val);
}
function safeStr(val) {
  if (!val) return "";
  return String(val).trim();
}
function findActorOrTokenActor(actorId) {
  const actor = game.actors?.get(actorId);
  if (actor) return actor;
  if (canvas.scene && canvas.tokens) {
    const token = canvas.tokens.placeables.find((t) => t.actor && t.actor.id === actorId);
    if (token) return token.actor;
  }
  return void 0;
}

// src/services/actor-updater.ts
var ActorUpdater = class {
  /**
   * Handle actor update message from iframe
   */
  async handleUpdateActor(data) {
    const actor = await this.findActor(data);
    if (!actor) return;
    const updateData = this.buildUpdateData(actor, data.payload);
    if (!updateData.hasChanges) return;
    await actor.update(updateData.changes, { render: false });
    await this.updateTokens(actor, updateData.changes, data.payload);
    try {
      this.updateSheet(actor, updateData.changes);
    } catch (err) {
      console.warn("[Arcana] updateSheet failed:", err);
    }
    ui?.actors?.render();
  }
  /**
   * Find the actor by UUID or ID
   */
  async findActor(data) {
    if (data.uuid) {
      const result = await fromUuid(data.uuid);
      return result ?? void 0;
    }
    if (data.actorId) {
      return findActorOrTokenActor(data.actorId);
    }
    return void 0;
  }
  /**
   * Build update data object based on payload
   */
  buildUpdateData(actor, payload) {
    const changes = {};
    let hasChanges = false;
    const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
    const isCharacter2 = isCharacterURL(sheetUrl);
    if (payload.name) {
      const nameUpdate = this.buildNameUpdate(actor, payload.name, sheetUrl);
      if (nameUpdate) {
        Object.assign(changes, nameUpdate);
        hasChanges = true;
      }
    }
    if (payload.imageUrl) {
      const imageUpdate = this.buildImageUpdate(actor, payload.imageUrl, payload.imageSource);
      if (imageUpdate) {
        Object.assign(changes, imageUpdate);
        hasChanges = true;
      }
    }
    if (payload.hp) {
      const hpUpdate = this.buildHPUpdate(actor, payload.hp, isCharacter2);
      if (hpUpdate) {
        Object.assign(changes, hpUpdate);
        hasChanges = true;
      }
    }
    if (payload.initiative !== void 0) {
      console.log(`[Arcana] Updating initiative for ${actor.name} to ${payload.initiative}`);
      changes["system.initiative"] = payload.initiative;
      hasChanges = true;
    }
    return { changes, hasChanges };
  }
  /**
   * Build name update data
   */
  buildNameUpdate(actor, newName, sheetUrl) {
    const oldName = safeStr(actor.name);
    let processedName = safeStr(newName);
    if (isDevelopURL(sheetUrl)) {
      processedName = `[DEV] ${processedName}`;
    }
    if (processedName !== oldName) {
      const update = {
        name: processedName,
        "prototypeToken.name": processedName
      };
      if (actor.isToken) {
        update["token.name"] = processedName;
      }
      return update;
    }
    return null;
  }
  /**
   * Build image update data
   */
  buildImageUpdate(actor, imageUrl, imageSource) {
    const lastSource = actor.getFlag("arcana", "imgSource");
    const newSource = safeStr(imageSource);
    if (newSource && lastSource) {
      if (newSource !== lastSource) {
        actor.setFlag("arcana", "imgSource", newSource);
        return {
          img: imageUrl,
          "prototypeToken.texture.src": imageUrl
        };
      }
    } else {
      const oldImg = safeStr(actor.img);
      const newImg = safeStr(imageUrl);
      if (oldImg !== newImg) {
        if (newSource) {
          actor.setFlag("arcana", "imgSource", newSource);
        }
        return {
          img: newImg,
          "prototypeToken.texture.src": newImg
        };
      }
    }
    return null;
  }
  /**
   * Build HP update data
   */
  buildHPUpdate(actor, hp, isCharacter2) {
    const changes = {};
    let hasChanges = false;
    if (!isCharacter2) {
      const currentVal = safeNum(foundry.utils.getProperty(actor, "system.health.value"));
      const oldMax = safeNum(foundry.utils.getProperty(actor, "system.health.max"));
      const newMax = safeNum(hp.max);
      if (newMax !== oldMax) {
        changes["system.health.max"] = newMax;
        if (currentVal > newMax) {
          changes["system.health.value"] = newMax;
        }
        hasChanges = true;
      }
    } else {
      const oldVal = safeNum(foundry.utils.getProperty(actor, "system.health.value"));
      const oldMax = safeNum(foundry.utils.getProperty(actor, "system.health.max"));
      const newVal = safeNum(hp.value);
      const newMax = safeNum(hp.max);
      if (newVal !== oldVal) {
        changes["system.health.value"] = newVal;
        hasChanges = true;
      }
      if (newMax !== oldMax) {
        changes["system.health.max"] = newMax;
        hasChanges = true;
      }
    }
    return hasChanges ? changes : null;
  }
  /**
   * Update all active tokens for the actor
   */
  async updateTokens(actor, changes, _payload) {
    const tokensToUpdate = actor.isToken ? [actor.token] : actor.getActiveTokens();
    const tokenUpdates = {};
    let needsTokenUpdate = false;
    if (changes["img"]) {
      tokenUpdates["texture.src"] = changes["img"];
      needsTokenUpdate = true;
    }
    if (changes["name"]) {
      tokenUpdates["name"] = changes["name"];
      needsTokenUpdate = true;
    }
    for (const t of tokensToUpdate) {
      if (needsTokenUpdate) {
        await t.update(tokenUpdates);
      }
      if (_payload.hp) {
        t.object?.drawBars();
      }
    }
  }
  /**
   * Update the actor sheet UI if rendered
   */
  updateSheet(actor, changes) {
    const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
    const isCharacter2 = isCharacterURL(sheetUrl);
    if (!actor.sheet || !actor.sheet.rendered || isCharacter2) return;
    const html = actor.sheet.element;
    if (changes["system.health.max"]) {
      const maxInput = html.querySelector("input[name='system.health.max']");
      if (maxInput) maxInput.value = String(changes["system.health.max"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.max": changes["system.health.max"]
        });
      }
    }
    if (changes["system.health.value"]) {
      const valueInput = html.querySelector("input[name='system.health.value']");
      if (valueInput) valueInput.value = String(changes["system.health.value"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.value": changes["system.health.value"]
        });
      }
    }
    actor.render();
  }
};

// src/helpers/rolls-helper.ts
var INITIATIVE_ROLL_IDENTIFIER = ": Iniciativa";
var isInitiativeRoll = (rollData) => {
  return rollData.flavor ? rollData.flavor.includes(INITIATIVE_ROLL_IDENTIFIER) : false;
};

// src/services/roll-handler.ts
var RollHandler = class {
  /**
   * Process a precalculated roll and send it to chat
   */
  async handlePrecalculatedRoll(data) {
    try {
      const roll = new Roll(data.formula);
      let resultIndex = 0;
      for (const term of roll.terms) {
        if (term.constructor.name === "Die") {
          const dieCount = term.number;
          const newResults = [];
          for (let i = 0; i < dieCount; i++) {
            const value = data.results[resultIndex];
            if (value !== void 0) {
              newResults.push({
                result: value,
                active: true
              });
              resultIndex++;
            } else {
              newResults.push({
                result: Math.ceil(Math.random() * term.faces),
                active: true
              });
            }
          }
          term.results = newResults;
          term._evaluated = true;
        }
      }
      await roll.evaluate();
      await roll.toMessage({ flavor: data.flavor ?? void 0, speaker: ChatMessage.getSpeaker() });
      await this.handleInitiativeIfNeeded(data, roll);
    } catch (e) {
      console.error("Error handling precalculated roll:", e);
    }
  }
  /**
   * Set initiative in combat if the roll is an initiative roll
   */
  async handleInitiativeIfNeeded(data, roll) {
    if (!isInitiativeRoll(data)) return;
    const combat = game.combat;
    if (!combat) return;
    const speaker = ChatMessage.getSpeaker();
    let combatant = null;
    if (speaker.token) {
      combatant = combat.combatants.find((c) => c.tokenId === speaker.token);
    } else if (speaker.actor) {
      combatant = combat.combatants.find((c) => c.actorId === speaker.actor);
    }
    if (combatant) {
      await combat.setInitiative(combatant.id, roll.total);
    }
  }
};

// src/types/messages.ts
var MESSAGE_TYPES = {
  PRECALCULATED_ROLL: "PRECALCULATED_ROLL",
  UPDATE_ACTOR: "UPDATE_ACTOR"
};

// src/listeners/message-listener.ts
async function routeMessage(data, rollHandler, actorUpdater) {
  if (!data) return;
  if (data.type === MESSAGE_TYPES.PRECALCULATED_ROLL) {
    await rollHandler.handlePrecalculatedRoll(data);
    return;
  }
  if (data.type === MESSAGE_TYPES.UPDATE_ACTOR) {
    await actorUpdater.handleUpdateActor(data);
    return;
  }
}
function setupMessageListener() {
  const rollHandler = new RollHandler();
  const actorUpdater = new ActorUpdater();
  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data) return;
    console.log("[Arcana] Received message:", data.type, "from", event.origin);
    await routeMessage(data, rollHandler, actorUpdater);
  });
}

// main.ts
Hooks.once("init", init);
Hooks.on("renderTokenHUD", renderTokenHUD);
setupMessageListener();
//# sourceMappingURL=main.js.map
