<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BestiaryFilter from '$lib/components/bestiary/BestiaryFilter.svelte';
	import CreatureList from '$lib/components/bestiary/CreatureList.svelte';
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import { useCreaturesService } from '$lib/services/creatures-service';
	import type { Creature } from '$lib/types/creature';
	import { removeDiacritics } from '$lib/utils/formatting';
	import { onMount } from 'svelte';

	type BestiaryFilters = {
		name: string;
		tier: string; // empty string means every tier
		lineage?: string; // empty or absent means every lineage
	};

	const { loadCreatures, creatures } = useCreaturesService();

	const BESTIARY_PATHNAME = '/bestiary';

	// Filters initialize from the URL so a shared link restores the catalogue
	let nameFilter: string = $state((page.url.searchParams.get('name') ?? '').trim());
	let tierFilter: string = $state((page.url.searchParams.get('tier') ?? '').trim());
	let lineageFilter: string = $state((page.url.searchParams.get('lineage') ?? '').trim());

	const filters: BestiaryFilters = $derived({
		name: nameFilter,
		tier: tierFilter,
		lineage: lineageFilter,
	});

	const matchesFilters = (creature: Creature, activeFilters: BestiaryFilters): boolean => {
		const searchTerm = removeDiacritics(activeFilters.name.toLowerCase().trim());
		const matchesName = removeDiacritics(creature.name.toLowerCase()).includes(searchTerm);
		const matchesTier = !activeFilters.tier || parseInt(activeFilters.tier) === creature.tier;
		const matchesLineage = !activeFilters.lineage || creature.lineage === activeFilters.lineage;

		return matchesName && matchesTier && matchesLineage;
	};

	const filteredCreatures = $derived(
		($creatures ?? []).filter((creature) => matchesFilters(creature, filters)),
	);

	// The URL owns the selection; the effective selection must stay visible
	const selectedCreatureId = $derived(page.url.searchParams.get('creatureId'));

	const selectedCreature = $derived(
		filteredCreatures.find((creature) => creature.id === selectedCreatureId) ?? null,
	);

	// Until the catalogue load completes, no visible data can prove the
	// selection was excluded, so the URL keeps creatureId
	let isCatalogueLoaded = $state(false);

	const isSelectionVisible = (activeFilters: BestiaryFilters): boolean =>
		!selectedCreatureId ||
		!isCatalogueLoaded ||
		($creatures ?? []).some(
			(creature) => creature.id === selectedCreatureId && matchesFilters(creature, activeFilters),
		);

	onMount(async () => {
		await loadCreatures();
		isCatalogueLoaded = true;

		// Only the loaded data can settle whether the selection was excluded
		if (!isSelectionVisible(filters)) {
			updateQueryParams((params) => params.delete('creatureId'));
		}
	});

	// Single owner of query-parameter mutations: every update starts from the
	// current URL so unrelated parameters (filters or selection) survive.
	const updateQueryParams = (mutate: (params: URLSearchParams) => void) => {
		const nextUrl = new URL(page.url);
		mutate(nextUrl.searchParams);

		// Avoid redundant navigation; goto updates page.url reactively
		if (nextUrl.search === page.url.search) return;

		// resolve() is typed for pathnames; this route only appends its own
		// managed query string, which resolve preserves verbatim.
		const nextLocation = resolve(
			`${BESTIARY_PATHNAME}${nextUrl.search}` as typeof BESTIARY_PATHNAME,
		);
		goto(nextLocation, { replaceState: true, keepFocus: true, noScroll: true });
	};

	const setOptionalQueryParam = (params: URLSearchParams, key: string, value: string) => {
		if (value) params.set(key, value);
		else params.delete(key);
	};

	const applyFilters = ({ name, tier, lineage = '' }: BestiaryFilters) => {
		nameFilter = name;
		tierFilter = tier;
		lineageFilter = lineage;
		const nextFilters: BestiaryFilters = { name, tier, lineage };
		const selectionRemainsVisible = isSelectionVisible(nextFilters);

		updateQueryParams((params) => {
			setOptionalQueryParam(params, 'name', name.trim());
			setOptionalQueryParam(params, 'tier', tier.trim());
			setOptionalQueryParam(params, 'lineage', lineage.trim());
			if (!selectionRemainsVisible) params.delete('creatureId');
		});
	};

	const resetFilters = () => {
		applyFilters({ name: '', tier: '', lineage: '' });
	};

	const selectCreature = (creature: Creature) => {
		updateQueryParams((params) => params.set('creatureId', creature.id));
	};
</script>

<section>
	<h1>Bestiario</h1>

	<BestiaryFilter
		creatures={$creatures ?? []}
		{filters}
		onFiltersChange={applyFilters}
		onResetFilters={resetFilters}
	/>

	<div class="bestiary-layout">
		<div class="catalogue-panel">
			<CreatureList
				creatures={filteredCreatures}
				selectedCreatureId={selectedCreature?.id ?? null}
				onSelect={selectCreature}
			/>
		</div>

		<div class="detail-panel">
			{#if selectedCreature}
				<Statblock creature={selectedCreature} />
			{:else}
				<p class="selection-instruction" role="status">
					Selecciona una criatura del catálogo para ver su statblock.
				</p>
			{/if}
		</div>
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		flex-grow: 1;
		width: 100%;
	}

	.bestiary-layout {
		display: grid;
		grid-template-columns: minmax(280px, 26rem) minmax(0, 1fr);
		align-items: start;
		gap: var(--spacing-lg);
		flex-grow: 1;
		width: 100%;
	}

	.catalogue-panel,
	.detail-panel {
		min-width: 0;
	}

	.catalogue-panel {
		/* The catalogue clips its own content while scrolling, so it must also
		   be the containing block for the absolute sr-only row labels;
		   otherwise they escape the clip and grow the document at mobile
		   widths. */
		position: relative;
	}

	.selection-instruction {
		margin: 0;
		padding: var(--spacing-md);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		text-align: center;
	}

	@media (min-width: 900px) {
		.bestiary-layout {
			/* Desktop chrome (top bar, headings, filters) peaks near 293px, so
			   24rem leaves headroom; the surrounding flex-grow absorbs surplus. */
			--bestiary-chrome-budget: 24rem;
			height: calc(100dvh - var(--bestiary-chrome-budget));
			grid-template-rows: minmax(0, 1fr);
			align-items: stretch;
			min-height: 0;
		}

		.catalogue-panel,
		.detail-panel {
			/* Both panels become viewport-bounded, independently scrolling
			   regions on desktop; the catalogue's containing block already
			   comes from the base rule. */
			min-height: 0;
			overflow-y: auto;
			overscroll-behavior: contain;
			scrollbar-width: thin;
		}

		.detail-panel {
			/* Keeps the detail panel a containing block for absolutely
			   positioned decorations, as before. */
			position: relative;
		}
	}

	@media (max-width: 899px) {
		.bestiary-layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.catalogue-panel {
			max-height: 45vh;
			overflow-y: auto;
		}
	}
</style>
