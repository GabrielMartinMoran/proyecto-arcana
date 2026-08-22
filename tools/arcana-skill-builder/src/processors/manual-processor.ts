import { HeadingIds, headingTextOf } from '../utils/anchors.js';
import { slugify } from '../utils/formatting.js';

export interface Chapter {
	index: number;
	title: string;
	slug: string;
	content: string;
	filename: string;
}

/** A sub-section of a chapter, with its unique anchor inside the chapter file. */
export interface ChapterSection {
	/** Markdown heading level (2..MAX_SECTION_HEADING_LEVEL when indexed). */
	level: number;
	/** Plain, markup-free heading text (what the app renders as the heading). */
	title: string;
	/** Deterministic GFM id of the heading inside the chapter document. */
	anchor: string;
	/**
	 * Raw markdown body between this section's heading and the next indexed
	 * heading (or the end of the chapter), trimmed. It keeps tables, lists and
	 * inline markup exactly as authored so the search index (schema v3) can
	 * score real evidence text. Empty when the section is immediately followed
	 * by another heading.
	 */
	body: string;
}

export interface ChapterHeadings {
	/** Anchor of the chapter H1 (e.g. "7-combate" for "# 7. Combate"). */
	anchor: string;
	/** Indexed sub-sections in document order, duplicates suffixed. */
	sections: ChapterSection[];
}

/** Headings deeper than this become part of the parent section, not new entries. */
export const MAX_SECTION_HEADING_LEVEL = 4;

const HEADING_LINE_RE = /^(#{1,6})\s+(.+)$/;

/**
 * Derives the chapter heading tree exactly as the app renders the chapter
 * file: every markdown heading consumes a per-document anchor occurrence, and
 * only levels 2..MAX_SECTION_HEADING_LEVEL become indexable sections. Each
 * section carries the raw markdown body up to the next indexed heading, which
 * is what the searchable index (schema v3) stores as real evidence text.
 */
export const deriveChapterHeadings = (chapter: Chapter): ChapterHeadings => {
	const ids = new HeadingIds();
	let chapterAnchor = '';
	const sections: ChapterSection[] = [];
	// Pending section whose body is being accumulated; null means "no body
	// belongs to a section right now" (before the first section or after H1).
	let pending: ChapterSection | null = null;
	let pendingLines: string[] = [];

	const flush = (): void => {
		if (pending) {
			sections.push({ ...pending, body: pendingLines.join('\n').trim() });
		}
		pending = null;
		pendingLines = [];
	};

	for (const line of chapter.content.split('\n')) {
		const match = HEADING_LINE_RE.exec(line);
		if (!match) {
			if (pending) pendingLines.push(line);
			continue;
		}
		const level = match[1].length;
		const title = headingTextOf(match[2]);
		const anchor = ids.anchor(title);
		if (level === 1) {
			// H1 is a chapter-level heading; nothing of it belongs to a section.
			flush();
			chapterAnchor = anchor;
		} else if (level <= MAX_SECTION_HEADING_LEVEL) {
			flush();
			pending = { level, title, anchor, body: '' };
		} else {
			// Deeper headings are not indexed entries; they stay inside the
			// current section's body so its evidence text is preserved.
			if (pending) pendingLines.push(line);
		}
	}
	flush();

	// Defensive fallback for decomposed sources (the real chapters always start
	// with their H1, which is what the resource builders write to disk).
	if (!chapterAnchor) {
		chapterAnchor = ids.anchor(chapter.title);
	}

	return { anchor: chapterAnchor, sections };
};

export const splitPlayerManual = (raw: string): Chapter[] => {
	const parts = raw.split(/(?=^# \d+\.)/m).filter((p) => /^# \d+\./.test(p.trim()));
	return parts.map((part) => {
		const firstLine = part.split('\n')[0].replace(/^# /, '').trim();
		const match = firstLine.match(/^(\d+)\.\s+(.+)/);
		const num = match ? parseInt(match[1]) : 0;
		const title = match ? match[2] : firstLine;
		const slug = `${String(num).padStart(2, '0')}-${slugify(title)}`;
		return { index: num, title: firstLine, slug, content: part.trim(), filename: `${slug}.md` };
	});
};

export const splitGMManual = (raw: string): Chapter[] => {
	const parts = raw.split(/(?=^# )/m).filter((p) => /^# [^\s]/.test(p.trim()));
	return parts.map((part, i) => {
		const firstLine = part.split('\n')[0].replace(/^# /, '').trim();
		const slug = `${String(i + 1).padStart(2, '0')}-${slugify(firstLine)}`;
		return { index: i + 1, title: firstLine, slug, content: part.trim(), filename: `${slug}.md` };
	});
};
