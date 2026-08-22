import {
	listCards,
	runSearch,
	showCardDetail,
	type DetailCommandOptions,
	type ListCommandOptions,
	type ListSortMode,
} from './commands.js';
import { loadCardsDataset } from './data-loader.js';
import type { CardKind } from './filters.js';
import type { OutputFormat, SearchFilterKind, SearchOptions } from './search/types.js';

const SUPPORTED_COMMANDS = new Set<string>(['list', 'detail', 'search']);

const expectValue = (args: string[], index: number, flag: string): string => {
	const value = args[index + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`La opción "${flag}" requiere un valor.`);
	}
	return value;
};

const parseInteger = (flag: string, rawValue: string): number => {
	const value = Number.parseInt(rawValue, 10);
	if (Number.isNaN(value)) {
		throw new Error(`El valor "${rawValue}" no es un número válido para la opción "${flag}".`);
	}
	return value;
};

const parseCardKind = (raw: string): CardKind => {
	const normalized = raw.trim().toLocaleLowerCase();
	switch (normalized) {
		case 'ability':
		case 'habilidad':
			return 'ability';
		case 'item':
		case 'objeto':
			return 'item';
		case 'any':
		case 'cualquiera':
			return 'any';
		default:
			throw new Error(`Valor inválido "${raw}" para "--kind". Usa "ability", "item" o "any".`);
	}
};

const parseSortMode = (raw: string): ListSortMode => {
	const normalized = raw.trim().toLocaleLowerCase();
	switch (normalized) {
		case 'name':
		case 'nombre':
			return 'name';
		case 'level':
		case 'nivel':
			return 'level';
		default:
			throw new Error(
				`Valor inválido "${raw}" para "--sort". Usa "name" (nombre) o "level" (nivel).`,
			);
	}
};

const parseLevelsValue = (flag: string, raw: string): number[] => {
	return raw
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => parseInteger(flag, part));
};

const parseSearchKind = (raw: string): SearchFilterKind => {
	const normalized = raw.trim().toLocaleLowerCase();
	switch (normalized) {
		case 'chapter':
		case 'capitulo':
			return 'chapter';
		case 'card':
		case 'carta':
			return 'card';
		case 'item':
		case 'objeto':
		case 'object':
			return 'item';
		case 'creature':
		case 'criatura':
			return 'creature';
		case 'section':
		case 'seccion':
			return 'section';
		case 'any':
		case 'cualquiera':
			return 'any';
		default:
			throw new Error(
				`Valor inválido "${raw}" para "--kind". Usa chapter, card, item, creature, section o any.`,
			);
	}
};

const parseOutputFormat = (raw: string): OutputFormat => {
	const normalized = raw.trim().toLocaleLowerCase();
	switch (normalized) {
		case 'json':
			return 'json';
		case 'text':
		case 'texto':
			return 'text';
		default:
			throw new Error(`Valor inválido "${raw}" para "--format". Usa "json" o "text".`);
	}
};

export interface ParsedSearchCommand {
	options: SearchOptions;
	help: boolean;
}

export const parseSearchCommandArgs = (args: string[]): ParsedSearchCommand => {
	const options: SearchOptions = { query: '' };
	const positionals: string[] = [];
	let help = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--help' || arg === '-h') {
			help = true;
			continue;
		}

		if (arg === '--') {
			positionals.push(...args.slice(index + 1));
			break;
		}

		if (!arg.startsWith('--')) {
			positionals.push(arg);
			continue;
		}

		switch (arg) {
			case '--query': {
				const value = expectValue(args, index, arg);
				options.query = value;
				index += 1;
				break;
			}
			case '--kind': {
				options.kind = parseSearchKind(expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--source': {
				options.source = expectValue(args, index, arg);
				index += 1;
				break;
			}
			case '--level': {
				const value = parseInteger(arg, expectValue(args, index, arg));
				if (typeof options.level === 'number') {
					options.level = [options.level, value];
				} else if (Array.isArray(options.level)) {
					options.level.push(value);
				} else {
					options.level = value;
				}
				index += 1;
				break;
			}
			case '--min-level': {
				options.minLevel = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--max-level': {
				options.maxLevel = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--tier': {
				options.tier = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--tag': {
				const value = expectValue(args, index, arg);
				if (!options.tagsAll) options.tagsAll = [];
				options.tagsAll.push(value);
				index += 1;
				break;
			}
			case '--type': {
				const value = expectValue(args, index, arg);
				if (!options.types) options.types = [];
				options.types.push(value);
				index += 1;
				break;
			}
			case '--lineage': {
				options.lineage = expectValue(args, index, arg);
				index += 1;
				break;
			}
			case '--limit': {
				options.limit = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--format': {
				options.format = parseOutputFormat(expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--explain': {
				options.explain = true;
				break;
			}
			default:
				throw new Error(`Opción desconocida "${arg}" para el comando "search".`);
		}
	}

	if (!help && !options.query) {
		options.query = positionals.join(' ').trim();
	}

	return { options, help };
};

const ensureListDisplay = (options: ListCommandOptions) => {
	if (!options.display) options.display = {};
	return options.display;
};

const ensureDetailDisplay = (options: DetailCommandOptions) => {
	if (!options.display) options.display = {};
	return options.display;
};

const parseListCommandOptions = (args: string[]): ListCommandOptions => {
	const options: ListCommandOptions = {};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--') {
			throw new Error('El comando "list" no admite argumentos posicionales.');
		}

		if (!arg.startsWith('--')) {
			throw new Error(`Argumento no reconocido "${arg}". Usa "list --help" para más detalles.`);
		}

		switch (arg) {
			case '--kind': {
				const value = expectValue(args, index, arg);
				options.cardKind = parseCardKind(value);
				index += 1;
				break;
			}
			case '--type': {
				const value = expectValue(args, index, arg);
				if (!options.types) options.types = [];
				options.types.push(value);
				index += 1;
				break;
			}
			case '--tag': {
				const value = expectValue(args, index, arg);
				if (!options.tagsAll) options.tagsAll = [];
				options.tagsAll.push(value);
				index += 1;
				break;
			}
			case '--any-tag': {
				const value = expectValue(args, index, arg);
				if (!options.tagsAny) options.tagsAny = [];
				options.tagsAny.push(value);
				index += 1;
				break;
			}
			case '--not-tag': {
				const value = expectValue(args, index, arg);
				if (!options.tagsExclude) options.tagsExclude = [];
				options.tagsExclude.push(value);
				index += 1;
				break;
			}
			case '--require': {
				const value = expectValue(args, index, arg);
				if (!options.requirementsIncludes) options.requirementsIncludes = [];
				options.requirementsIncludes.push(value);
				index += 1;
				break;
			}
			case '--name': {
				const value = expectValue(args, index, arg);
				options.nameIncludes = value;
				index += 1;
				break;
			}
			case '--slug': {
				const value = expectValue(args, index, arg);
				options.slugIncludes = value;
				index += 1;
				break;
			}
			case '--level': {
				const value = parseInteger(arg, expectValue(args, index, arg));
				if (!options.levels) options.levels = [];
				options.levels.push(value);
				index += 1;
				break;
			}
			case '--levels': {
				const raw = expectValue(args, index, arg);
				const parsed = parseLevelsValue(arg, raw);
				if (!options.levels) options.levels = [];
				options.levels.push(...parsed);
				index += 1;
				break;
			}
			case '--min-level': {
				options.minLevel = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--max-level': {
				options.maxLevel = parseInteger(arg, expectValue(args, index, arg));
				index += 1;
				break;
			}
			case '--sort': {
				const value = expectValue(args, index, arg);
				options.sortBy = parseSortMode(value);
				index += 1;
				break;
			}
			case '--title': {
				const value = expectValue(args, index, arg);
				options.title = value;
				index += 1;
				break;
			}
			case '--empty-message': {
				const value = expectValue(args, index, arg);
				options.emptyMessage = value;
				index += 1;
				break;
			}
			case '--no-kind-label': {
				ensureListDisplay(options).includeKindLabel = false;
				break;
			}
			case '--include-kind-label': {
				ensureListDisplay(options).includeKindLabel = true;
				break;
			}
			case '--show-id': {
				ensureListDisplay(options).showId = true;
				break;
			}
			case '--show-slug': {
				ensureListDisplay(options).showSlug = true;
				break;
			}
			case '--no-align': {
				ensureListDisplay(options).alignColumns = false;
				break;
			}
			case '--align': {
				ensureListDisplay(options).alignColumns = true;
				break;
			}
			default:
				throw new Error(`Opción desconocida "${arg}" para el comando "list".`);
		}
	}

	return options;
};

const parseDetailCommandOptions = (args: string[]): DetailCommandOptions => {
	const options: DetailCommandOptions = { identifier: '' };
	let identifier: string | null = null;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--') {
			if (identifier !== null) {
				throw new Error('Solo se permite un identificador para el comando "detail".');
			}
			const value = args
				.slice(index + 1)
				.join(' ')
				.trim();
			if (!value) {
				throw new Error('Debes proporcionar un identificador después de "--".');
			}
			identifier = value;
			break;
		}

		if (!arg.startsWith('--')) {
			if (identifier !== null) {
				throw new Error(`Se recibió un segundo identificador "${arg}". Solo se admite uno.`);
			}
			identifier = arg;
			continue;
		}

		switch (arg) {
			case '--kind': {
				const value = expectValue(args, index, arg);
				options.cardKind = parseCardKind(value);
				index += 1;
				break;
			}
			case '--show-id': {
				ensureDetailDisplay(options).showId = true;
				break;
			}
			case '--no-id':
			case '--hide-id': {
				ensureDetailDisplay(options).showId = false;
				break;
			}
			case '--show-slug': {
				ensureDetailDisplay(options).showSlug = true;
				break;
			}
			case '--no-slug':
			case '--hide-slug': {
				ensureDetailDisplay(options).showSlug = false;
				break;
			}
			case '--no-description':
			case '--hide-description': {
				ensureDetailDisplay(options).showDescription = false;
				break;
			}
			case '--no-requirements':
			case '--hide-requirements': {
				ensureDetailDisplay(options).showRequirements = false;
				break;
			}
			case '--no-tags':
			case '--hide-tags': {
				ensureDetailDisplay(options).showTags = false;
				break;
			}
			case '--no-uses':
			case '--hide-uses': {
				ensureDetailDisplay(options).showUses = false;
				break;
			}
			case '--no-cost':
			case '--hide-cost': {
				ensureDetailDisplay(options).showCost = false;
				break;
			}
			default:
				throw new Error(`Opción desconocida "${arg}" para el comando "detail".`);
		}
	}

	if (!identifier) {
		throw new Error('Debes proporcionar el identificador de la carta (id, slug o nombre).');
	}

	options.identifier = identifier;
	return options;
};

export const printCliUsage = (): void => {
	const usage = `
Comandos soportados:
  list [opciones]            Lista cartas de habilidades u objetos mágicos.
  detail <id|slug|nombre>    Muestra el detalle de una carta específica.
  search [opciones]          Busca de forma global en el índice de contenido.

Opciones para "search":
  --query <texto>            Término o frase a buscar (también se acepta posicional).
  --kind <tipo>              Filtra por familia: chapter|card|item|creature|section|any.
  --source <etiqueta>        Filtra por fuente: player.md|gm.md|cards.yml|magical-items.yml|bestiary.yml.
  --level <n>                Filtra por nivel(es) exacto(s); repetible (p. ej. --level 2 --level 3).
  --min-level <n>            Nivel mínimo.
  --max-level <n>            Nivel máximo.
  --tier <n>                 Filtra criaturas por rango (tier).
  --tag <etiqueta>           Requiere etiquetas (repetible).
  --type <valor>             Filtro best-effort sobre etiquetas; el índice v3 expone structured.type (repetible).
  --lineage <valor>          Filtro best-effort sobre etiquetas; el índice v3 expone structured.lineage.
  --limit <n>                Máximo de resultados.
  --format <json|text>       Formato de salida (por defecto json).
  --explain                  Incluye score/campos/match para tests y mantenimiento.
  --help                     Muestra esta ayuda de "search".

Opciones para "list":
  --kind <ability|item|any>        Limita el tipo de carta.
  --type <valor>                   Filtra por el campo "type" de la carta (repetible).
  --tag <etiqueta>                 Requiere etiquetas específicas (repetible).
  --any-tag <etiqueta>             Coincide con alguna etiqueta (repetible).
  --not-tag <etiqueta>             Excluye etiquetas (repetible).
  --require <texto>                Busca texto en los requisitos (repetible).
  --name <texto>                   Busca en el nombre.
  --slug <texto>                   Busca en el slug.
  --level <n> / --levels <a,b,c>   Filtra por niveles concretos.
  --min-level <n> / --max-level <n>Define un rango de niveles.
  --sort <name|level>              Ordena por nombre o nivel.
  --title <texto>                  Personaliza el título del listado.
  --empty-message <texto>          Mensaje si no hay resultados.
  --no-kind-label                  Oculta la etiqueta de tipo en el listado.
  --show-id / --show-slug          Muestra columnas adicionales.
  --no-align                       Evita el alineado en columnas.

Opciones para "detail":
  --kind <ability|item|any>        Limita la búsqueda a un conjunto de cartas.
  --no-id / --hide-id              Oculta el identificador.
  --no-slug / --hide-slug          Oculta el slug.
  --no-description                Oculta la descripción.
  --no-requirements               Oculta los requisitos.
  --no-tags                       Oculta las etiquetas.
  --no-uses                       Oculta la información de usos.
  --no-cost                       Oculta el costo (solo objetos).
`.trim();

	console.log(usage);
};

export const printSearchUsage = (): void => {
	const usage = `
Comando "search":
  Busca de forma global en el content-index.json y devuelve referencias ordenadas
  y accionables para que un agente abra la primera fuente y, si no sirve, continúe
  con la siguiente sin repetir la consulta.

Uso:
  search --query <texto> [opciones]

Opciones:
  --query <texto>            Término o frase a buscar (también se acepta posicional).
  --kind <tipo>              chapter|card|item|creature|section|any.
  --source <etiqueta>        player.md|gm.md|cards.yml|magical-items.yml|bestiary.yml.
  --level <n>                Nivel(es) exacto(s); repetible (--level 2 --level 3).
  --min-level <n> / --max-level <n>   Rango de niveles.
  --tier <n>                 Rango de criatura (tier).
  --tag <etiqueta>           Requiere etiquetas (repetible).
  --type <valor>             Filtro best-effort sobre etiquetas; el índice v3 expone structured.type.
  --lineage <valor>          Filtro best-effort sobre etiquetas; el índice v3 expone structured.lineage.
  --limit <n>                Máximo de resultados.
  --format <json|text>       Formato de salida (por defecto json).
  --explain                  Incluye score/campos/match para tests y mantenimiento.

Estados: found, ambiguous, not_found, invalid_query.
`.trim();

	console.log(usage);
};

export const isCardsCliCommand = (command: string | undefined): boolean => {
	if (!command) return false;
	return SUPPORTED_COMMANDS.has(command);
};

export const runCardsCliCommand = async (command: string, args: string[]): Promise<void> => {
	try {
		switch (command) {
			case 'list': {
				const options = parseListCommandOptions(args);
				const dataset = loadCardsDataset();
				const output = listCards(dataset, options);
				console.log(output);
				break;
			}
			case 'detail': {
				const options = parseDetailCommandOptions(args);
				const dataset = loadCardsDataset();
				const output = showCardDetail(dataset, options);
				console.log(output);
				break;
			}
			case 'search': {
				const { options, help } = parseSearchCommandArgs(args);
				if (help) {
					printSearchUsage();
					break;
				}
				const output = runSearch(options);
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
