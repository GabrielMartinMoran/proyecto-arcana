#!/usr/bin/env node

// src/utils/formatting.ts
var removeDiacritics = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};
var slugify = (text) => removeDiacritics(text).toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

// src/scripts/cli/filters.ts
var normalize = (value) => value.toLocaleLowerCase();
var normalizeList = (values) => values?.map((value) => normalize(value)) ?? [];
var matchesCardKind = (card, kind) => {
  if (!kind || kind === "any") return true;
  return card.cardType === kind;
};
var matchesType = (card, types) => {
  if (!types || types.length === 0) return true;
  const normalizedTypes = normalizeList(types);
  const cardType = normalize(card.type);
  return normalizedTypes.some((type) => type === cardType);
};
var matchesName = (card, value) => {
  if (!value) return true;
  const target = normalize(value);
  return normalize(card.name).includes(target);
};
var matchesSlug = (card, value) => {
  if (!value) return true;
  const slug = card.slug ? normalize(card.slug) : "";
  const target = normalize(value);
  return slug.includes(target);
};
var matchesLevel = (card, options) => {
  const { level, minLevel, maxLevel } = options;
  if (Array.isArray(level) && level.length > 0) {
    return level.includes(card.level);
  }
  if (typeof level === "number") {
    return card.level === level;
  }
  if (typeof minLevel === "number" && card.level < minLevel) {
    return false;
  }
  if (typeof maxLevel === "number" && card.level > maxLevel) {
    return false;
  }
  return true;
};
var matchesTagsAll = (card, tags) => {
  if (!tags || tags.length === 0) return true;
  const normalizedTags = normalizeList(tags);
  const cardTags = card.tags.map((tag) => normalize(tag));
  return normalizedTags.every((tag) => cardTags.includes(tag));
};
var matchesTagsAny = (card, tags) => {
  if (!tags || tags.length === 0) return true;
  const normalizedTags = normalizeList(tags);
  const cardTags = card.tags.map((tag) => normalize(tag));
  return normalizedTags.some((tag) => cardTags.includes(tag));
};
var matchesTagsExclude = (card, tags) => {
  if (!tags || tags.length === 0) return true;
  const normalizedTags = normalizeList(tags);
  const cardTags = card.tags.map((tag) => normalize(tag));
  return normalizedTags.every((tag) => !cardTags.includes(tag));
};
var matchesRequirements = (card, values) => {
  if (!values || values.length === 0) return true;
  const source = normalize(card.requirements ?? "");
  if (!source) return false;
  return values.every((value) => source.includes(normalize(value)));
};
var passesFilters = (card, options) => {
  if (!matchesCardKind(card, options.cardKind)) return false;
  if (!matchesType(card, options.types)) return false;
  if (!matchesName(card, options.nameIncludes)) return false;
  if (!matchesSlug(card, options.slugIncludes)) return false;
  if (!matchesLevel(card, options)) return false;
  if (!matchesTagsAll(card, options.tagsAll)) return false;
  if (!matchesTagsAny(card, options.tagsAny)) return false;
  if (!matchesTagsExclude(card, options.tagsExclude)) return false;
  if (!matchesRequirements(card, options.requirementsIncludes)) return false;
  return true;
};
var filterCards = (cards, options = {}) => {
  return cards.filter((card) => passesFilters(card, options));
};
var sortCardsByName = (cards) => {
  return [...cards].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
};
var sortCardsByLevelThenName = (cards) => {
  return [...cards].sort((a, b) => {
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
};

// src/scripts/cli/formatters.ts
var DEFAULT_SUMMARY_OPTIONS = {
  showId: false,
  showSlug: false,
  includeKindLabel: true,
  alignColumns: true
};
var DEFAULT_DETAIL_OPTIONS = {
  showId: true,
  showSlug: true,
  showDescription: true,
  showRequirements: true,
  showTags: true,
  showUses: true,
  showCost: true
};
var formatUses = (uses) => {
  if (!uses || !uses.type) return "\u2014";
  switch (uses.type) {
    case "LONG_REST":
      return `Usos por descanso largo: ${uses.qty ?? 1}`;
    case "RELOAD":
      return `Recarga ${uses.qty ?? "\u2014"}+`;
    case "USES":
      return `Usos: ${uses.qty ?? "\u2014"}`;
    case "DAY":
      return `Usos por d\xEDa: ${uses.qty ?? 1}`;
    default:
      return "\u2014";
  }
};
var pad = (value, length) => value.padEnd(length, " ");
var formatColumn = (value, length, shouldAlign) => shouldAlign ? pad(value, length) : value;
var toLabel = (card, includeKind) => {
  if (!includeKind) return card.name;
  const label = card.cardType === "item" ? "Objeto" : "Habilidad";
  return `${label}: ${card.name}`;
};
var formatTags = (tags) => tags.length ? tags.join(", ") : "\u2014";
var formatRequirements = (requirements) => requirements && requirements.trim().length > 0 ? requirements : "\u2014";
var collectSummaryColumns = (card, options) => {
  const columns = [];
  if (options.showId) {
    columns.push(card.id);
  }
  if (options.showSlug && card.slug) {
    columns.push(card.slug);
  }
  columns.push(toLabel(card, options.includeKindLabel));
  columns.push(`Nivel ${card.level}`);
  columns.push(formatTags(card.tags));
  return columns;
};
var computeColumnWidths = (rows) => {
  const widths = [];
  for (const row of rows) {
    row.forEach((value, index) => {
      const length = value.length;
      if (!widths[index] || length > widths[index]) {
        widths[index] = length;
      }
    });
  }
  return widths;
};
var formatCardSummaries = (cards, options = {}) => {
  if (cards.length === 0) return "No se encontraron cartas que cumplan esos criterios.";
  const resolved = { ...DEFAULT_SUMMARY_OPTIONS, ...options };
  const rows = cards.map((card) => collectSummaryColumns(card, resolved));
  const widths = resolved.alignColumns ? computeColumnWidths(rows) : [];
  const lines = rows.map(
    (row) => row.map((col, index) => formatColumn(col, widths[index], resolved.alignColumns)).join(" | ")
  );
  return lines.join("\n");
};
var formatCardDetails = (card, options = {}) => {
  const resolved = { ...DEFAULT_DETAIL_OPTIONS, ...options };
  const lines = [];
  lines.push(toLabel(card, true));
  lines.push("-".repeat(lines[0].length));
  if (resolved.showId) {
    lines.push(`ID: ${card.id}`);
  }
  if (resolved.showSlug && card.slug) {
    lines.push(`Slug: ${card.slug}`);
  }
  lines.push(`Nivel: ${card.level}`);
  lines.push(`Tipo: ${card.type}`);
  if (card.cardType === "item" && resolved.showCost) {
    const cost = card.cost ?? "\u2014";
    lines.push(`Costo: ${cost}`);
  }
  if (resolved.showTags) {
    lines.push(`Etiquetas: ${formatTags(card.tags)}`);
  }
  if (resolved.showRequirements) {
    lines.push(`Requerimientos: ${formatRequirements(card.requirements)}`);
  }
  if (resolved.showUses) {
    lines.push(`Usos: ${formatUses(card.uses ?? null)}`);
  }
  if (resolved.showDescription && card.description.trim()) {
    lines.push("\nDescripci\xF3n:\n");
    lines.push(card.description.trim());
  }
  return lines.join("\n");
};
var formatListHeader = (title, count) => {
  const plural = count === 1 ? "carta" : "cartas";
  return `${title} (${count} ${plural})
${"-".repeat(title.length + plural.length + 4)}`;
};
var formatListWithHeader = (title, cards, options = {}) => {
  const header = formatListHeader(title, cards.length);
  const body = formatCardSummaries(cards, options);
  return `${header}
${body}`;
};

// src/scripts/cli/commands.ts
var DEFAULT_EMPTY_MESSAGE = "No se encontraron cartas que cumplan esos criterios.";
var normalizeArray = (values) => {
  if (!values) return void 0;
  const filtered = values.map((value) => value.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered : void 0;
};
var toLevelFilter = (options) => {
  if (options.levels && options.levels.length > 0) {
    return options.levels.length === 1 ? options.levels[0] : options.levels;
  }
  if (typeof options.level === "number") {
    return options.level;
  }
  return void 0;
};
var determineTitle = (options) => {
  if (options.title && options.title.trim().length > 0) return options.title;
  switch (options.cardKind) {
    case "ability":
      return "Cartas de habilidad";
    case "item":
      return "Objetos m\xE1gicos";
    default:
      return "Cartas de ARCANA";
  }
};
var determineSortMode = (options) => {
  if (options.sortBy) return options.sortBy;
  return options.cardKind && options.cardKind !== "any" ? "level" : "name";
};
var sortCards = (cards, mode) => {
  return mode === "level" ? sortCardsByLevelThenName(cards) : sortCardsByName(cards);
};
var buildFilterOptions = (options) => {
  return {
    cardKind: options.cardKind,
    types: normalizeArray(options.types),
    nameIncludes: options.nameIncludes?.trim(),
    slugIncludes: options.slugIncludes?.trim(),
    level: toLevelFilter(options),
    minLevel: options.minLevel,
    maxLevel: options.maxLevel,
    tagsAll: normalizeArray(options.tagsAll),
    tagsAny: normalizeArray(options.tagsAny),
    tagsExclude: normalizeArray(options.tagsExclude),
    requirementsIncludes: normalizeArray(options.requirementsIncludes)
  };
};
var buildSummaryOptions = (options, cardKind) => {
  const summary = { ...options.display ?? {} };
  if (summary.includeKindLabel === void 0) {
    summary.includeKindLabel = !cardKind || cardKind === "any";
  }
  return summary;
};
var listCards = (dataset, options = {}) => {
  const filterOptions = buildFilterOptions(options);
  const filtered = filterCards(dataset.all, filterOptions);
  const sorted = sortCards(filtered, determineSortMode(options));
  if (sorted.length === 0) {
    return options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
  }
  const title = determineTitle(options);
  const summaryOptions = buildSummaryOptions(options, options.cardKind);
  return formatListWithHeader(title, sorted, summaryOptions);
};
var normalizeIdentifier = (value) => removeDiacritics(value.trim()).toLocaleLowerCase();
var matchesIdentifier = (card, target) => {
  const normalizedTarget = normalizeIdentifier(target);
  if (!normalizedTarget) return false;
  const candidates = [
    card.id,
    card.slug ?? "",
    card.name,
    normalizeIdentifier(card.id),
    normalizeIdentifier(card.slug ?? ""),
    normalizeIdentifier(card.name)
  ];
  return candidates.some((candidate) => normalizeIdentifier(candidate) === normalizedTarget);
};
var selectPoolByKind = (dataset, kind) => {
  switch (kind) {
    case "ability":
      return dataset.abilities;
    case "item":
      return dataset.items;
    default:
      return dataset.all;
  }
};
var showCardDetail = (dataset, options) => {
  const pool = selectPoolByKind(dataset, options.cardKind);
  const card = pool.find((candidate) => matchesIdentifier(candidate, options.identifier));
  if (!card) {
    throw new Error(`No se encontr\xF3 ninguna carta con identificador "${options.identifier}".`);
  }
  return formatCardDetails(card, options.display);
};

// src/scripts/cli/data-loader.ts
import fs from "fs";
import { load as yamlLoad } from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

// src/mappers/card-mapper.ts
import { sha1 } from "js-sha1";
var generateId = (seed) => sha1(seed);
var cloneRequirements = (requirements) => {
  if (requirements == null) return null;
  return JSON.parse(JSON.stringify(requirements));
};
var toNormalizedString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
var deriveSlug = (value, fallback) => {
  const candidate = toNormalizedString(value);
  return slugify(candidate ?? fallback);
};
var mapCard = (data) => {
  const name = toNormalizedString(data.name);
  if (!name) throw new Error("Card name is required");
  return {
    id: generateId(name),
    ...data,
    name,
    slug: deriveSlug(data.slug, name),
    requirements: cloneRequirements(data.requirements)
  };
};
var mapAbilityCard = (data) => {
  return {
    ...mapCard(data),
    type: data.type,
    cardType: "ability"
  };
};
var mapItemCard = (data) => {
  return {
    ...mapCard(data),
    type: data.type,
    cost: data.cost,
    cardType: "item"
  };
};

// src/scripts/cli/data-loader.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var DATASET_FILES = {
  cards: "cards.yml",
  items: "magical-items.yml"
};
var FALLBACK_DIRECTORIES = [
  process.env.ARCANA_DATASET_DIR,
  path.resolve(process.cwd(), "references", "datasets"),
  path.resolve(process.cwd(), "references"),
  path.resolve(__dirname, "../../..", "references", "datasets"),
  path.resolve(__dirname, "../../..", "references"),
  path.resolve(__dirname, "../../../..", "references", "datasets"),
  path.resolve(__dirname, "../../../..", "references"),
  path.resolve(process.cwd(), "static", "docs"),
  path.resolve(process.cwd(), "../../static/docs"),
  path.resolve(__dirname, "../../../../../static/docs")
].filter((value, index, array) => {
  if (typeof value !== "string" || value.length === 0) return false;
  return array.indexOf(value) === index;
});
var ensureArray = (value, fileLabel) => {
  if (value === void 0) return [];
  if (!Array.isArray(value)) {
    const valueType = typeof value;
    throw new Error(
      `Expected an array in ${fileLabel}, but received ${valueType === "object" ? "object" : valueType}`
    );
  }
  return value;
};
var resolveDatasetFile = (fileName) => {
  for (const baseDir of FALLBACK_DIRECTORIES) {
    const candidate = path.join(baseDir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Unable to locate dataset file "${fileName}". Provide ARCANA_DATASET_DIR or run from the skill package root.`
  );
};
var loadYaml = (fileName) => {
  const sourcePath = resolveDatasetFile(fileName);
  const raw = fs.readFileSync(sourcePath, "utf-8");
  const data = yamlLoad(raw);
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Unexpected root structure in ${sourcePath}`);
  }
  return { data, sourcePath };
};
var loadAbilityCards = () => {
  const { data, sourcePath } = loadYaml(DATASET_FILES.cards);
  const rawCards = ensureArray(data.cards, sourcePath);
  return rawCards.map((entry, index) => {
    try {
      return mapAbilityCard(entry);
    } catch (err) {
      throw new Error(
        `Failed to map ability card at index ${index} from ${sourcePath}: ${err.message}`
      );
    }
  });
};
var loadMagicalItems = () => {
  const { data, sourcePath } = loadYaml(DATASET_FILES.items);
  const rawItems = ensureArray(data.items, sourcePath);
  return rawItems.map((entry, index) => {
    try {
      return mapItemCard(entry);
    } catch (err) {
      throw new Error(
        `Failed to map magical item at index ${index} from ${sourcePath}: ${err.message}`
      );
    }
  });
};
var loadCardsDataset = () => {
  const abilities = loadAbilityCards();
  const items = loadMagicalItems();
  return {
    abilities,
    items,
    all: [...abilities, ...items]
  };
};

// src/scripts/cli/index.ts
var SUPPORTED_COMMANDS = /* @__PURE__ */ new Set(["list", "detail"]);
var expectValue = (args, index, flag) => {
  const value = args[index + 1];
  if (value === void 0 || value.startsWith("--")) {
    throw new Error(`La opci\xF3n "${flag}" requiere un valor.`);
  }
  return value;
};
var parseInteger = (flag, rawValue) => {
  const value = Number.parseInt(rawValue, 10);
  if (Number.isNaN(value)) {
    throw new Error(`El valor "${rawValue}" no es un n\xFAmero v\xE1lido para la opci\xF3n "${flag}".`);
  }
  return value;
};
var parseCardKind = (raw) => {
  const normalized = raw.trim().toLocaleLowerCase();
  switch (normalized) {
    case "ability":
    case "habilidad":
      return "ability";
    case "item":
    case "objeto":
      return "item";
    case "any":
    case "cualquiera":
      return "any";
    default:
      throw new Error(
        `Valor inv\xE1lido "${raw}" para "--kind". Usa "ability", "item" o "any".`
      );
  }
};
var parseSortMode = (raw) => {
  const normalized = raw.trim().toLocaleLowerCase();
  switch (normalized) {
    case "name":
    case "nombre":
      return "name";
    case "level":
    case "nivel":
      return "level";
    default:
      throw new Error(
        `Valor inv\xE1lido "${raw}" para "--sort". Usa "name" (nombre) o "level" (nivel).`
      );
  }
};
var parseLevelsValue = (flag, raw) => {
  return raw.split(",").map((part) => part.trim()).filter(Boolean).map((part) => parseInteger(flag, part));
};
var ensureListDisplay = (options) => {
  if (!options.display) options.display = {};
  return options.display;
};
var ensureDetailDisplay = (options) => {
  if (!options.display) options.display = {};
  return options.display;
};
var parseListCommandOptions = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      throw new Error('El comando "list" no admite argumentos posicionales.');
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Argumento no reconocido "${arg}". Usa "list --help" para m\xE1s detalles.`);
    }
    switch (arg) {
      case "--kind": {
        const value = expectValue(args, index, arg);
        options.cardKind = parseCardKind(value);
        index += 1;
        break;
      }
      case "--type": {
        const value = expectValue(args, index, arg);
        if (!options.types) options.types = [];
        options.types.push(value);
        index += 1;
        break;
      }
      case "--tag": {
        const value = expectValue(args, index, arg);
        if (!options.tagsAll) options.tagsAll = [];
        options.tagsAll.push(value);
        index += 1;
        break;
      }
      case "--any-tag": {
        const value = expectValue(args, index, arg);
        if (!options.tagsAny) options.tagsAny = [];
        options.tagsAny.push(value);
        index += 1;
        break;
      }
      case "--not-tag": {
        const value = expectValue(args, index, arg);
        if (!options.tagsExclude) options.tagsExclude = [];
        options.tagsExclude.push(value);
        index += 1;
        break;
      }
      case "--require": {
        const value = expectValue(args, index, arg);
        if (!options.requirementsIncludes) options.requirementsIncludes = [];
        options.requirementsIncludes.push(value);
        index += 1;
        break;
      }
      case "--name": {
        const value = expectValue(args, index, arg);
        options.nameIncludes = value;
        index += 1;
        break;
      }
      case "--slug": {
        const value = expectValue(args, index, arg);
        options.slugIncludes = value;
        index += 1;
        break;
      }
      case "--level": {
        const value = parseInteger(arg, expectValue(args, index, arg));
        if (!options.levels) options.levels = [];
        options.levels.push(value);
        index += 1;
        break;
      }
      case "--levels": {
        const raw = expectValue(args, index, arg);
        const parsed = parseLevelsValue(arg, raw);
        if (!options.levels) options.levels = [];
        options.levels.push(...parsed);
        index += 1;
        break;
      }
      case "--min-level": {
        options.minLevel = parseInteger(arg, expectValue(args, index, arg));
        index += 1;
        break;
      }
      case "--max-level": {
        options.maxLevel = parseInteger(arg, expectValue(args, index, arg));
        index += 1;
        break;
      }
      case "--sort": {
        const value = expectValue(args, index, arg);
        options.sortBy = parseSortMode(value);
        index += 1;
        break;
      }
      case "--title": {
        const value = expectValue(args, index, arg);
        options.title = value;
        index += 1;
        break;
      }
      case "--empty-message": {
        const value = expectValue(args, index, arg);
        options.emptyMessage = value;
        index += 1;
        break;
      }
      case "--no-kind-label": {
        ensureListDisplay(options).includeKindLabel = false;
        break;
      }
      case "--include-kind-label": {
        ensureListDisplay(options).includeKindLabel = true;
        break;
      }
      case "--show-id": {
        ensureListDisplay(options).showId = true;
        break;
      }
      case "--show-slug": {
        ensureListDisplay(options).showSlug = true;
        break;
      }
      case "--no-align": {
        ensureListDisplay(options).alignColumns = false;
        break;
      }
      case "--align": {
        ensureListDisplay(options).alignColumns = true;
        break;
      }
      default:
        throw new Error(`Opci\xF3n desconocida "${arg}" para el comando "list".`);
    }
  }
  return options;
};
var parseDetailCommandOptions = (args) => {
  const options = { identifier: "" };
  let identifier = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      if (identifier !== null) {
        throw new Error('Solo se permite un identificador para el comando "detail".');
      }
      const value = args.slice(index + 1).join(" ").trim();
      if (!value) {
        throw new Error('Debes proporcionar un identificador despu\xE9s de "--".');
      }
      identifier = value;
      break;
    }
    if (!arg.startsWith("--")) {
      if (identifier !== null) {
        throw new Error(
          `Se recibi\xF3 un segundo identificador "${arg}". Solo se admite uno.`
        );
      }
      identifier = arg;
      continue;
    }
    switch (arg) {
      case "--kind": {
        const value = expectValue(args, index, arg);
        options.cardKind = parseCardKind(value);
        index += 1;
        break;
      }
      case "--show-id": {
        ensureDetailDisplay(options).showId = true;
        break;
      }
      case "--no-id":
      case "--hide-id": {
        ensureDetailDisplay(options).showId = false;
        break;
      }
      case "--show-slug": {
        ensureDetailDisplay(options).showSlug = true;
        break;
      }
      case "--no-slug":
      case "--hide-slug": {
        ensureDetailDisplay(options).showSlug = false;
        break;
      }
      case "--no-description":
      case "--hide-description": {
        ensureDetailDisplay(options).showDescription = false;
        break;
      }
      case "--no-requirements":
      case "--hide-requirements": {
        ensureDetailDisplay(options).showRequirements = false;
        break;
      }
      case "--no-tags":
      case "--hide-tags": {
        ensureDetailDisplay(options).showTags = false;
        break;
      }
      case "--no-uses":
      case "--hide-uses": {
        ensureDetailDisplay(options).showUses = false;
        break;
      }
      case "--no-cost":
      case "--hide-cost": {
        ensureDetailDisplay(options).showCost = false;
        break;
      }
      default:
        throw new Error(`Opci\xF3n desconocida "${arg}" para el comando "detail".`);
    }
  }
  if (!identifier) {
    throw new Error("Debes proporcionar el identificador de la carta (id, slug o nombre).");
  }
  options.identifier = identifier;
  return options;
};
var printCliUsage = () => {
  const usage = `
Comandos soportados:
  list [opciones]            Lista cartas de habilidades u objetos m\xE1gicos.
  detail <id|slug|nombre>    Muestra el detalle de una carta espec\xEDfica.

Opciones para "list":
  --kind <ability|item|any>        Limita el tipo de carta.
  --type <valor>                   Filtra por el campo "type" de la carta (repetible).
  --tag <etiqueta>                 Requiere etiquetas espec\xEDficas (repetible).
  --any-tag <etiqueta>             Coincide con alguna etiqueta (repetible).
  --not-tag <etiqueta>             Excluye etiquetas (repetible).
  --require <texto>                Busca texto en los requisitos (repetible).
  --name <texto>                   Busca en el nombre.
  --slug <texto>                   Busca en el slug.
  --level <n> / --levels <a,b,c>   Filtra por niveles concretos.
  --min-level <n> / --max-level <n>Define un rango de niveles.
  --sort <name|level>              Ordena por nombre o nivel.
  --title <texto>                  Personaliza el t\xEDtulo del listado.
  --empty-message <texto>          Mensaje si no hay resultados.
  --no-kind-label                  Oculta la etiqueta de tipo en el listado.
  --show-id / --show-slug          Muestra columnas adicionales.
  --no-align                       Evita el alineado en columnas.

Opciones para "detail":
  --kind <ability|item|any>        Limita la b\xFAsqueda a un conjunto de cartas.
  --no-id / --hide-id              Oculta el identificador.
  --no-slug / --hide-slug          Oculta el slug.
  --no-description                Oculta la descripci\xF3n.
  --no-requirements               Oculta los requisitos.
  --no-tags                       Oculta las etiquetas.
  --no-uses                       Oculta la informaci\xF3n de usos.
  --no-cost                       Oculta el costo (solo objetos).
`.trim();
  console.log(usage);
};
var isCardsCliCommand = (command) => {
  if (!command) return false;
  return SUPPORTED_COMMANDS.has(command);
};
var runCardsCliCommand = async (command, args) => {
  try {
    switch (command) {
      case "list": {
        const options = parseListCommandOptions(args);
        const dataset = loadCardsDataset();
        const output = listCards(dataset, options);
        console.log(output);
        break;
      }
      case "detail": {
        const options = parseDetailCommandOptions(args);
        const dataset = loadCardsDataset();
        const output = showCardDetail(dataset, options);
        console.log(output);
        break;
      }
      default: {
        console.error(`Comando desconocido "${command}".`);
        printCliUsage();
        process.exitCode = 1;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
};

// src/scripts/cli/entrypoint.ts
var printUsage = () => {
  console.log("Usage: node dist/index.js <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  list [opciones]            Lista cartas de habilidades u objetos m\xE1gicos.");
  console.log("  detail <id|slug|nombre>    Muestra el detalle de una carta espec\xEDfica.");
  console.log("  help                       Muestra este mensaje de ayuda.");
  console.log("");
  printCliUsage();
};
var runCli = async () => {
  const [command = "help", ...rest] = process.argv.slice(2);
  if (isCardsCliCommand(command)) {
    await runCardsCliCommand(command, rest);
    return;
  }
  switch (command) {
    case "help":
    case "--help":
    case "-h": {
      printUsage();
      break;
    }
    default: {
      console.error(`Comando desconocido "${command}".`);
      printUsage();
      process.exit(1);
    }
  }
};
runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
