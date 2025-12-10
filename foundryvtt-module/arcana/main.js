// src/config.ts
var CONFIG = {
  BASE_URL: ""
};

// src/sheets/arcana-sheet.ts
var ArcanaSheet = class extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arcana", "sheet", "actor"],
      template: "modules/arcana/template.html",
      width: 950,
      height: 800,
      resizable: true,
      scrollY: []
    });
  }
  /**
   * Render the sheet - only reload iframe when forced
   */
  async render(force, options = {}) {
    const existingIframe = this.element ? this.element.find("iframe")[0] : null;
    if (existingIframe && !options.forceReload) {
      if (this.actor) {
        this.element.find(".window-title").text(this.actor.name);
        const hpVal = this.actor.system.health?.value ?? 0;
        const hpMax = this.actor.system.health?.max ?? 0;
        const notes = this.actor.getFlag("arcana", "localNotes") || "";
        this.element.find("input[name='system.health.value']").val(hpVal);
        this.element.find("input[name='system.health.max']").val(hpMax);
        this.element.find("textarea[name='flags.arcana.localNotes']").val(notes);
      }
      return this;
    }
    return super.render(force, options);
  }
  /**
   * Disable reactive updates
   */
  async _onUpdate() {
  }
  /**
   * Prepare sheet data
   */
  getData() {
    const data = super.getData();
    let urlWeb = this.actor.getFlag("arcana", "sheetUrl");
    if (!urlWeb) urlWeb = CONFIG.BASE_URL;
    data.isBestiary = false;
    data.localNotes = "";
    data.health = { value: 0, max: 0 };
    if (urlWeb) {
      if (urlWeb.includes("/characters/shared/"))
        urlWeb = urlWeb.replace("/characters/shared/", "/embedded/characters/");
      const separator = urlWeb.includes("?") ? "&" : "?";
      data.health = this.actor.system.health || { value: 0, max: 0 };
      const isNpc = urlWeb.includes("/npc");
      if (urlWeb.includes("/bestiary/") || urlWeb.includes("/creatures/") || isNpc) {
        data.isBestiary = true;
        data.localNotes = this.actor.getFlag("arcana", "localNotes") || "";
      }
      const targetId = this.actor.uuid || this.actor.id;
      let finalUrl = `${urlWeb}${separator}mode=foundry&uuid=${targetId}&startHp=${data.health.value}&startMax=${data.health.max}`;
      if (isNpc) {
        finalUrl += "&readonly=1";
      }
      data.iframeUrl = finalUrl;
    } else {
      data.iframeUrl = null;
    }
    return data;
  }
  /**
   * Activate event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input, textarea").on("change", async (ev) => {
      const input = ev.currentTarget;
      const field = input.name;
      const value = input.value;
      await this.actor.update({ [field]: value });
    });
    const iframe = html.find("iframe")[0];
    const appWindow = this.element;
    if (iframe) {
      appWindow.on("mousedown", ".window-header, .window-resizable-handle", () => {
        iframe.style.pointerEvents = "none";
      });
      $(window).on("mouseup", () => {
        iframe.style.pointerEvents = "auto";
      });
    }
  }
  /**
   * Add configuration button to header
   */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "Configuraci\xF3n",
      class: "configure-arcana",
      icon: "fas fa-cogs",
      onclick: () => this.configureSheet()
    });
    return buttons;
  }
  /**
   * Show configuration dialog
   */
  async configureSheet() {
    const currentUrl = this.actor.getFlag("arcana", "sheetUrl") || "";
    const isLinked = this.actor.prototypeToken.actorLink;
    new Dialog({
      title: `Configurar: ${this.actor.name}`,
      content: `
        <form>
            <div class="form-group"><label>URL Web:</label><input type="text" name="url" value="${currentUrl}" style="width:100%"/></div>
            <hr>
            <div class="form-group"><label>\xBFPersonaje \xDAnico?</label><input type="checkbox" name="actorLink" ${isLinked ? "checked" : ""} /></div>
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
            const tokenSettings = {
              "prototypeToken.actorLink": newLinkState,
              "prototypeToken.displayBars": 40,
              // OWNER ONLY
              "prototypeToken.bar1.attribute": "health",
              "prototypeToken.bar2.attribute": null,
              "prototypeToken.sight.enabled": true
            };
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
            this.render(true, { forceReload: true });
          }
        }
      },
      default: "save"
    }).render(true);
  }
};

// src/hooks/init.ts
function init() {
  console.log("ARCANA SYSTEM | Inicializando...");
  Actors.registerSheet("core", ArcanaSheet, {
    label: "Arcana Web",
    makeDefault: true
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
  let actor = game.actors.get(actorId);
  if (!actor && canvas.scene) {
    const token = canvas.tokens.placeables.find((t) => t.actor && t.actor.id === actorId);
    if (token) actor = token.actor;
  }
  return actor;
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
    this.updateSheet(actor, updateData.changes);
    ui?.actors?.render();
  }
  /**
   * Find the actor by UUID or ID
   */
  async findActor(data) {
    if (data.uuid) {
      const result = await fromUuid(data.uuid);
      return result;
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
      html.find("input[name='system.health.max']").val(changes["system.health.max"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.max": changes["system.health.max"]
        });
      }
    }
    if (changes["system.health.value"]) {
      html.find("input[name='system.health.value']").val(changes["system.health.value"]);
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
        if (term instanceof Die || term.constructor.name === "Die") {
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
function setupMessageListener() {
  const rollHandler = new RollHandler();
  const actorUpdater = new ActorUpdater();
  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === MESSAGE_TYPES.PRECALCULATED_ROLL) {
      await rollHandler.handlePrecalculatedRoll(data);
    }
    if (data.type === MESSAGE_TYPES.UPDATE_ACTOR) {
      await actorUpdater.handleUpdateActor(data);
    }
  });
}

// main.ts
Hooks.once("init", init);
Hooks.on("renderTokenHUD", renderTokenHUD);
setupMessageListener();
//# sourceMappingURL=main.js.map
