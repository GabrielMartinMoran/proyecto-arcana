import { asset } from '$app/paths';
import { marked } from 'marked';

export const loadMarkdownDocument = async (path: string) => {
	const staticPath = `/${path}`.replaceAll('//', '/');
	const res = await fetch(asset(staticPath));
	const markdownContent = await res.text();

	return marked.parse(markdownContent);
};
