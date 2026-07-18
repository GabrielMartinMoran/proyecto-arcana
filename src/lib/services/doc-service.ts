import { asset } from '$app/paths';
import { Marked } from 'marked';
import { gfmHeadingId, getHeadingList, resetHeadings } from 'marked-gfm-heading-id';

export type MarkdownHeading = {
	level: number;
	text: string;
	id: string;
};

export type MarkdownDocument = {
	html: string;
	headings: MarkdownHeading[];
};

const buildManualMarked = (): Marked =>
	new Marked(
		gfmHeadingId({
			prefix: '',
		}),
	);

export const loadMarkdownDocument = async (path: string): Promise<MarkdownDocument> => {
	const staticPath = `/${path}`.replaceAll('//', '/');
	const res = await fetch(asset(staticPath));
	const markdownContent = await res.text();

	const manualMarked = buildManualMarked();
	const html = manualMarked.parse(markdownContent) as string;
	const headings: MarkdownHeading[] = getHeadingList().map(({ level, text, id }) => ({
		level,
		text,
		id,
	}));
	resetHeadings();

	return { html, headings };
};
