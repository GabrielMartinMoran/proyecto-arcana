/**
 * Reusable Markdown serializer for notes.
 *
 * This utility renders notes (title + content) into Markdown blocks that can be
 * reused across Character and Party "See as MD" features.
 *
 * The default structure:
 * - Optional header (## {headerTitle})
 * - For each note:
 *   ### {note.title}
 *
 *   {note.content}
 *
 * Empty or invalid notes (no title and no content) are skipped.
 */

import type { Note } from '$lib/types/character';

type NoteLike = Pick<Note, 'id' | 'title' | 'content'>;

export type NotesMarkdownOptions = {
	/**
	 * Optional section header (e.g., "Notas", "Notas del Jugador").
	 * If omitted or empty, no header will be added.
	 */
	headerTitle?: string;
	/**
	 * If true, insert a blank line between notes to improve readability.
	 * Default: true
	 */
	blankLineBetweenNotes?: boolean;
	/**
	 * If true, returns a fallback text when there are no valid notes.
	 * Default: true
	 */
	showEmptyFallback?: boolean;
	/**
	 * Fallback text used when there are no valid notes and showEmptyFallback is true.
	 * Default: "__Sin notas.__"
	 */
	emptyFallbackText?: string;
};

/**
 * Render a single note as Markdown.
 * - Skips if both title and content are empty.
 */
export function renderNoteAsMarkdown(note: NoteLike): string {
	const title = toSafeLine(note?.title ?? '').trim();
	const content = toSafeMultiline(note?.content ?? '').trim();

	// Skip if both empty
	if (!title && !content) return '';

	let md = '';
	if (title) {
		md += `### ${title}\n\n`;
	}
	if (content) {
		// Content is rendered as-is (Markdown). Add a trailing newline for separation.
		md += `${content}\n`;
	}
	return md;
}

/**
 * Render an array of notes as Markdown with optional header and formatting options.
 */
export function renderNotesAsMarkdown(
	notes: NoteLike[] | null | undefined,
	options?: NotesMarkdownOptions,
): string {
	const {
		headerTitle = '',
		blankLineBetweenNotes = true,
		showEmptyFallback = true,
		emptyFallbackText = '__Sin notas.__',
	} = options ?? {};

	const valid = (Array.isArray(notes) ? notes : []).map(renderNoteAsMarkdown).filter(Boolean);

	let md = '';

	if (headerTitle && headerTitle.trim().length > 0) {
		md += `## ${toSafeLine(headerTitle)}\n\n`;
	}

	if (valid.length === 0) {
		if (showEmptyFallback) {
			md += `${emptyFallbackText}\n`;
		}
		return md;
	}

	for (let i = 0; i < valid.length; i++) {
		md += valid[i];
		// Ensure a blank line between notes if requested and not last
		if (blankLineBetweenNotes && i < valid.length - 1) {
			md += `\n`;
		}
	}

	// Always end with a newline for Markdown friendliness
	if (!md.endsWith('\n')) md += '\n';
	return md;
}

/* ----------------------- Internal helpers ----------------------- */

function toSafeLine(value: unknown): string {
	if (value == null) return '';
	const s = String(value);
	// Replace newlines to keep titles on a single line
	return s.replace(/\r?\n|\r/g, ' ').trim();
}

function toSafeMultiline(value: unknown): string {
	if (value == null) return '';
	return String(value);
}
