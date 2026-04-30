<script lang="ts">
	interface Props {
		onSelect: (yamlText: string) => void;
		onClose: () => void;
		open?: boolean;
	}

	let { onSelect, onClose, open = $bindable(false) }: Props = $props();

	const TEST_YAML =
		'name: ImportedDragon\ntier: 3\nlineage: Dragón\nsize: Grande\nattributes:\n  body: 4\n  reflexes: 2\n  mind: 3\n  instinct: 3\n  presence: 5\nstats:\n  maxHealth: 40\n  evasion:\n    value: 2\n    note: null\n  physicalMitigation:\n    value: 2\n    note: null\n  magicalMitigation:\n    value: 2\n    note: null\n  speed:\n    value: 5\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null';
</script>

{#if open}
	<div data-testid="import-modal">
		<button data-testid="import-select" onclick={() => onSelect(TEST_YAML)}
			>Select Test Creature</button
		>
		<button data-testid="import-close" onclick={onClose}>Close</button>
	</div>
{/if}
