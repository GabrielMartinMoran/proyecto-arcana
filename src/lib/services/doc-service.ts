import { marked } from 'marked';

export const loadMarkdownDocument = async (path: string) => {
	const res = await fetch(path); // Assuming your markdown files are in the static directory or served via an endpoint
	const markdownContent = await res.text();

	return marked.parse(markdownContent);
};
