<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import BestiaryFilter from '$lib/components/bestiary/BestiaryFilter.svelte';
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import { useCreaturesService } from '$lib/services/creatures-service';
	import { removeDiacritics } from '$lib/utils/formatting';
	import { onMount } from 'svelte';

	const { loadCreatures, creatures } = useCreaturesService();

	// Filters initialized from URL
	let nameFilter: string = $state(page.url.searchParams.get('name') ?? '');
	let tierFilter: string = $state(page.url.searchParams.get('tier') ?? '');

	// Available tiers for selector (sorted ascending)
	let availableTiers: number[] = $derived(
		Array.from(new Set(($creatures || []).map((c) => c.tier))).sort((a, b) => a - b),
	);

	// Apply filters
	let filteredCreatures = $derived(
		($creatures || []).filter((c) => {
			const nf = removeDiacritics((nameFilter || '').toLowerCase().trim());
			const nameOk = removeDiacritics(c.name.toLowerCase()).includes(nf);
			const tierOk = !tierFilter || parseInt(tierFilter) === c.tier;
			return nameOk && tierOk;
		}),
	);

	onMount(async () => {
		await loadCreatures();
	});

	// Sync query params when filters change
	$effect(() => {
		// Clone current params to avoid mutating the reactive source directly
		const params = new URLSearchParams(page.url.searchParams);

		const trimmedName = (nameFilter || '').trim();
		const trimmedTier = (tierFilter || '').trim();

		if (trimmedName) {
			params.set('name', trimmedName);
		} else {
			params.delete('name');
		}

		if (trimmedTier) {
			params.set('tier', trimmedTier);
		} else {
			params.delete('tier');
		}

		const current = page.url.searchParams.toString();
		const next = params.toString();

		// Avoid navigation if there's no effective change
		if (current === next) return;

		// Update URL without navigation to preserve input focus
		const newUrl = `${page.url.pathname}${next ? `?${next}` : ''}`;
		replaceState(newUrl, {});
	});

	const resetFilters = () => {
		nameFilter = '';
		tierFilter = '';
		// URL updates through the effect above
	};
</script>

<section>
	<h1>Bestiario</h1>

	<BestiaryFilter
		creatures={$creatures}
		filters={{ name: nameFilter, tier: tierFilter }}
		onFiltersChange={(f) => {
			nameFilter = f.name;
			tierFilter = f.tier;
		}}
		onResetFilters={resetFilters}
	/>

	<div class="statblock-list">
		{#each filteredCreatures as creature (creature.id)}
			<Statblock {creature} />
		{/each}
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		flex-grow: 1;
		justify-content: center;
		width: 100%;

		.statblock-list {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-lg);
		}
	}
</style>
