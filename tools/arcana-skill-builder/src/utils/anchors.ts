/**
 * Deterministic GFM heading anchors.
 *
 * The web app renders manual/bestiary markdown with `marked-gfm-heading-id`
 * (prefix "") backed by `github-slugger`, so every heading receives an `id`
 * attribute computed as slug(rendered text). The builder reproduces that rule
 * here — single source of truth — so the `path#anchor` references emitted by
 * the content index resolve to the same section the app renders.
 *
 * The rule is pinned by parity tests against examples verified with the real
 * renderer over the full real heading corpus (156/156 matches).
 *
 * The removal regex and the entity unescape mirror the vendored sources of
 * github-slugger (MIT) and marked-gfm-heading-id, which enable the same
 * rules for the same reasons (control characters and class-escaping are
 * intentional for byte-level parity).
 */
/* eslint-disable no-control-regex, no-useless-escape */

// Removal class replicating github-slugger's generated regex for the practical
// character set of this repo (Spanish/Latin content): control chars, ASCII
// punctuation except "-" and "_", Latin-1 symbols, general punctuation, dashes
// and common symbol ranges. Accented letters, digits, letters, spaces, "-" and
// "_" are preserved — exactly like github-slugger.
const GFM_HEADING_REMOVE_RE =
	/[\0-\x1F!-,\.\/:-@\[-\^`\{-\xA9\xAB-\xB4\xB6-\xB9\xBB-\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u1FFD-\u203E\u2041-\u2053\u2055-\u2070\u2072-\u207E\u2080-\u208F\u209D-\u20CF\u20F1-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F-\u215F\u2189-\u24B5\u24EA-\u2BFF\u2C2F\u2C5F\u2E00-\u2E2E\u2E30-\u3004\u3008-\u3020\u3030\u3036\u3037\u303D-\u3040\u309B\u309C\u30A0\u30FB\u3100-\u3104\u3130\uFE10-\uFE1F\uFE30-\uFE32\uFE35-\uFE4C\uFE50-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF3E\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]/gu;

/**
 * Port of `marked-gfm-heading-id`'s unescape: numeric entities become their
 * character, named entities collapse to "" (":": stays ":"), matching the
 * plugin's behavior on rendered inline text.
 */
export const unescapeHeadingEntities = (html: string): string =>
	html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi, (_match, entity: string) => {
		const name = entity.toLowerCase();
		if (name === 'colon') return ':';
		if (name.charAt(0) === '#') {
			return name.charAt(1) === 'x'
				? String.fromCharCode(parseInt(name.substring(2), 16))
				: String.fromCharCode(+name.substring(1));
		}
		return '';
	});

/**
 * Plain, markup-free heading text as the app's renderer sees it (inline
 * markdown rendered to HTML and then tag-stripped).
 */
export const headingTextOf = (raw: string): string =>
	unescapeHeadingEntities(
		raw
			.replace(/`([^`]*)`/g, '$1')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/<[!\/a-z][^>]*>/gi, '')
			.trim(),
	);

/** Single-shot anchor for a heading text (no duplicate tracking). */
export const gfmHeadingAnchor = (text: string): string =>
	text.toLowerCase().replace(GFM_HEADING_REMOVE_RE, '').replace(/ /g, '-');

/**
 * Per-document anchor tracker replicating github-slugger's `GithubSlugger`
 * occurrence logic: repeated anchors (case-insensitive) get `-1`, `-2`, ...
 * suffixes exactly as the app renders them for a single resource.
 */
export class HeadingIds {
	private readonly occurrences = new Map<string, number>();

	anchor(text: string): string {
		const original = gfmHeadingAnchor(text);
		let result = original;
		while (this.occurrences.has(result)) {
			this.occurrences.set(original, (this.occurrences.get(original) ?? 0) + 1);
			result = `${original}-${this.occurrences.get(original)}`;
		}
		this.occurrences.set(result, 0);
		return result;
	}
}
