import DOMPurify from 'dompurify';
import { marked } from 'marked';

const hasBrowserDom = (): boolean => typeof window !== 'undefined';

const escapeHtml = (text: string): string =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

/**
 * Renders a card description Markdown source into safe HTML for `{@html}`.
 *
 * In a browser the marked output is sanitized by DOMPurify. When no `window`
 * is available the marked output is entity-escaped, so hostile markup can
 * never become executable HTML in that environment.
 */
export const sanitizeCardDescriptionMarkdown = (markdown: string): string => {
	const html = marked.parse(markdown) as string;

	return hasBrowserDom() ? DOMPurify.sanitize(html) : escapeHtml(html);
};

/**
 * Returns the inner content of `html` when it is exactly one outer
 * `<p>...</p>` (allowing trailing whitespace), otherwise returns `html`.
 *
 * Multi-block output (several paragraphs, lists, headings) must keep its
 * wrappers: flattening them would lose the intended block structure.
 */
const unwrapSingleParagraph = (html: string): string => {
	const trimmed = html.replace(/\s+$/, '');
	const match = /^<p>([\s\S]*)<\/p>$/.exec(trimmed);

	if (!match) return html;
	if (/<p\b|<\/p>/i.test(match[1])) return html;

	return match[1];
};

/**
 * Renders a card description Markdown source into safe inline HTML.
 *
 * Reuses the exact `sanitizeCardDescriptionMarkdown` pipeline, then unwraps
 * only the outer paragraph of a single-paragraph output so interleaved inline
 * elements (such as roll buttons) flow in the same line as the prose instead
 * of starting new block lines.
 */
export const sanitizeCardDescriptionMarkdownInline = (markdown: string): string =>
	unwrapSingleParagraph(sanitizeCardDescriptionMarkdown(markdown));
