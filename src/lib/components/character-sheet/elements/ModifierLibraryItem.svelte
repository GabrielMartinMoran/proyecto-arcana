<script lang="ts">
	import type { LibraryModifier } from '$lib/types/modifier';

	type Props = {
		modifier: LibraryModifier;
		onAdd: (modifier: LibraryModifier) => void;
	};

	let { modifier, onAdd }: Props = $props();
</script>

<div class="modifier-library-item">
	<div class="modifier-info">
		<span class="modifier-name">{modifier.name}</span>
		<span class="modifier-description">{modifier.description}</span>
	</div>
	<div class="modifier-actions">
		<button onclick={() => onAdd(modifier)} class="btn-add" title="Agregar"> Agregar </button>
	</div>
</div>

<style>
	.modifier-library-item {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
		gap: var(--spacing-md);
	}

	.modifier-library-item:last-child {
		border-bottom: none;
	}

	.modifier-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.modifier-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.modifier-description {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.modifier-actions {
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

	.btn-add:hover {
		background-color: var(--primary-bg);
	}
</style>
