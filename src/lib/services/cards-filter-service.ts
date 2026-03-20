import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import type { CardFilters } from '$lib/types/card-filters';

export const useCardFiltersService = () => {
	const buildEmptyFilters = (
		{
			onlyAvailables,
		}: {
			onlyAvailables?: boolean;
		} = { onlyAvailables: undefined },
	): CardFilters => ({
		name: '',
		level: [],
		tags: [],
		type: '',
		onlyAvailables,
	});

	const getFiltersFromURL = (): CardFilters => {
		const name = page.url.searchParams.get('name') ?? '';
		const level = page.url.searchParams
			.getAll('level')
			.filter((tag) => tag !== '')
			.map(Number)
			.filter((x) => x > 0);
		const tags = page.url.searchParams.getAll('tags').filter((tag) => tag !== '');
		const type = page.url.searchParams.get('type') ?? '';

		return {
			name,
			level,
			tags,
			type,
		};
	};

	const updateURLFilters = (filters: CardFilters) => {
		if (filters.name) {
			page.url.searchParams.set('name', filters.name);
		} else {
			page.url.searchParams.delete('name');
		}

		if (filters.level.length === 0) {
			page.url.searchParams.delete('level');
		} else {
			page.url.searchParams.delete('level');
			filters.level.forEach((lvl) => page.url.searchParams.append('level', String(lvl)));
		}

		if (filters.tags.length === 0) {
			page.url.searchParams.delete('tags');
		} else {
			page.url.searchParams.delete('tags');
			filters.tags.forEach((tag) => page.url.searchParams.append('tags', tag));
		}

		if (!filters.type) {
			page.url.searchParams.delete('type');
		} else {
			page.url.searchParams.set('type', filters.type);
		}

		const queryParams = page.url.searchParams.toString();

		const newUrl = `${page.url.pathname}${queryParams ? `?${queryParams}` : ''}`;
		replaceState(newUrl, {});
	};

	return {
		buildEmptyFilters,
		getFiltersFromURL,
		updateURLFilters,
	};
};
