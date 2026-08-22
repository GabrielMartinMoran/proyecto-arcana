import crypto from 'crypto';

/**
 * Contract of the deterministic `content-index.json` artifact.
 *
 * The index is a stable, schema-versioned JSON document that lets callers (and
 * the future search router) resolve canonical entries by kind/slug/name without
 * loading every source document. The whole pipeline is deterministic: it never
 * uses timestamps for ordering, hashing or result generation, and it never
 * depends on LLM or network access.
 */

export const CONTENT_INDEX_SCHEMA_VERSION = 3 as const;

export const CONTENT_KINDS = ['chapter', 'card', 'item', 'creature', 'section'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/**
 * Optional structured filter fields (schema v3).
 *
 * Each key is only populated when the source actually defines that datum; the
 * builder never invents `family`/`archetype`/`lineage` from tags or grouping.
 * These values are meant to filter and help score the internal search index;
 * they are not part of the agent-facing projection.
 */
export const CONTENT_INDEX_STRUCTURED_KEYS = [
	'family',
	'archetype',
	'lineage',
	'cardType',
	'type',
	'cost',
	'requirements',
	'uses',
] as const;
export type ContentIndexStructuredKey = (typeof CONTENT_INDEX_STRUCTURED_KEYS)[number];

export interface ContentIndexStructured {
	/** Card/object family when the source defines one explicitly. */
	family?: string;
	/** Archetype label when the source defines one explicitly. */
	archetype?: string;
	/** Creature lineage (bestiary) when it exists. */
	lineage?: string;
	/** "ability" | "item" for cards (model field derived from the dataset). */
	cardType?: string;
	/** Authored card/item subtype (e.g. "efecto", "activable", "consumible"). */
	type?: string;
	/** Item purchase cost when the source defines one (string or finite number). */
	cost?: string | number;
	/** Card requirements text when the source defines one. */
	requirements?: string;
	/** Serialized non-empty card/item uses (e.g. "DAY:1") when it exists. */
	uses?: string;
}

export interface ContentIndexEntry {
	/** Family of the entry: manual chapter, manual section, card, item or creature. */
	kind: ContentKind;
	/** Canonical display name. Used for matching/citation. */
	canonicalName: string;
	/** Stable identifier when the source defines one (e.g. card/creature id). */
	id?: string;
	/** Canonical, URL-safe slug derived from source data (never an obsolete alias). */
	slug: string;
	/** Deterministic safe aliases derived only from canonical data. */
	aliases: string[];
	/** Tags/metadata copied from the source (sorted for determinism). */
	tags: string[];
	/** Numeric level or tier when the source defines one. */
	level?: number;
	/** Relative output path (forward slashes) of the resource containing the entry. */
	path: string;
	/** Heading/anchor inside the resource when it exists as real markup. */
	heading?: string;
	/** Deterministic GFM heading id of `heading` inside its resource (path#anchor). */
	anchor?: string;
	/** Chapter title that owns a "section" entry (manual sections only). */
	chapter?: string;
	/** Source dataset/document label, e.g. "cards.yml" or "player.md". */
	source: string;
	/**
	 * Optional structured filter fields (v3), present only when the source
	 * defines them. These are internal search metadata, not agent-facing data.
	 */
	structured?: ContentIndexStructured;
	/**
	 * Internal searchable body text (v3): real description/section/feature text
	 * that lives only in `content-index.json` so the CLI can score semantic
	 * queries against it. It is never returned to the agent by default.
	 */
	search?: string;
	/** Deterministic sha1 over the canonical payload of the entry, excluding itself. */
	hash: string;
}

export interface ContentIndex {
	schemaVersion: number;
	entries: ContentIndexEntry[];
}

/** Recursively sorts object keys to produce a stable serialization. */
const sortValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(sortValue);
	}
	if (value !== null && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.keys(record)
				.sort()
				.map((key) => [key, sortValue(record[key])]),
		);
	}
	return value;
};

/** Canonical JSON serialization: key order and whitespace do not affect the result. */
export const canonicalSerialize = (value: unknown): string => JSON.stringify(sortValue(value));

/** Deterministic content hash of an entry payload (independent of key order). */
export const buildContentEntryHash = (entry: Omit<ContentIndexEntry, 'hash'>): string => {
	return crypto.createHash('sha1').update(canonicalSerialize(entry)).digest('hex');
};

/** Stable ordering: kind, then canonical name, then slug. */
export const sortContentIndexEntries = (entries: ContentIndexEntry[]): ContentIndexEntry[] => {
	return [...entries].sort((a, b) => {
		const byKind = a.kind.localeCompare(b.kind, 'en');
		if (byKind !== 0) return byKind;
		const byName = a.canonicalName.localeCompare(b.canonicalName, 'es', {
			sensitivity: 'base',
		});
		if (byName !== 0) return byName;
		return a.slug.localeCompare(b.slug, 'en');
	});
};

/** Stable, timestamp-free serialization of the full index document. */
export const serializeContentIndex = (index: ContentIndex): string =>
	`${JSON.stringify(index, null, 2)}\n`;
