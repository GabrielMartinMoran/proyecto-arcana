import type { CardGroup, ItemGroup } from '../processors/cards-processor.js';
import {
	deriveChapterHeadings,
	type Chapter,
	type ChapterSection,
} from '../processors/manual-processor.js';
import { deriveCreatureAnchors, type TierGroup } from '../processors/bestiary-processor.js';
import type { Card } from '../types/card.js';
import {
	buildContentEntryHash,
	CONTENT_INDEX_SCHEMA_VERSION,
	CONTENT_INDEX_STRUCTURED_KEYS,
	CONTENT_KINDS,
	sortContentIndexEntries,
	type ContentIndex,
	type ContentIndexEntry,
	type ContentIndexStructured,
	type ContentIndexStructuredKey,
} from '../types/content-index.js';
import type { Creature } from '../types/creature.js';
import { gfmHeadingAnchor } from '../utils/anchors.js';
import { slugify } from '../utils/formatting.js';

/**
 * Deterministic content-index generation and integrity validation.
 *
 * The builder derives entries exclusively from existing loaders/processors data
 * and mirrors the resource output conventions fixed in the resource builders, so
 * it never invents references and never depends on LLM or network access.
 */

export const REFERENCES_BASE = 'references';
export const CARD_LINK_BASE = `${REFERENCES_BASE}/cartas-de-habilidades`;
export const ITEM_LINK_BASE = `${REFERENCES_BASE}/objetos-magicos`;
export const BESTIARY_LINK_BASE = `${REFERENCES_BASE}/bestiario`;

/** Safe aliases derived only from the canonical name (diacritics-free, lowercased). */
export const deriveSafeAliases = (canonicalName: string): string[] => {
	const normalized = canonicalName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
	return normalized ? [normalized] : [];
};

const sortedTags = (tags: string[]): string[] => [...tags].sort((a, b) => a.localeCompare(b, 'es'));

/** Trims a value and returns `undefined` when it is empty (stable for JSON/hash). */
const trimNonEmpty = (value: string | null | undefined): string | undefined => {
	const trimmed = (value ?? '').trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

type UsesSource = { qty: number | null; type: string | null } | undefined | null;

/** Serializes non-empty card/item uses (e.g. "DAY:1") as a deterministic filter string. */
const serializeUses = (uses: UsesSource): string | undefined => {
	if (!uses) return undefined;
	const type = typeof uses.type === 'string' ? uses.type.trim() : '';
	if (
		type.length === 0 ||
		typeof uses.qty !== 'number' ||
		!Number.isFinite(uses.qty) ||
		uses.qty <= 0
	) {
		return undefined;
	}
	return `${type}:${uses.qty}`;
};

/** Item purchase cost, normalized to a stable string when the source defines it. */
const toStructuredCost = (item: Card): string | undefined => {
	const cost = (item as { cost?: unknown }).cost;
	if (cost === undefined || cost === null) return undefined;
	if (typeof cost === 'string') return trimNonEmpty(cost);
	if (typeof cost === 'number' && Number.isFinite(cost)) return String(cost);
	return undefined;
};

/** Structured filter fields derived only from authored card data (schema v3). */
const buildCardStructured = (card: Card): ContentIndexStructured => ({
	cardType: card.cardType,
	type: card.type,
	requirements: trimNonEmpty(card.requirements),
	uses: serializeUses(card.uses),
});

/** Item structured fields = card fields plus the authored cost. */
const buildItemStructured = (item: Card): ContentIndexStructured => ({
	...buildCardStructured(item),
	cost: toStructuredCost(item),
});

const buildCreatureStructured = (creature: Creature): ContentIndexStructured => ({
	lineage: trimNonEmpty(creature.lineage),
});

/** Searchable body of a card/item: its real description (schema v3). */
const cardSearchText = (card: Card): string | undefined => trimNonEmpty(card.description);

/**
 * Searchable body of a creature: the authored feature text. Only real source
 * data is used (lineage, traits, attacks, actions, reactions, interactions and
 * behavior); no labels or summaries are invented.
 */
const creatureSearchText = (creature: Creature): string | undefined => {
	const parts: string[] = [];
	if (trimNonEmpty(creature.lineage)) parts.push(creature.lineage);
	for (const trait of creature.traits) parts.push(`${trait.name}: ${trait.detail}`);
	for (const attack of creature.attacks) {
		const note = trimNonEmpty(attack.note) ? ` (${attack.note})` : '';
		parts.push(`${attack.name}: ${attack.damage}${note}`);
	}
	for (const action of creature.actions) parts.push(`${action.name}: ${action.detail}`);
	for (const reaction of creature.reactions) parts.push(`${reaction.name}: ${reaction.detail}`);
	for (const interaction of creature.interactions) {
		parts.push(`${interaction.name}: ${interaction.detail}`);
	}
	if (trimNonEmpty(creature.behavior)) parts.push(creature.behavior);
	return parts.length > 0 ? parts.join('\n') : undefined;
};

/** Relative resource path mirroring the arquetipo output convention in cards-builder. */
export const cardGroupRelPath = (
	group: CardGroup,
	arquetipoFamilySlugs: ReadonlySet<string>,
): string => {
	const useArquetipoFamily = arquetipoFamilySlugs.has(group.tagSlug);
	const fileName = group.isArquetipo ? `arquetipo-${group.filename}` : group.filename;
	const segments = useArquetipoFamily
		? [CARD_LINK_BASE, 'arquetipos', group.tagSlug, fileName]
		: [CARD_LINK_BASE, group.tagSlug, fileName];
	return segments.join('/');
};

export const itemGroupRelPath = (group: ItemGroup): string => `${ITEM_LINK_BASE}/${group.filename}`;

export const tierGroupRelPath = (group: TierGroup): string =>
	`${BESTIARY_LINK_BASE}/${group.filename}`;

export const chapterRelPath = (chapter: Chapter, dir: string): string =>
	`${REFERENCES_BASE}/${dir}/${chapter.filename}`;

/** Attaches the deterministic content hash to a plain entry payload. */
const withHash = <T extends Omit<ContentIndexEntry, 'hash'>>(entry: T): T & { hash: string } => ({
	...entry,
	hash: buildContentEntryHash(entry),
});

export const buildCardEntry = (card: Card, path: string, source: string): ContentIndexEntry => {
	return withHash({
		kind: 'card',
		canonicalName: card.name,
		id: card.id,
		slug: card.slug ?? slugify(card.name),
		aliases: deriveSafeAliases(card.name),
		tags: sortedTags(card.tags),
		level: card.level,
		path,
		source,
		structured: buildCardStructured(card),
		search: cardSearchText(card),
	});
};

export const buildItemEntry = (item: Card, path: string, source: string): ContentIndexEntry => {
	return withHash({
		kind: 'item',
		canonicalName: item.name,
		id: item.id,
		slug: item.slug ?? slugify(item.name),
		aliases: deriveSafeAliases(item.name),
		tags: sortedTags(item.tags),
		level: item.level,
		path,
		source,
		structured: buildItemStructured(item),
		search: cardSearchText(item),
	});
};

export const buildCreatureEntry = (
	creature: Creature,
	path: string,
	source: string,
	anchor?: string,
): ContentIndexEntry => {
	return withHash({
		kind: 'creature',
		canonicalName: creature.name,
		id: creature.id,
		slug: slugify(creature.name),
		aliases: deriveSafeAliases(creature.name),
		tags: [],
		level: creature.tier,
		path,
		heading: creature.name,
		anchor: anchor ?? gfmHeadingAnchor(creature.name),
		source,
		structured: buildCreatureStructured(creature),
		search: creatureSearchText(creature),
	});
};

export const buildChapterEntry = (
	chapter: Chapter,
	dir: string,
	source: string,
): ContentIndexEntry => {
	const { anchor } = deriveChapterHeadings(chapter);
	return withHash({
		kind: 'chapter',
		canonicalName: chapter.title,
		slug: chapter.slug,
		aliases: deriveSafeAliases(chapter.title),
		tags: [],
		path: chapterRelPath(chapter, dir),
		heading: chapter.title,
		anchor,
		source,
	});
};

/**
 * Slug of a section entry: unique within its chapter and across the index.
 * Repeated identical titles (or titles that slugify identically) within the
 * same chapter get a "-1", "-2", ... suffix, mirroring the anchor logic.
 * Runs of hyphens (e.g. from " - " separators) collapse so the slug always
 * matches the contract's single-hyphen pattern.
 */
const sectionSlug = (chapter: Chapter, section: ChapterSection, occurrence: number): string => {
	const titleSlug = slugify(section.title)
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!titleSlug) return '';
	const base = `${chapter.slug}-${titleSlug}`;
	return occurrence === 0 ? base : `${base}-${occurrence}`;
};

/**
 * Index entry for one manual sub-section, carrying the chapter it belongs to
 * so "Ventaja" resolves without the consumer guessing its chapter.
 */
export const buildSectionEntry = (
	section: ChapterSection,
	chapter: Chapter,
	dir: string,
	source: string,
	occurrence: number,
): ContentIndexEntry | null => {
	const slug = sectionSlug(chapter, section, occurrence);
	if (!slug) return null;
	return withHash({
		kind: 'section',
		canonicalName: section.title,
		slug,
		aliases: deriveSafeAliases(section.title),
		tags: [],
		path: chapterRelPath(chapter, dir),
		heading: section.title,
		anchor: section.anchor,
		chapter: chapter.title,
		source,
		search: trimNonEmpty(section.body),
	});
};

export interface ContentIndexInput {
	playerChapters: Chapter[];
	gmChapters: Chapter[];
	cardGroups: CardGroup[];
	itemGroups: ItemGroup[];
	creatureGroups: TierGroup[];
	playerDir: string;
	gmDir: string;
}

export const buildContentIndex = (input: ContentIndexInput): ContentIndex => {
	const arquetipoFamilySlugs = new Set(
		input.cardGroups.filter((group) => group.isArquetipo).map((group) => group.tagSlug),
	);

	const entries: ContentIndexEntry[] = [];

	const collectManualSections = (chapters: Chapter[], dir: string, source: string): void => {
		for (const chapter of chapters) {
			entries.push(buildChapterEntry(chapter, dir, source));
			const { sections } = deriveChapterHeadings(chapter);
			const occurrences = new Map<string, number>();
			for (const section of sections) {
				const titleSlug = slugify(section.title);
				const occurrence = occurrences.get(titleSlug) ?? 0;
				occurrences.set(titleSlug, occurrence + 1);
				const record = buildSectionEntry(section, chapter, dir, source, occurrence);
				if (record) entries.push(record);
			}
		}
	};

	collectManualSections(input.playerChapters, input.playerDir, 'player.md');
	collectManualSections(input.gmChapters, input.gmDir, 'gm.md');

	for (const group of input.cardGroups) {
		const groupPath = cardGroupRelPath(group, arquetipoFamilySlugs);
		for (const card of group.cards) {
			entries.push(buildCardEntry(card, groupPath, 'cards.yml'));
		}
	}
	for (const group of input.itemGroups) {
		const groupPath = itemGroupRelPath(group);
		for (const item of group.cards) {
			entries.push(buildItemEntry(item, groupPath, 'magical-items.yml'));
		}
	}
	for (const group of input.creatureGroups) {
		const groupPath = tierGroupRelPath(group);
		const anchors = deriveCreatureAnchors(group);
		for (const creature of group.creatures) {
			entries.push(
				buildCreatureEntry(creature, groupPath, 'bestiary.yml', anchors.get(creature.id)),
			);
		}
	}

	return {
		schemaVersion: CONTENT_INDEX_SCHEMA_VERSION,
		entries: sortContentIndexEntries(entries),
	};
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isPathTraversal = (pathValue: string): boolean => {
	if (pathValue.startsWith('/')) return true;
	if (/^[a-zA-Z]:[\\/]/.test(pathValue)) return true;
	return pathValue.split('/').includes('..') || pathValue.includes('\\');
};

export interface ContentIndexValidationOptions {
	/** Optional resolver to verify that each referenced relative path exists. */
	pathExists?: (relativePath: string) => boolean | Promise<boolean>;
}

/** Integrity validation: structure, slugs, paths, deterministic hashes and duplicates. */
export const validateContentIndex = async (
	index: ContentIndex,
	options: ContentIndexValidationOptions = {},
): Promise<string[]> => {
	const issues: string[] = [];

	if (index.schemaVersion !== CONTENT_INDEX_SCHEMA_VERSION) {
		issues.push(
			`schemaVersion must be ${CONTENT_INDEX_SCHEMA_VERSION}, got ${index.schemaVersion}`,
		);
	}
	if (!Array.isArray(index.entries)) {
		issues.push('entries must be an array');
		return issues;
	}

	const seen = new Set<string>();
	for (let i = 0; i < index.entries.length; i++) {
		const entry = index.entries[i];
		const label = `entries[${i}]`;

		if (!CONTENT_KINDS.includes(entry.kind)) {
			issues.push(`${label}: invalid kind "${entry.kind}"`);
		}
		if (typeof entry.canonicalName !== 'string' || entry.canonicalName.length === 0) {
			issues.push(`${label}: canonicalName is required`);
		}
		if (typeof entry.slug !== 'string' || !SLUG_PATTERN.test(entry.slug)) {
			issues.push(`${label}: invalid slug "${entry.slug}"`);
		}
		if (!Array.isArray(entry.aliases) || entry.aliases.some((alias) => typeof alias !== 'string')) {
			issues.push(`${label}: aliases must be an array of strings`);
		}
		if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== 'string')) {
			issues.push(`${label}: tags must be an array of strings`);
		}
		if (typeof entry.path !== 'string' || entry.path.length === 0 || isPathTraversal(entry.path)) {
			issues.push(`${label}: invalid path "${entry.path}"`);
		}
		if (typeof entry.source !== 'string' || entry.source.length === 0) {
			issues.push(`${label}: source is required`);
		}
		if (typeof entry.hash !== 'string' || entry.hash.length !== 40) {
			issues.push(`${label}: invalid hash "${entry.hash}"`);
		}

		// v3 structured fields: an optional object using only known keys with
		// string (or numeric cost) values.
		if (entry.structured !== undefined) {
			if (
				entry.structured === null ||
				typeof entry.structured !== 'object' ||
				Array.isArray(entry.structured)
			) {
				issues.push(`${label}: structured must be an object`);
			} else {
				for (const key of Object.keys(entry.structured)) {
					if (!CONTENT_INDEX_STRUCTURED_KEYS.includes(key as ContentIndexStructuredKey)) {
						issues.push(`${label}: invalid structured key "${key}"`);
					}
				}
				for (const [key, value] of Object.entries(entry.structured)) {
					// `undefined` values are omitted from the canonical payload
					// (JSON.stringify drops them), so they are not structured data.
					if (value === undefined) continue;
					if (typeof value !== 'string' && !(key === 'cost' && typeof value === 'number')) {
						issues.push(
							`${label}: structured.${key} must be a string${key === 'cost' ? ' or number' : ''}`,
						);
					}
				}
			}
		}
		// v3 search body: optional, but when present it must be real, non-empty text.
		if (entry.search !== undefined) {
			if (typeof entry.search !== 'string' || entry.search.trim().length === 0) {
				issues.push(`${label}: search must be a non-empty string when present`);
			}
		}

		// Exclude the hash itself from the canonical payload it was derived from.
		const { hash: _hash, ...payload } = entry;
		if (buildContentEntryHash(payload) !== entry.hash) {
			issues.push(`${label}: hash does not match canonical payload`);
		}

		const key = `${entry.kind}:${entry.slug}`;
		if (seen.has(key)) {
			issues.push(`${label}: duplicate kind:slug "${key}"`);
		}
		seen.add(key);

		if (options.pathExists && entry.path) {
			let exists = false;
			try {
				exists = await options.pathExists(entry.path);
			} catch {
				exists = false;
			}
			if (!exists) {
				issues.push(`${label}: referenced path does not exist: ${entry.path}`);
			}
		}
	}

	return issues;
};

const SECRET_PATTERNS: RegExp[] = [
	/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g,
	/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
	/(?:OPENAI|ANTHROPIC|ANYSCALE|GEMINI|DEEPSEEK|AZURE_)[A-Z_]*KEY\s*[:=]\s*\S+/gi,
	/-----BEGIN [A-Z0-9 ]+ PRIVATE KEY-----/g,
];

/** Scans generated output/log text for known secret markers; returns matches. */
export const scanForSecretLeaks = (text: string): string[] => {
	const leaks = new Set<string>();
	for (const pattern of SECRET_PATTERNS) {
		for (const match of text.matchAll(pattern)) {
			leaks.add(match[0]);
		}
	}
	return [...leaks];
};
