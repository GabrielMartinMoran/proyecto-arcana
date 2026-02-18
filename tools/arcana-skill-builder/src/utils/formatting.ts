export const removeDiacritics = (str: string): string => {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const slugify = (text: string): string =>
	removeDiacritics(text)
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
