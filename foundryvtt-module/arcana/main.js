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

// src/constants/status-effects.ts
var ARCANA_STATUS_EFFECTS = [
  // Estados y condiciones
  {
    id: "cansado",
    name: "Cansado",
    img: "systems/arcana/assets/statuses/battery-75.svg",
    order: 100
  },
  {
    id: "agotado",
    name: "Agotado",
    img: "systems/arcana/assets/statuses/battery-50.svg",
    order: 101
  },
  {
    id: "exhausto",
    name: "Exhausto",
    img: "systems/arcana/assets/statuses/battery-25.svg",
    order: 102
  },
  { id: "asustado", name: "Asustado", img: "icons/svg/terror.svg", order: 103 },
  { id: "aturdido", name: "Aturdido", img: "icons/svg/daze.svg", order: 104 },
  { id: "cegado", name: "Cegado", img: "icons/svg/blind.svg", order: 105 },
  { id: "derribado", name: "Derribado", img: "icons/svg/falling.svg", order: 106 },
  { id: "dormido", name: "Dormido", img: "icons/svg/sleep.svg", order: 107 },
  {
    id: "encantado",
    name: "Encantado",
    img: "systems/arcana/assets/statuses/chained-heart.svg",
    order: 108
  },
  { id: "ensordecido", name: "Ensordecido", img: "icons/svg/deaf.svg", order: 109 },
  { id: "envenenado", name: "Envenenado", img: "icons/svg/poison.svg", order: 110 },
  {
    id: "inconsciente",
    name: "Inconsciente",
    img: "icons/svg/unconscious.svg",
    order: 111
  },
  { id: "inmovilizado", name: "Inmovilizado", img: "icons/svg/net.svg", order: 112 },
  { id: "moribundo", name: "Moribundo", img: "icons/svg/skull.svg", order: 113 },
  { id: "concentracion", name: "Concentraci\xF3n", img: "icons/svg/eye.svg", order: 114 },
  // Buffs de carta (marcadores manuales, sin automatización)
  {
    id: "inspiracion-bardica",
    name: "Inspiraci\xF3n B\xE1rdica",
    img: "systems/arcana/assets/statuses/musical-notes.svg",
    order: 200
  },
  {
    id: "foco-del-escaramuzador",
    name: "Foco del Escaramuzador",
    img: "icons/svg/wingfoot.svg",
    order: 201
  },
  { id: "furia-de-batalla", name: "Furia de Batalla", img: "icons/svg/combat.svg", order: 202 },
  {
    id: "forma-del-ki-elemental",
    name: "Forma del Ki Elemental",
    img: "icons/svg/ice-aura.svg",
    order: 203
  },
  {
    id: "aspecto-de-la-bestia",
    name: "Aspecto de la Bestia",
    img: "icons/svg/pawprint.svg",
    order: 204
  },
  { id: "apoteosis-arcana", name: "Apoteosis Arcana", img: "icons/svg/angel.svg", order: 205 },
  { id: "aura-divina", name: "Aura Divina", img: "icons/svg/aura.svg", order: 206 },
  { id: "barrera-arcana", name: "Barrera Arcana", img: "icons/svg/mage-shield.svg", order: 207 },
  { id: "balsamo-natural", name: "B\xE1lsamo Natural", img: "icons/svg/heal.svg", order: 208 },
  { id: "grito-de-guerra", name: "Grito de Guerra", img: "icons/svg/sound.svg", order: 209 },
  { id: "punto-vital", name: "Punto Vital", img: "icons/svg/dice-target.svg", order: 210 },
  { id: "avatar-del-patron", name: "Avatar del Patr\xF3n", img: "icons/svg/cowled.svg", order: 211 }
];
var ARCANA_SPECIAL_STATUS_EFFECTS = {
  BLIND: "cegado",
  CONCENTRATING: "concentracion"
};
function registerArcanaStatusEffects(registry) {
  for (const effect of ARCANA_STATUS_EFFECTS) {
    registry[effect.id] = effect;
  }
}

// src/data-models/actor-data-model.ts
var CharacterData = class extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 }),
        temp: new fields.NumberField({ initial: 0, min: 0 })
      }),
      initiative: new fields.NumberField({ initial: 0 }),
      nightVision: new fields.StringField({ initial: "none" }),
      speed: new fields.NumberField({ initial: 0, min: 0 })
    };
  }
};
var NPCData = class extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 }),
        temp: new fields.NumberField({ initial: 0, min: 0 })
      }),
      initiative: new fields.NumberField({ initial: 0 }),
      nightVision: new fields.StringField({ initial: "none" }),
      speed: new fields.NumberField({ initial: 0, min: 0 })
    };
  }
};

// src/documents/arcana-actor.ts
var HEALTH_BAR_ATTRIBUTES = /* @__PURE__ */ new Set(["health", "system.health", "system.health.value"]);
function isHealthBarAttribute(attribute) {
  return HEALTH_BAR_ATTRIBUTES.has(attribute);
}
function applyTemporaryHpAbsorption(health, damage) {
  const currentTemp = Math.max(0, health.temp);
  const currentValue = Math.max(0, health.value);
  const incomingDamage = Math.max(0, damage);
  const absorbed = Math.min(currentTemp, incomingDamage);
  return {
    value: Math.max(0, currentValue - (incomingDamage - absorbed)),
    temp: currentTemp - absorbed
  };
}
var FATIGUE_STATUS_IDS = ["cansado", "agotado", "exhausto"];
var FOCUS_CONCENTRATION_STATUS_IDS = [
  "concentracion",
  "foco-del-escaramuzador"
];
var EXCLUSIVE_STATUS_GROUPS = [
  FATIGUE_STATUS_IDS,
  FOCUS_CONCENTRATION_STATUS_IDS
];
function getExclusiveSiblingStatusIds(statusId) {
  const group = EXCLUSIVE_STATUS_GROUPS.find((ids) => ids.includes(statusId));
  return group?.filter((id) => id !== statusId) ?? [];
}
function willActivateStatus(activeStatusIds, statusId, active) {
  if (active === true) return true;
  if (active === void 0) return !activeStatusIds.has(statusId);
  return false;
}
var ArcanaActor = class extends Actor {
  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (!isDelta || !isBar || value >= 0 || !isHealthBarAttribute(attribute)) {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    const health = this.system.health;
    if (!health) return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    const currentValue = Number(health.value);
    const currentTemp = Math.max(0, Number(health.temp ?? 0));
    const result = applyTemporaryHpAbsorption({ value: currentValue, temp: currentTemp }, -value);
    const updates = {};
    if (result.temp !== currentTemp) updates["system.health.temp"] = result.temp;
    if (result.value !== currentValue) updates["system.health.value"] = result.value;
    if (Object.keys(updates).length === 0) return this;
    return this.update(updates);
  }
  /**
   * Enforce Arcana's mutually exclusive statuses when toggled from the HUD.
   *
   * Activating a fatigue grade deactivates the other grades, and activating
   * Focus or Concentration deactivates the other one ("last click wins").
   * Deactivations and statuses outside the exclusive groups delegate to the
   * core implementation untouched.
   *
   * @override
   */
  async toggleStatusEffect(statusId, options = {}) {
    if (!willActivateStatus(this.statuses, statusId, options.active)) {
      return super.toggleStatusEffect(statusId, options);
    }
    const siblingStatusIds = getExclusiveSiblingStatusIds(statusId);
    if (siblingStatusIds.length === 0) return super.toggleStatusEffect(statusId, options);
    const result = await super.toggleStatusEffect(statusId, options);
    for (const siblingStatusId of siblingStatusIds) {
      if (this.statuses.has(siblingStatusId)) {
        await super.toggleStatusEffect(siblingStatusId, { active: false });
      }
    }
    return result;
  }
};

// src/documents/arcana-token.ts
var TEMP_HP_COLOR = 6737151;
var TEMP_HP_ALPHA = 0.85;
var CORE_BAR_HEIGHT = 8;
var LARGE_TOKEN_BAR_FACTOR = 1.5;
function computeTemporaryHpOverlay(input) {
  const max = toPositiveNumber(input.max);
  const temp = toPositiveNumber(input.temp);
  const barWidth = toPositiveNumber(input.barWidth);
  const barHeight = toPositiveNumber(input.barHeight);
  if (max === null || temp === null || barWidth === null || barHeight === null) return null;
  const inset = toNonNegativeNumber(input.uiScale);
  const width = Math.min(temp, max) / max * barWidth - 2 * inset;
  const height = barHeight - 2 * inset;
  if (width <= 0 || height <= 0) return null;
  return {
    x: inset,
    y: inset,
    width,
    height,
    radius: Math.min(2 * inset, width / 2, height / 2)
  };
}
function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
var FULL_BAR_ANIMATION_MS = 1500;
function computeTempAnimationDuration(fromTemp, toTemp, max) {
  if (!Number.isFinite(fromTemp) || !Number.isFinite(toTemp) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return FULL_BAR_ANIMATION_MS * Math.abs(toTemp - fromTemp) / max;
}
function readActorTemporaryHp(actor) {
  const temp = Number(actor?.system?.health?.temp);
  return Number.isFinite(temp) ? temp : null;
}
function bar1TracksHealth(attribute) {
  return typeof attribute === "string" && isHealthBarAttribute(attribute);
}
function resolveTemporaryHp(data, actor) {
  const animatedTemp = data.temp;
  if (typeof animatedTemp === "number" && Number.isFinite(animatedTemp)) return animatedTemp;
  return readActorTemporaryHp(actor) ?? 0;
}
function drawTemporaryHpOverlay(bar, tokenDocument, max, temp) {
  const scale = canvas.dimensions?.uiScale ?? 1;
  const overlay = computeTemporaryHpOverlay({
    max,
    temp,
    barWidth: tokenDocument.getSize().width,
    barHeight: CORE_BAR_HEIGHT * (tokenDocument.height >= 2 ? LARGE_TOKEN_BAR_FACTOR : 1) * scale,
    uiScale: scale
  });
  if (!overlay) return;
  bar.beginFill(TEMP_HP_COLOR, TEMP_HP_ALPHA).lineStyle(0).drawRoundedRect(overlay.x, overlay.y, overlay.width, overlay.height, overlay.radius).endFill();
}
var ArcanaToken = class extends foundry.canvas.placeables.Token {
  /** @override */
  _getAnimationData() {
    const data = super._getAnimationData();
    const temp = readActorTemporaryHp(this.actor);
    if (temp !== null && bar1TracksHealth(this.document.bar1?.attribute) && data.bar1) {
      data.bar1.temp = temp;
    }
    return data;
  }
  /**
   * @override
   * The core only measures `value`/`max`, so a temporary-HP-only change would
   * otherwise animate with duration 0 (an instant jump).
   */
  _getAnimationDuration(from, to, options) {
    const coreDuration = super._getAnimationDuration(from, to, options);
    const fromBar = from.bar1;
    const toBar = to.bar1;
    const tempDuration = computeTempAnimationDuration(
      Number(fromBar?.temp),
      Number(toBar?.temp),
      Number(toBar?.max ?? fromBar?.max)
    );
    return Math.max(coreDuration, tempDuration);
  }
  /** @override */
  _drawBar(index, bar, data) {
    const result = super._drawBar(index, bar, data);
    if (index === 0 && isHealthBarAttribute(data.attribute) && "max" in data) {
      drawTemporaryHpOverlay(bar, this.document, data.max, resolveTemporaryHp(data, this.actor));
    }
    return result;
  }
};

// src/documents/arcana-token-document.ts
var TEMPORARY_HP_PATH = "system.health.temp";
function animateTemporaryHp(tokenDocument) {
  const temp = Number(tokenDocument.actor?.system?.health?.temp);
  if (!Number.isFinite(temp)) return;
  const object = tokenDocument.object;
  if (typeof object?.animate !== "function") return;
  object.animate(
    { bar1: { temp } },
    {
      name: `${object.objectId}.animateBars`,
      easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine
    }
  );
}
var ArcanaTokenDocument = class extends foundry.documents.TokenDocument {
  /** @override */
  _onRelatedUpdate(update = {}, operation) {
    super._onRelatedUpdate(update, operation);
    const updates = Array.isArray(update) ? update : [update];
    if (!updates.some((entry) => foundry.utils.hasProperty(entry, TEMPORARY_HP_PATH))) return;
    this.object?.renderFlags.set({ refreshBars: true });
    animateTemporaryHp(this);
  }
};

// src/ruler/movement-bands.ts
function movementBandForDistance({
  speed,
  effectiveDistance
}) {
  if (!isValidSpeed(speed)) return "default";
  if (effectiveDistance <= speed) return "green";
  if (effectiveDistance <= speed * 2) return "yellow";
  return "red";
}
function isValidSpeed(speed) {
  return typeof speed === "number" && Number.isFinite(speed) && speed > 0;
}

// src/ruler/turn-movement-tracker.ts
var TurnMovementTracker = class {
  movementByTurn = /* @__PURE__ */ new Map();
  recordMovement({ combatId, turnKey, tokenId, meters }) {
    if (!Number.isFinite(meters) || meters <= 0) return;
    const key = this.keyFor({ combatId, turnKey, tokenId });
    this.movementByTurn.set(key, this.getAlreadyMoved({ combatId, turnKey, tokenId }) + meters);
  }
  getAlreadyMoved(input) {
    return this.movementByTurn.get(this.keyFor(input)) ?? 0;
  }
  keyFor({ combatId, turnKey, tokenId }) {
    return `${combatId}:${turnKey}:${tokenId}`;
  }
};
var turnMovementTracker = new TurnMovementTracker();

// src/ruler/arcana-token-ruler.ts
var BAND_COLORS = {
  green: 65280,
  yellow: 16776960,
  red: 16711680
};
var DefaultTokenRuler = getDefaultTokenRuler();
var ArcanaTokenRuler = class extends DefaultTokenRuler {
  lastMeasuredDistance = 0;
  _getSegmentStyle(waypoint) {
    const defaultStyle = getDefaultSegmentStyle(this, waypoint);
    const speed = getActorSpeed(this);
    const plannedDistance = getWaypointDistance(waypoint);
    const band = movementBandForDistance({
      speed,
      effectiveDistance: getAlreadyMoved(this) + plannedDistance
    });
    this.lastMeasuredDistance = Math.max(this.lastMeasuredDistance, plannedDistance);
    if (band === "default") return defaultStyle;
    return { ...defaultStyle, color: BAND_COLORS[band] };
  }
  async _endMeasurement(...args) {
    const result = await callBaseMethod(this, "_endMeasurement", args);
    this.recordLastMovement();
    return result;
  }
  async moveToken(...args) {
    const result = await callBaseMethod(this, "moveToken", args);
    this.recordLastMovement();
    return result;
  }
  recordLastMovement() {
    const turnKey = getTurnKey();
    const tokenId = getTokenId(this);
    const combatId = getCombatId();
    if (!turnKey || !tokenId || !combatId) return;
    turnMovementTracker.recordMovement({
      combatId,
      turnKey,
      tokenId,
      meters: this.lastMeasuredDistance
    });
    this.lastMeasuredDistance = 0;
  }
};
function getDefaultTokenRuler() {
  return CONFIG?.Token?.rulerClass ?? class {
  };
}
function getDefaultSegmentStyle(ruler, waypoint) {
  const method = getBasePrototype()?._getSegmentStyle;
  if (typeof method !== "function") return {};
  return method.call(ruler, waypoint) ?? {};
}
function callBaseMethod(ruler, methodName, args) {
  const method = getBasePrototype()?.[methodName];
  if (typeof method !== "function") return void 0;
  return method.apply(ruler, args);
}
function getBasePrototype() {
  return Object.getPrototypeOf(ArcanaTokenRuler.prototype);
}
function getActorSpeed(ruler) {
  return foundry.utils.getProperty(ruler.token?.actor, "system.speed");
}
function getWaypointDistance(waypoint) {
  const distance = waypoint.measurement?.distance ?? waypoint.distance ?? 0;
  return Number.isFinite(distance) ? distance : 0;
}
function getAlreadyMoved(ruler) {
  const foundryManagedDistance = getFoundryManagedMovement(ruler);
  if (foundryManagedDistance !== void 0) return foundryManagedDistance;
  const turnKey = getTurnKey();
  const tokenId = getTokenId(ruler);
  const combatId = getCombatId();
  if (!turnKey || !tokenId || !combatId) return 0;
  return turnMovementTracker.getAlreadyMoved({ combatId, turnKey, tokenId });
}
function getFoundryManagedMovement(ruler) {
  const token = ruler.token;
  const distance = token?.document?.movement?.distance ?? token?.document?.movementDistance;
  return typeof distance === "number" && Number.isFinite(distance) ? distance : void 0;
}
function getTokenId(ruler) {
  const token = ruler.token;
  return token?.document?.id ?? token?.id;
}
function getCombatId() {
  return globalThis.game?.combat?.id;
}
function getTurnKey() {
  const combat = globalThis.game?.combat;
  if (!combat) return void 0;
  return `${combat.round ?? 0}:${combat.turn ?? 0}:${combat.current?.tokenId ?? ""}`;
}

// src/config.ts
var CONFIG2 = {
  BASE_URL: ""
};

// src/constants/creature-sizes.ts
var CREATURE_SIZES = [
  { id: "diminuto", label: "Diminuto", width: 0.5, height: 0.5 },
  { id: "pequeno", label: "Peque\xF1o", width: 1, height: 1 },
  { id: "mediano", label: "Mediano", width: 1, height: 1 },
  { id: "grande", label: "Grande", width: 2, height: 2 },
  { id: "inmenso", label: "Inmenso 3\xD73 (est\xE1ndar)", width: 3, height: 3 },
  { id: "inmenso-4", label: "Inmenso 4\xD74 (mayor)", width: 4, height: 4 },
  { id: "inmenso-5", label: "Inmenso 5\xD75 (colosal)", width: 5, height: 5 }
];
var CREATURE_SIZE_CATEGORIES = [
  { id: "diminuto", label: "Diminuto" },
  { id: "pequeno", label: "Peque\xF1o" },
  { id: "mediano", label: "Mediano" },
  { id: "grande", label: "Grande" },
  { id: "inmenso", label: "Inmenso" }
];
var CATEGORY_BY_SIZE_ID = {
  diminuto: "diminuto",
  pequeno: "pequeno",
  mediano: "mediano",
  grande: "grande",
  inmenso: "inmenso",
  "inmenso-4": "inmenso",
  "inmenso-5": "inmenso"
};
var CREATURE_SIZE_BY_ID = Object.fromEntries(
  CREATURE_SIZES.map((size) => [size.id, size])
);
var LARGE_SIZE_VARIANTS = CREATURE_SIZES.filter(
  (size) => CATEGORY_BY_SIZE_ID[size.id] === "inmenso"
);
function isCreatureSizeId(value) {
  return typeof value === "string" && Object.hasOwn(CREATURE_SIZE_BY_ID, value);
}
function resolveCreatureSize(value) {
  return isCreatureSizeId(value) ? CREATURE_SIZE_BY_ID[value] : null;
}
function getCreatureSizeCategoryId(id) {
  return CATEGORY_BY_SIZE_ID[id];
}
function buildCreatureSizeId(category, largeFootprint) {
  if (category !== "inmenso") return category;
  return LARGE_SIZE_VARIANTS.find((size) => size.width === largeFootprint)?.id ?? "inmenso";
}
function inferCreatureSize(width, height) {
  if (typeof width !== "number" || typeof height !== "number") return null;
  const matches = CREATURE_SIZES.filter((size) => size.width === width && size.height === height);
  return matches.length === 1 ? matches[0] : null;
}

// src/constants/token-colors.ts
var TOKEN_COLORS = [
  { id: "black", label: "Negro", hex: "#000000" },
  { id: "red", label: "Rojo", hex: "#990000" },
  { id: "green", label: "Verde", hex: "#27a241" },
  { id: "yellow", label: "Amarillo", hex: "#e6b800" },
  { id: "orange", label: "Naranja", hex: "#d35400" },
  { id: "gray", label: "Gris", hex: "#9aa0a6" },
  { id: "lightblue", label: "Celeste", hex: "#2b89fb" },
  { id: "purple", label: "P\xFArpura", hex: "#7800ff" }
];
var DEFAULT_CHARACTER_TOKEN_COLOR_ID = "black";
var DEFAULT_NPC_TOKEN_COLOR_ID = "red";
var LEGACY_TOKEN_COLOR_ALIASES = {
  silver: "gray"
};
var TOKEN_COLOR_BY_ID = Object.fromEntries(
  TOKEN_COLORS.map((color) => [color.id, color])
);
function isTokenColorId(value) {
  return typeof value === "string" && Object.hasOwn(TOKEN_COLOR_BY_ID, value);
}
function getTokenColorHex(id) {
  return TOKEN_COLOR_BY_ID[id].hex;
}
function getDefaultTokenColorId(isNpc) {
  return isNpc ? DEFAULT_NPC_TOKEN_COLOR_ID : DEFAULT_CHARACTER_TOKEN_COLOR_ID;
}
function resolveDefaultTokenColorId(actorType, isBestiary) {
  if (actorType === "npc") return DEFAULT_NPC_TOKEN_COLOR_ID;
  if (actorType === "character") return DEFAULT_CHARACTER_TOKEN_COLOR_ID;
  return getDefaultTokenColorId(isBestiary);
}
function resolveTokenColorId(value, fallbackId) {
  if (isTokenColorId(value)) return value;
  if (typeof value === "string") {
    const legacyId = LEGACY_TOKEN_COLOR_ALIASES[value];
    if (legacyId) return legacyId;
  }
  return fallbackId;
}
function resolveTokenColorHex(value, fallbackId) {
  return getTokenColorHex(resolveTokenColorId(value, fallbackId));
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
var isSharedCharacterURL = (url) => {
  return url.includes("/characters/shared/");
};
var isCharacter = (actor) => {
  const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
  return isCharacterURL(sheetUrl);
};
var isCharacterURL = (url) => {
  return isEmbeddedURLFor(url, URL_IDENTIFIERS.CHARACTER) || isSharedCharacterURL(url);
};
var isDevelopURL = (url) => {
  return url.startsWith(DEVELOP_URL_PREFIX);
};

// src/helpers/night-vision.ts
var NIGHT_VISION_LABELS = {
  none: "Ninguna",
  immediate: "Inmediata",
  close: "Cercana",
  medium: "Media",
  long: "Larga",
  unlimited: "Ilimitada"
};
function getNightVisionSightSettings(category) {
  switch (category) {
    case "none":
      return { visionMode: "basic", range: 0 };
    case "immediate":
      return { visionMode: "darkvision", range: 1 };
    case "close":
      return { visionMode: "darkvision", range: 10 };
    case "medium":
      return { visionMode: "darkvision", range: 50 };
    case "long":
      return { visionMode: "darkvision", range: 100 };
    case "unlimited":
      return { visionMode: "darkvision", range: null };
    default:
      return { visionMode: "basic", range: 0 };
  }
}
function getNightVisionSightUpdate(category) {
  const { visionMode, range } = getNightVisionSightSettings(category);
  const defaults = globalThis.CONFIG?.Canvas?.visionModes?.[visionMode]?.vision?.defaults;
  const base = {
    "sight.visionMode": visionMode,
    "sight.range": range
  };
  if (!defaults) {
    return base;
  }
  return {
    ...base,
    ...defaults.saturation !== void 0 ? { "sight.saturation": defaults.saturation } : {},
    ...defaults.brightness !== void 0 ? { "sight.brightness": defaults.brightness } : {},
    ...defaults.contrast !== void 0 ? { "sight.contrast": defaults.contrast } : {},
    ...defaults.attenuation !== void 0 ? { "sight.attenuation": defaults.attenuation } : {},
    ...defaults.color !== void 0 ? { "sight.color": defaults.color } : {}
  };
}

// src/services/npc-ability-usage.ts
var USAGE_FLAG = "npcAbilityUsage";
var GROUPS = [
  { source: "actions", label: "Acciones" },
  { source: "reactions", label: "Reacciones" },
  { source: "interactions", label: "Interacciones" },
  { source: "traits", label: "Rasgos defensivos" }
];
function resolveNpcAbilityUsageOwner(actor) {
  const tokenDocument = actor.token;
  const isLinkedToken = Boolean(tokenDocument?.actorLink || actor.prototypeToken?.actorLink);
  if (actor.isToken && !isLinkedToken && hasFlagApi(tokenDocument)) {
    return tokenDocument;
  }
  return actor.baseActor ?? actor;
}
function mergeNpcAbilityUsage(definitions, existing) {
  return Object.fromEntries(
    definitions.map((definition) => {
      const current = clampNpcAbilityCurrent(
        existing?.[definition.id]?.current ?? definition.max,
        definition.max
      );
      return [definition.id, { current, max: definition.max }];
    })
  );
}
function buildNpcAbilityUsageGroups(definitions = [], usage = {}) {
  const views = definitions.map((definition) => {
    const counter = usage[definition.id] ?? { current: definition.max, max: definition.max };
    return {
      ...definition,
      current: clampNpcAbilityCurrent(counter.current, definition.max),
      max: definition.max,
      isRecharge: definition.type === "RELOAD"
    };
  }).sort((a, b) => a.order - b.order);
  return GROUPS.map((group) => ({
    ...group,
    abilities: views.filter((ability) => ability.source === group.source)
  })).filter((group) => group.abilities.length > 0);
}
function clampNpcAbilityCurrent(value, max) {
  const numericValue = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(numericValue, 0), max);
}
async function updateNpcAbilityCurrent(actor, abilityId, current, definitions) {
  const owner = resolveNpcAbilityUsageOwner(actor);
  const usage = mergeNpcAbilityUsage(definitions, readUsage(owner));
  const definition = definitions.find((ability) => ability.id === abilityId);
  if (!definition) return usage;
  usage[abilityId] = {
    current: clampNpcAbilityCurrent(current, definition.max),
    max: definition.max
  };
  await owner.setFlag("arcana", USAGE_FLAG, usage);
  return usage;
}
async function rollNpcAbilityRecharge(actor, abilityId, definitions) {
  const definition = definitions.find((ability) => ability.id === abilityId);
  if (!definition || definition.type !== "RELOAD" || !definition.rechargeTarget) {
    throw new Error(`NPC recharge ability not found: ${abilityId}`);
  }
  const roll = await rollOneD8();
  const result = Number(roll.total ?? 0);
  const success = result >= definition.rechargeTarget;
  const usage = await updateNpcAbilityCurrent(
    actor,
    abilityId,
    success ? definition.max : 0,
    definitions
  );
  await sendRechargeRollMessage(actor, definition, roll, success);
  return { result, success, usage };
}
function readUsage(owner) {
  const value = owner.getFlag("arcana", USAGE_FLAG);
  return isUsageRecord(value) ? value : void 0;
}
async function rollOneD8() {
  const roll = new Roll("1d8");
  await roll.evaluate();
  return roll;
}
async function sendRechargeRollMessage(actor, definition, roll, success) {
  await roll.toMessage({
    flavor: `${definition.name}: recarga \u2014 ${success ? "\xE9xito" : "fallo"}`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}
function hasFlagApi(value) {
  return Boolean(
    value && typeof value.getFlag === "function" && typeof value.setFlag === "function"
  );
}
function isUsageRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

// src/types/messages.ts
var MESSAGE_TYPES = {
  PRECALCULATED_ROLL: "PRECALCULATED_ROLL",
  UPDATE_ACTOR: "UPDATE_ACTOR",
  FOUNDRY_HEALTH_UPDATE: "FOUNDRY_HEALTH_UPDATE",
  FOUNDRY_TOKEN_COLOR_UPDATE: "FOUNDRY_TOKEN_COLOR_UPDATE"
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
    health: { value: 0, max: 0, temp: 0 }
  };
  if (urlWeb) {
    if (urlWeb.includes("/characters/shared/")) {
      urlWeb = urlWeb.replace("/characters/shared/", "/embedded/characters/");
    }
    const health = actor.system.health;
    result.health = {
      value: health?.value ?? 0,
      max: health?.max ?? 0,
      temp: health?.temp ?? 0
    };
    const isNpc = urlWeb.includes("/npc");
    if (urlWeb.includes("/bestiary/") || urlWeb.includes("/creatures/") || isNpc) {
      result.isBestiary = true;
      result.localNotes = localNotes || "";
    }
    const targetId = actor.uuid || actor.id;
    const defaultColorId = resolveDefaultTokenColorId(actor.type, result.isBestiary);
    const url = new URL(urlWeb);
    url.searchParams.set("mode", "foundry");
    url.searchParams.set("uuid", targetId);
    url.searchParams.set("startHp", String(result.health.value));
    url.searchParams.set("startMax", String(result.health.max));
    url.searchParams.set("startTemp", String(result.health.temp));
    url.searchParams.set(
      "borderColor",
      resolveTokenColorHex(params.tokenBorderColor, defaultColorId)
    );
    if (isNpc) url.searchParams.set("readonly", "1");
    if (params.tokenOffsetX !== void 0)
      url.searchParams.set("tokenOffsetX", String(params.tokenOffsetX));
    if (params.tokenOffsetY !== void 0)
      url.searchParams.set("tokenOffsetY", String(params.tokenOffsetY));
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
var DEFAULT_SHEET_POSITION = { width: 950, height: 800 };
var REATTACH_BUTTON_CLASS = "arcana-detach-return";
var REATTACH_BUTTON_LABEL = "Volver a Foundry";
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
      resizable: true,
      controls: [
        {
          action: "configureSheet",
          icon: "fas fa-cogs",
          label: "Configuraci\xF3n",
          ownership: "OWNER"
        }
      ]
    },
    position: DEFAULT_SHEET_POSITION
  };
  /** @override */
  static PARTS = {
    form: {
      template: "systems/arcana/template.html"
    }
  };
  /** @override */
  // @ts-expect-error title getter exists at runtime in DocumentSheetV2 but types are incomplete
  get title() {
    return this.actor.name;
  }
  /** Stored iframe reference for preservation across renders */
  _existingIframe = null;
  /** AbortController for drag pointer event listeners */
  #dragAbortController = null;
  /** Floating re-attach control, present only while the sheet is detached. */
  #reattachButton = null;
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
    const tokenOffsetX = this.actor.getFlag("arcana", "tokenOffsetX") ?? 0;
    const tokenOffsetY = this.actor.getFlag("arcana", "tokenOffsetY") ?? 0;
    const tokenBorderColor = this.actor.getFlag("arcana", "tokenBorderColor");
    const urlResult = buildSheetUrl({
      sheetUrl,
      baseUrl: CONFIG2.BASE_URL,
      actor: {
        uuid: this.actor.uuid,
        id: this.actor.id,
        name: this.actor.name,
        type: this.actor.type,
        system: this.actor.system
      },
      localNotes,
      tokenBorderColor,
      tokenOffsetX,
      tokenOffsetY
    });
    const npcAbilityGroups = urlResult.isBestiary ? this.#getNpcAbilityGroups() : [];
    return {
      ...context,
      actor: this.actor,
      iframeUrl: urlResult.iframeUrl,
      isBestiary: urlResult.isBestiary,
      localNotes: urlResult.localNotes,
      health: urlResult.health,
      npcAbilityGroups,
      hasNpcAbilityUsage: npcAbilityGroups.length > 0
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
  render(options) {
    const element = this.element;
    const existingIframe = element?.querySelector("iframe");
    const isWindowTransition = options?.window !== void 0;
    if (existingIframe && !options?.forceReload && !isWindowTransition) {
      if (element) {
        this.#refreshNpcAbilityControls(element);
        this.#refreshHealthInputs(element);
      }
      const titleEl = element?.querySelector(".window-title");
      if (titleEl) {
        titleEl.textContent = this.actor.name;
      }
      this.bringToFront?.();
      this.#postHealthToIframe(existingIframe);
      return Promise.resolve(this);
    }
    return super.render(options);
  }
  /**
   * Re-wire host-document bindings after Foundry moves the application into a
   * detached browser window. The DOM now belongs to the detached document, so
   * pointer events must be tracked on its window instead of the main workspace.
   * The detached document also receives the actor name as OS window title and
   * the floating control that brings the sheet back.
   */
  _onDetach(_from, _to) {
    super._onDetach?.(_from, _to);
    this.#rewireHostWindowBindings();
    _to.title = this.title;
    this.#addReattachButton(_to);
  }
  /**
   * Re-wire host-document bindings after the application returns to the main
   * workspace window, dropping the detached-only re-attach control.
   */
  _onAttach(_from, _to) {
    super._onAttach?.(_from, _to);
    this.#removeReattachButton();
    this.#rewireHostWindowBindings();
  }
  /**
   * Add the floating control that re-attaches the sheet. Nodes are created
   * with the detached document, and any previous control is replaced so the
   * lifecycle stays idempotent.
   */
  #addReattachButton(detachedDocument) {
    const element = this.element;
    if (!element) return;
    this.#removeReattachButton();
    const button = detachedDocument.createElement("button");
    button.type = "button";
    button.className = REATTACH_BUTTON_CLASS;
    button.title = REATTACH_BUTTON_LABEL;
    button.setAttribute("aria-label", REATTACH_BUTTON_LABEL);
    const icon = detachedDocument.createElement("i");
    icon.className = "fas fa-thumbtack";
    button.append(icon);
    button.addEventListener("click", () => this.#reattachWindow());
    element.append(button);
    this.#reattachButton = button;
  }
  #removeReattachButton() {
    this.#reattachButton?.remove();
    this.#reattachButton = null;
  }
  #reattachWindow() {
    const application = this;
    application.attachWindow?.();
  }
  #rewireHostWindowBindings() {
    const element = this.element;
    if (!element) return;
    const iframe = element.querySelector("iframe");
    this.#attachDragPointerEvents(element, iframe);
    const titleEl = element.querySelector(".window-title");
    if (titleEl) {
      titleEl.textContent = this.actor.name;
    }
    if (iframe) {
      this.#postHealthToIframe(iframe);
    }
  }
  /**
   * Override close to reset position so the sheet opens at default size next time.
   * In V14 the sheet instance is cached, so without this the last resized dimensions persist.
   */
  // @ts-expect-error close may not be typed in this Foundry version
  async close(options) {
    this.position.width = DEFAULT_SHEET_POSITION.width;
    this.position.height = DEFAULT_SHEET_POSITION.height;
    return super.close(options);
  }
  /**
   * Attach change listeners to bestiary inputs (HP, notes, etc.)
   * so user edits are persisted back to the Actor document.
   */
  #attachBestiaryListeners(element) {
    element.querySelectorAll("input, textarea").forEach((input) => {
      if (input.dataset.npcAbilityControl) return;
      input.addEventListener("change", async (ev) => {
        const target = ev.target;
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
  #normalizeBestiaryFieldValue(field, value) {
    if (field !== "system.health.temp") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  /**
   * Keep the interactive bestiary health inputs in sync with the actor data
   * when a cached iframe prevents a full sheet re-render (for example after
   * damage applied from the Token HUD).
   */
  #refreshHealthInputs(element) {
    const health = this.actor.system.health;
    if (!health) return;
    const fields = [
      ["system.health.value", health.value],
      ["system.health.max", health.max],
      ["system.health.temp", health.temp ?? 0]
    ];
    for (const [name, value] of fields) {
      const input = element.querySelector(`input[name='${name}']`);
      if (input) input.value = String(value);
    }
  }
  #attachNpcAbilityListeners(element) {
    element.querySelectorAll("[data-npc-ability-control]").forEach((control) => {
      control.addEventListener("change", async (event) => {
        const target = event.target;
        const abilityId = target.dataset.abilityId;
        if (!abilityId) return;
        await this.#setNpcAbilityCurrent(abilityId, Number(target.value));
      });
    });
    element.querySelectorAll("[data-npc-ability-action]").forEach((control) => {
      control.addEventListener("click", async () => {
        const abilityId = control.dataset.abilityId;
        if (!abilityId) return;
        if (control.dataset.npcAbilityAction === "use") {
          const current = this.#getCurrentAbilityValue(abilityId) - 1;
          await this.#setNpcAbilityCurrent(abilityId, current);
        }
        if (control.dataset.npcAbilityAction === "recharge") {
          await rollNpcAbilityRecharge(this.#actor(), abilityId, this.#getNpcAbilityDefinitions());
          this.#refreshNpcAbilityControls(this.element);
        }
      });
    });
  }
  async #setNpcAbilityCurrent(abilityId, current) {
    const usage = await updateNpcAbilityCurrent(
      this.#actor(),
      abilityId,
      current,
      this.#getNpcAbilityDefinitions()
    );
    const counter = usage[abilityId];
    if (!counter) return;
    this.#updateNpcAbilityDisplay(abilityId, counter.current, counter.max);
  }
  #getCurrentAbilityValue(abilityId) {
    const usage = readUsage(resolveNpcAbilityUsageOwner(this.#actor()));
    return usage?.[abilityId]?.current ?? 0;
  }
  #getNpcAbilityDefinitions() {
    const definitions = this.#actor().getFlag("arcana", "npcAbilityDefinitions");
    return Array.isArray(definitions) ? definitions : [];
  }
  #getNpcAbilityGroups() {
    return buildNpcAbilityUsageGroups(
      this.#getNpcAbilityDefinitions(),
      readUsage(resolveNpcAbilityUsageOwner(this.#actor())) ?? {}
    );
  }
  #actor() {
    return this.actor;
  }
  #refreshNpcAbilityControls(element) {
    const groups = this.#getNpcAbilityGroups();
    const existing = element.querySelector(".npc-ability-usage-section");
    if (groups.length === 0) {
      existing?.remove();
      return;
    }
    const html = this.#renderNpcAbilitySection(groups);
    if (existing) {
      existing.outerHTML = html;
    } else {
      element.querySelector(".bestiary-controls")?.insertAdjacentHTML("beforeend", html);
    }
    this.#attachNpcAbilityListeners(element);
  }
  #renderNpcAbilitySection(groups) {
    const groupsHtml = groups.map((group) => this.#renderNpcAbilityGroup(group)).join("");
    return `<div class="npc-ability-usage-section npc-ability-usage-compact" style="margin-top: 6px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px">${groupsHtml}</div>`;
  }
  #renderNpcAbilityGroup(group) {
    const abilitiesHtml = group.abilities.map(
      (ability) => `
					<div class="npc-ability-row npc-ability-row-compact" data-ability-id="${escapeHtml(ability.id)}" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px">
						<span class="npc-ability-name" style="flex: 1 1 140px">${escapeHtml(ability.name)}</span>
						<div class="npc-ability-controls-inline" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px">
							<button type="button" data-npc-ability-action="use" data-ability-id="${escapeHtml(ability.id)}">Usar</button>
							<input type="number" data-npc-ability-control="current" data-ability-id="${escapeHtml(ability.id)}" value="${ability.current}" min="0" max="${ability.max}" style="width: 44px; text-align: center" />
							<span style="font-size: 1.1rem" data-ability-display="${escapeHtml(ability.id)}">/${ability.max}</span>
							${ability.isRecharge ? `<button type="button" data-npc-ability-action="recharge" data-ability-id="${escapeHtml(ability.id)}">Recarga</button>` : ""}
						</div>
					</div>`
    ).join("");
    return `<section style="flex: 1 1 calc((100% - 16px) / 3); min-width: 220px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between" class="npc-ability-group npc-ability-group-compact" data-npc-ability-group="${group.source}"><h4 style="margin: 2px 0; font-size: 1rem">${group.label}</h4>${abilitiesHtml}</section>`;
  }
  #updateNpcAbilityDisplay(abilityId, current, max) {
    const element = this.element;
    const escapedId = cssEscape(abilityId);
    const input = element?.querySelector(
      `[data-npc-ability-control][data-ability-id="${escapedId}"]`
    );
    const display = element?.querySelector(`[data-ability-display="${escapedId}"]`);
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
  #attachDragPointerEvents(element, iframe) {
    this.#dragAbortController?.abort();
    this.#dragAbortController = new AbortController();
    const { signal } = this.#dragAbortController;
    const appWindow = element.closest(".application");
    if (!iframe || !appWindow) return;
    const ownerWindow = element.ownerDocument.defaultView ?? window;
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
    ownerWindow.addEventListener(
      "mouseup",
      () => {
        iframe.style.pointerEvents = "auto";
      },
      { signal }
    );
  }
  #postHealthToIframe(iframe) {
    const hp = this.actor.system.health;
    if (!hp || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        type: MESSAGE_TYPES.FOUNDRY_HEALTH_UPDATE,
        payload: { hp: { value: hp.value, max: hp.max, temp: hp.temp ?? 0 } }
      },
      "*"
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
    const currentNightVision = this.actor.system.nightVision || "none";
    const tokenOffsetX = this.actor.getFlag("arcana", "tokenOffsetX") ?? 0;
    const tokenOffsetY = this.actor.getFlag("arcana", "tokenOffsetY") ?? 0;
    const currentColorId = resolveTokenColorId(
      this.actor.getFlag("arcana", "tokenBorderColor"),
      resolveDefaultTokenColorId(this.actor.type, !isCharacterURL(currentUrl))
    );
    const currentCreatureSize = resolveCurrentCreatureSize(this.#actor());
    const currentCreatureCategory = currentCreatureSize ? getCreatureSizeCategoryId(currentCreatureSize.id) : null;
    const isLargeCreatureCategory = currentCreatureCategory === "inmenso";
    const nightVisionOptions = Object.entries(NIGHT_VISION_LABELS).map(
      ([value, label]) => `<option value="${value}" ${value === currentNightVision ? "selected" : ""}>${label}</option>`
    ).join("");
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
					<div class="form-group"><label>Visi\xF3n Nocturna:</label><select name="nightVision">${nightVisionOptions}</select></div>
					<hr>
					<div class="form-group"><label>Color del Borde:</label><div class="token-color-options" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; justify-content: space-between;">${renderTokenColorOptions(currentColorId)}</div></div>
					<hr>
					<div class="creature-size-group">
						<div class="form-group"><label>Tama\xF1o de Criatura:</label><select name="creatureSizeCategory" onchange="this.closest('.creature-size-group').querySelector('[data-creature-size-variant]').style.display = this.value === 'inmenso' ? '' : 'none'">${renderCreatureSizeCategoryOptions(currentCreatureCategory)}</select></div>
						<div class="form-group" data-creature-size-variant style="${isLargeCreatureCategory ? "" : "display: none"}"><label>Variante:</label><select name="creatureSizeVariant">${renderLargeSizeVariantOptions(currentCreatureSize?.width ?? 3)}</select></div>
					</div>
					<hr>
					<div class="form-group"><label>Desplazamiento X:</label><input type="range" name="tokenOffsetX" min="-50" max="50" value="${tokenOffsetX}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetX}%</span></div>
					<div class="form-group"><label>Desplazamiento Y:</label><input type="range" name="tokenOffsetY" min="-50" max="50" value="${tokenOffsetY}" oninput="this.nextElementSibling.textContent = this.value + '%'" /><span class="token-offset-value">${tokenOffsetY}%</span></div>
					<hr>
					<div class="form-group"><label>Personaje \xDAnico?</label><input type="checkbox" name="actorLink" ${isLinked ? "checked" : ""} /></div>
				</form>`,
      buttons: {
        save: {
          label: "Guardar y Configurar",
          icon: "<i class='fas fa-save'></i>",
          callback: async (html) => {
            const newUrl = html.find("input[name='url']").val();
            const newLinkState = html.find("input[name='actorLink']").is(":checked");
            const newNightVision = html.find("select[name='nightVision']").val();
            const newTokenOffsetX = Number(html.find("input[name='tokenOffsetX']").val());
            const newTokenOffsetY = Number(html.find("input[name='tokenOffsetY']").val());
            const newColorId = resolveTokenColorId(
              html.find("input[name='tokenBorderColor']:checked").val(),
              currentColorId
            );
            const newCreatureSize = resolveSelectedCreatureSize(
              html.find("select[name='creatureSizeCategory']").val(),
              html.find("select[name='creatureSizeVariant']").val()
            );
            await this.actor.setFlag("arcana", "sheetUrl", newUrl.trim());
            await this.actor.setFlag("arcana", "tokenOffsetX", newTokenOffsetX);
            await this.actor.setFlag("arcana", "tokenOffsetY", newTokenOffsetY);
            await this.actor.setFlag("arcana", "tokenBorderColor", newColorId);
            if (newCreatureSize) {
              await this.#actor().setFlag("arcana", "creatureSize", newCreatureSize.id);
            }
            const tokenSettings = buildTokenSettings(newLinkState, this.actor.name);
            const sightUpdate = getNightVisionSightUpdate(newNightVision);
            const prototypeTokenSight = {};
            for (const [key, value] of Object.entries(sightUpdate)) {
              prototypeTokenSight[`prototypeToken.${key}`] = value;
            }
            const prototypeTokenSize = newCreatureSize ? {
              "prototypeToken.width": newCreatureSize.width,
              "prototypeToken.height": newCreatureSize.height
            } : {};
            await this.actor.update({
              ...tokenSettings,
              "system.nightVision": newNightVision,
              ...prototypeTokenSight,
              ...prototypeTokenSize
            });
            const tokenSize = newCreatureSize ? { width: newCreatureSize.width, height: newCreatureSize.height } : {};
            const activeTokens = this.actor.getActiveTokens();
            for (const t of activeTokens) {
              await t.document.update({
                displayBars: 40,
                "bar1.attribute": "health",
                "bar2.attribute": null,
                "sight.enabled": true,
                ...sightUpdate,
                ...tokenSize
              });
            }
            if (newColorId !== currentColorId) {
              this.#postTokenColorToIframe(newColorId);
            }
            const urlChanged = newUrl.trim() !== currentUrl;
            const tokenOffsetsChanged = newTokenOffsetX !== tokenOffsetX || newTokenOffsetY !== tokenOffsetY;
            this.render({
              force: true,
              forceReload: urlChanged || tokenOffsetsChanged
            });
          }
        }
      },
      default: "save"
    }).render(true);
  }
  #postTokenColorToIframe(colorId) {
    const iframe = this.element?.querySelector("iframe");
    if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        type: MESSAGE_TYPES.FOUNDRY_TOKEN_COLOR_UPDATE,
        color: getTokenColorHex(colorId)
      },
      "*"
    );
  }
};
function renderTokenColorOptions(currentColorId) {
  return TOKEN_COLORS.map((color) => {
    const isSelected = color.id === currentColorId;
    return `
			<label class="token-color-option" data-color-id="${color.id}" data-selected="${isSelected}" title="${escapeHtml(color.label)}" style="display: inline-flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; padding: 3px 5px; border-radius: 6px; border: 2px solid transparent; background: transparent; width: 50px;">
				<input type="radio" name="tokenBorderColor" value="${color.id}" aria-label="${escapeHtml(color.label)}" ${isSelected ? "checked" : ""} style="position: absolute; opacity: 0; width: 1px; height: 1px" />
				<span class="token-color-swatch" style="width: 22px; height: 22px; border-radius: 50%; background: ${color.hex}; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.45)"></span>
				<span class="token-color-label" style="font-size: 0.72rem">${escapeHtml(color.label)}</span>
			</label>`;
  }).join("");
}
function resolveCurrentCreatureSize(actor) {
  const stored = resolveCreatureSize(actor.getFlag("arcana", "creatureSize"));
  if (stored) return stored;
  return inferCreatureSize(actor.prototypeToken.width, actor.prototypeToken.height);
}
function resolveSelectedCreatureSize(category, largeFootprint) {
  if (category === "") return null;
  const sizeId = category === "inmenso" ? buildCreatureSizeId("inmenso", Number(largeFootprint)) : category;
  return resolveCreatureSize(sizeId);
}
function renderCreatureSizeCategoryOptions(currentCategory) {
  const neutralOption = `<option value=""${currentCategory === null ? " selected" : ""}>\u2014 Sin configurar \u2014</option>`;
  const categoryOptions = CREATURE_SIZE_CATEGORIES.map(
    (category) => `<option value="${category.id}"${category.id === currentCategory ? " selected" : ""}>${escapeHtml(category.label)}</option>`
  ).join("");
  return neutralOption + categoryOptions;
}
function renderLargeSizeVariantOptions(currentFootprint) {
  return LARGE_SIZE_VARIANTS.map(
    (variant) => `<option value="${variant.width}"${variant.width === currentFootprint ? " selected" : ""}>${escapeHtml(variant.label)}</option>`
  ).join("");
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function cssEscape(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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
  CONFIG.Actor.documentClass = ArcanaActor;
  CONFIG.Actor.dataModels = {
    // @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
    character: CharacterData,
    // @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
    npc: NPCData
  };
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health"],
      value: ["initiative"]
    },
    npc: {
      bar: ["health"],
      value: ["initiative"]
    }
  };
  CONFIG.Combat.documentClass = ArcanaCombat;
  CONFIG.Token.rulerClass = ArcanaTokenRuler;
  CONFIG.Token.objectClass = ArcanaToken;
  CONFIG.Token.documentClass = ArcanaTokenDocument;
  CONFIG.Combat.initiative = {
    formula: "1d8x + @system.initiative",
    decimals: 2
  };
  registerArcanaStatusEffects(CONFIG.statusEffects);
  Object.assign(CONFIG.specialStatusEffects, ARCANA_SPECIAL_STATUS_EFFECTS);
  CONFIG.ui.actors = ArcanaActorDirectory;
  Actors.registerSheet("arcana", ArcanaSheetV2, {
    label: "Arcana Web",
    makeDefault: true,
    types: ["character", "npc"]
  });
}

// src/hooks/render-token-hud.ts
function renderTokenHUD(app, _html) {
  const tokenDocument = app.object.document;
  console.log("TOKEN DOC", tokenDocument);
  console.log("IS CHARACTER", isCharacter(tokenDocument.baseActor));
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
    await this.updateTokenLocalNpcAbilityUsage(actor, data.payload);
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
    if (payload.speed !== void 0) {
      const speedUpdate = this.buildSpeedUpdate(actor, payload.speed);
      if (speedUpdate) {
        Object.assign(changes, speedUpdate);
        hasChanges = true;
      }
    }
    if (!isCharacter2 && payload.npcAbilityDefinitions !== void 0) {
      const owner = resolveNpcAbilityUsageOwner(actor);
      changes["flags.arcana.npcAbilityDefinitions"] = payload.npcAbilityDefinitions;
      if (owner === actor) {
        changes["flags.arcana.npcAbilityUsage"] = mergeNpcAbilityUsage(
          payload.npcAbilityDefinitions,
          readUsage(owner)
        );
      }
      hasChanges = true;
    }
    return { changes, hasChanges };
  }
  buildSpeedUpdate(actor, speed) {
    const oldSpeed = safeNum(actor.system.speed);
    const newSpeed = safeNum(speed);
    if (newSpeed === oldSpeed) return null;
    return { "system.speed": newSpeed };
  }
  async updateTokenLocalNpcAbilityUsage(actor, payload) {
    if (!payload.npcAbilityDefinitions) return;
    const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
    if (isCharacterURL(sheetUrl)) return;
    const owner = resolveNpcAbilityUsageOwner(actor);
    if (owner === actor) return;
    await owner.setFlag(
      "arcana",
      "npcAbilityUsage",
      mergeNpcAbilityUsage(payload.npcAbilityDefinitions, readUsage(owner))
    );
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
    const lastSource = safeStr(actor.getFlag("arcana", "imgSource"));
    const newSource = safeStr(imageSource);
    const oldImg = safeStr(actor.img);
    const newImg = safeStr(imageUrl);
    const sourceChanged = Boolean(newSource && newSource !== lastSource);
    const imageChanged = oldImg !== newImg;
    if (!sourceChanged && !imageChanged) {
      return null;
    }
    if (sourceChanged) {
      actor.setFlag("arcana", "imgSource", newSource);
    }
    return {
      img: newImg,
      "prototypeToken.texture.src": newImg
    };
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
      const newTemp = this.resolveTempUpdate(actor, hp.temp);
      if (newTemp !== null) {
        changes["system.health.temp"] = newTemp;
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
      const newTemp = this.resolveTempUpdate(actor, hp.temp);
      if (newTemp !== null) {
        changes["system.health.temp"] = newTemp;
        hasChanges = true;
      }
    }
    return hasChanges ? changes : null;
  }
  /**
   * Resolve the temporary HP value to synchronize.
   * Returns null when the payload does not include temp or it already matches
   * the actor state. Temporary HP is a non-negative pool.
   */
  resolveTempUpdate(actor, temp) {
    if (temp === void 0) return null;
    const oldTemp = safeNum(foundry.utils.getProperty(actor, "system.health.temp"));
    const newTemp = Number.isFinite(temp) ? Math.max(0, temp) : 0;
    return newTemp === oldTemp ? null : newTemp;
  }
  /**
   * Update all active tokens for the actor
   */
  async updateTokens(actor, changes, _payload) {
    const tokensToUpdate = this.getTokenDocuments(actor);
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
      if (needsTokenUpdate && t.update) {
        await t.update(tokenUpdates);
      }
      if (_payload.hp) {
        t.object?.drawBars?.();
      }
    }
  }
  getTokenDocuments(actor) {
    if (actor.isToken) {
      return actor.token ? [actor.token] : [];
    }
    return actor.getActiveTokens(
      false,
      true
    );
  }
  /**
   * Update the actor sheet UI if rendered
   */
  updateSheet(actor, changes) {
    const sheetUrl = actor.getFlag("arcana", "sheetUrl") || "";
    const isCharacter2 = isCharacterURL(sheetUrl);
    if (!actor.sheet || !actor.sheet.rendered || isCharacter2) return;
    const html = actor.sheet.element;
    if (Object.hasOwn(changes, "system.health.max")) {
      const maxInput = html.querySelector("input[name='system.health.max']");
      if (maxInput) maxInput.value = String(changes["system.health.max"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.max": changes["system.health.max"]
        });
      }
    }
    if (Object.hasOwn(changes, "system.health.value")) {
      const valueInput = html.querySelector("input[name='system.health.value']");
      if (valueInput) valueInput.value = String(changes["system.health.value"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.value": changes["system.health.value"]
        });
      }
    }
    if (Object.hasOwn(changes, "system.health.temp")) {
      const tempInput = html.querySelector("input[name='system.health.temp']");
      if (tempInput) tempInput.value = String(changes["system.health.temp"]);
      if (actor.isToken && actor.baseActor) {
        actor.baseActor.update({
          "system.health.temp": changes["system.health.temp"]
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
function createMessageHandler() {
  const rollHandler = new RollHandler();
  const actorUpdater = new ActorUpdater();
  return async (event) => {
    const data = event.data;
    if (!data) return;
    console.log("[Arcana] Received message:", data.type, "from", event.origin);
    await routeMessage(data, rollHandler, actorUpdater);
  };
}
function registerMessageListener(target, handler = createMessageHandler()) {
  const listener = (event) => void handler(event);
  target.addEventListener("message", listener);
  return () => target.removeEventListener("message", listener);
}
function setupMessageListener() {
  return registerMessageListener(window);
}

// src/hooks/setup-detached-window.ts
var DETACHED_STYLES_ID = "arcana-detached-styles";
var DETACHED_STYLES_CSS = `
body.detached .application.arcana {
	left: 0 !important;
	top: 0 !important;
	width: 100% !important;
	height: 100% !important;
	max-width: none !important;
	max-height: none !important;
	min-width: 0;
	min-height: 0;
	border: none;
	border-radius: 0;
	box-shadow: none;
}

body.detached .application.arcana .window-header {
	display: none;
}

body.detached .application.arcana .window-content {
	padding: 0;
}

.arcana-detach-return {
	position: absolute;
	top: 8px;
	right: 8px;
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.25);
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.55);
	color: #f0f0e0;
	cursor: pointer;
	opacity: 0.35;
}

.arcana-detach-return:hover {
	opacity: 1;
}
`;
function ensureDetachedStyles(doc = document) {
  if (!doc?.head || doc.getElementById(DETACHED_STYLES_ID)) return;
  const style = doc.createElement("style");
  style.id = DETACHED_STYLES_ID;
  style.textContent = DETACHED_STYLES_CSS;
  doc.head.append(style);
}
var registrationsByWindowId = /* @__PURE__ */ new Map();
function registerDetachedWindow(windowId, detachedWindow, messageHandler) {
  unregisterDetachedWindow(windowId);
  if (typeof detachedWindow?.addEventListener !== "function") return;
  const removeMessageListener = registerMessageListener(detachedWindow, messageHandler);
  const onKeyDown = (event) => closeApplicationOnEscape(windowId, event);
  detachedWindow.addEventListener("keydown", onKeyDown);
  registrationsByWindowId.set(windowId, {
    removeMessageListener,
    onKeyDown,
    window: detachedWindow
  });
}
function unregisterDetachedWindow(windowId) {
  const registration = registrationsByWindowId.get(windowId);
  if (!registration) return;
  registration.removeMessageListener();
  registration.window.removeEventListener("keydown", registration.onKeyDown);
  registrationsByWindowId.delete(windowId);
}
function setupDetachedWindow(messageHandler) {
  ensureDetachedStyles();
  Hooks.on("openDetachedWindow", (windowId, detachedWindow) => {
    registerDetachedWindow(windowId, detachedWindow, messageHandler);
  });
  Hooks.on("closeDetachedWindow", (windowId) => {
    unregisterDetachedWindow(windowId);
  });
}
function closeApplicationOnEscape(windowId, event) {
  if (event.key !== "Escape") return;
  const application = findApplication(windowId);
  if (typeof application?.close !== "function") return;
  event.preventDefault();
  event.stopPropagation();
  application.close();
}
function findApplication(windowId) {
  const instances = globalThis.foundry?.applications?.instances;
  return instances?.get?.(windowId);
}

// src/hooks/setup-esc-interceptor.ts
function getFoundryApplications() {
  return globalThis.foundry;
}
function getFoundryTour() {
  return globalThis.Tour;
}
function getFoundryCanvas() {
  return globalThis.canvas;
}
function getFoundryNotifications() {
  return ui.notifications;
}
function isCollapsible(app) {
  if (!app) return false;
  if (app.options?.window?.minimizable === true && app.hasFrame === true) return true;
  if (app.options?.minimizable === true && app.popOut === true) return true;
  return false;
}
function isMinimized(app) {
  if (!app) return false;
  return Boolean(app.minimized) || Boolean(app._minimized);
}
function getAllWindows() {
  const v1 = Object.values(ui.windows ?? {});
  const v2 = Array.from(getFoundryApplications().applications?.instances?.values() ?? []).filter(
    (app) => app.rendered === true
  );
  return [...v1, ...v2];
}
function getActiveCollapsibleWindow(windows) {
  const active = windows.filter((w) => !isMinimized(w)).sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];
  if (active && isCollapsible(active)) return active;
  return void 0;
}
function bringWindowToFront(app) {
  if (!app) return;
  if (typeof app.bringToFront === "function") {
    app.bringToFront();
  } else if (typeof app.bringToTop === "function") {
    app.bringToTop();
  }
}
function setupEscInterceptor() {
  const binding = game.keybindings.activeKeys.get("Escape")?.find((b) => b.action === "core.dismiss");
  if (!binding) return;
  const originalOnDown = binding.onDown;
  if (!originalOnDown) return;
  binding.onDown = (ctx) => {
    try {
      if (ui.context?.menu?.length) {
        ui.context.close?.();
        return true;
      }
      const tour = getFoundryTour();
      if (tour?.tourInProgress) {
        tour.close?.();
        return true;
      }
      const windows = getAllWindows();
      const active = getActiveCollapsibleWindow(windows);
      if (active) {
        const next = windows.filter((w) => w !== active && isCollapsible(w) && !isMinimized(w)).sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];
        active.close();
        if (next) bringWindowToFront(next);
        return true;
      }
      const frontmost = windows.sort(
        (a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0)
      )[0];
      if (frontmost && isCollapsible(frontmost) && isMinimized(frontmost)) {
        const canvas3 = getFoundryCanvas();
        if (canvas3?.activeLayer?.controlled?.length) {
          canvas3.activeLayer.releaseAll?.();
        }
        return true;
      }
      const canvas2 = getFoundryCanvas();
      if (canvas2?.activeLayer?.controlled?.length) {
        canvas2.activeLayer.releaseAll?.();
        return true;
      }
      const notifications = getFoundryNotifications();
      if (notifications?.queue?.length) {
        notifications.closeAll?.();
        return true;
      }
      return originalOnDown(ctx);
    } catch (error) {
      console.warn("Error in ESC interceptor:", error);
      return originalOnDown(ctx);
    }
  };
}

// main.ts
Hooks.once("init", init);
Hooks.on("renderTokenHUD", renderTokenHUD);
Hooks.once("ready", setupEscInterceptor);
setupMessageListener();
setupDetachedWindow();
//# sourceMappingURL=main.js.map
