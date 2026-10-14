<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		attackLibraryService,
		type AttackLibraryEntry,
	} from '$lib/services/attack-library-service';
	import type { AttackDraft, Character } from '$lib/types/character';
	import { untrack } from 'svelte';

	type LibraryTab = 'weapons' | 'spells';

	type Props = {
		opened: boolean;
		character: Character;
		onClose: () => void;
		onAddAttacks: (drafts: AttackDraft[]) => void;
	};

	let { opened, character, onClose, onAddAttacks }: Props = $props();

	let activeTab = $state<LibraryTab>('weapons');
	let searchQuery = $state('');
	let weaponEntries = $state<AttackLibraryEntry[]>([]);
	let spellEntries = $state<AttackLibraryEntry[]>([]);
	let loading = $state(false);

	const activeEntries = $derived(activeTab === 'weapons' ? weaponEntries : spellEntries);

	const filteredEntries = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return activeEntries;

		return activeEntries.filter((entry) => entry.name.toLowerCase().includes(query));
	});

	const entryCountLabel = $derived(
		`${filteredEntries.length} ${filteredEntries.length === 1 ? 'entrada' : 'entradas'}`,
	);

	const loadEntries = async (targetCharacter: Character) => {
		loading = true;

		try {
			const [weapons, spells] = await Promise.all([
				attackLibraryService.loadWeaponEntries(),
				attackLibraryService.loadSpellEntries(targetCharacter),
			]);

			if (!opened) return;

			weaponEntries = weapons;
			spellEntries = spells;
		} finally {
			loading = false;
		}
	};

	$effect(() => {
		if (!opened) return;

		// Load once per open: later `character` updates must not restart the load.
		void loadEntries(untrack(() => character));
	});

	const formatPreview = (entry: AttackLibraryEntry): string =>
		`ATQ: ${entry.atkFormula ?? '—'} · DMG: ${entry.dmgFormula} · ${entry.notes}`;

	const selectTab = (tab: LibraryTab) => {
		activeTab = tab;
	};

	const handleAdd = (entry: AttackLibraryEntry) => {
		if (!entry.importable || entry.atkFormula === null) return;

		onAddAttacks([
			{
				name: entry.name,
				atkFormula: entry.atkFormula,
				dmgFormula: entry.dmgFormula,
				notes: entry.notes,
			},
		]);
	};

	const handleClose = () => {
		onClose();
	};
</script>

<Modal {opened} title="Biblioteca de Ataques" onClose={handleClose}>
	<div class="filters">
		<div class="search-box">
			<input type="text" placeholder="Buscar por nombre..." bind:value={searchQuery} />
		</div>
		<div class="category-tabs">
			<button
				class="category-tab"
				class:active={activeTab === 'weapons'}
				onclick={() => selectTab('weapons')}
			>
				Armas
			</button>
			<button
				class="category-tab"
				class:active={activeTab === 'spells'}
				onclick={() => selectTab('spells')}
			>
				Conjuros
			</button>
		</div>
	</div>

	<div class="attacks-list">
		{#if loading}
			<div class="loading">Cargando…</div>
		{:else if filteredEntries.length > 0}
			{#each filteredEntries as entry (entry.id)}
				<div class="attack-library-item">
					<div class="attack-info">
						<span class="attack-name">{entry.name}</span>
						<span class="attack-notes">{formatPreview(entry)}</span>
					</div>
					<div class="attack-actions">
						<button
							class="btn-add"
							disabled={!entry.importable}
							title={entry.importable ? 'Agregar' : entry.disabledReason}
							onclick={() => handleAdd(entry)}
						>
							Agregar
						</button>
					</div>
				</div>
			{/each}
		{:else}
			<div class="empty">No se encontraron ataques</div>
		{/if}
	</div>

	{#snippet footer()}
		<span class="results-count">{entryCountLabel}</span>
		<button onclick={handleClose}>Cerrar</button>
	{/snippet}
</Modal>

<style>
	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.search-box input {
		width: 100%;
		padding: var(--spacing-sm);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--primary-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.category-tabs {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.category-tab {
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--primary-bg);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.category-tab:hover {
		background-color: var(--secondary-bg);
		color: var(--text-primary);
	}

	.category-tab.active {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.attacks-list {
		display: flex;
		flex-direction: column;
		max-height: 400px;
		overflow-y: auto;
		width: 100%;
	}

	.attack-library-item {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
		gap: var(--spacing-md);
	}

	.attack-library-item:last-child {
		border-bottom: none;
	}

	.attack-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.attack-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.attack-notes {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.attack-actions {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-sm);
	}

	.btn-add {
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.btn-add:hover:not(:disabled) {
		background-color: var(--primary-bg);
	}

	.btn-add:disabled {
		color: var(--text-secondary);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.loading,
	.empty {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--spacing-xl);
		color: var(--text-secondary);
		font-style: italic;
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
