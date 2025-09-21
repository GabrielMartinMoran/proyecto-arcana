<script lang="ts">
	import { Character } from '$lib/types/character';
	import type { Component } from 'svelte';
	import CardsTab from './tabs/CardsTab.svelte';
	import DicesTab from './tabs/DicesTab.svelte';
	import GeneralTab from './tabs/GeneralTab.svelte';
	import NotesTab from './tabs/NotesTab.svelte';
	import ProgressTab from './tabs/ProgressTab.svelte';
	import SettingsTab from './tabs/SettingsTab.svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	type Tab = {
		title: string;
		component: Component<Props, any, any>;
		availableWhenReadOnly: boolean;
	};

	const TABS: Tab[] = [
		{
			title: 'General',
			component: GeneralTab,
			availableWhenReadOnly: true,
		},
		{
			title: 'Cartas',
			component: CardsTab,
			availableWhenReadOnly: true,
		},
		{
			title: 'Notas',
			component: NotesTab,
			availableWhenReadOnly: true,
		},
		{
			title: 'Configuración',
			component: SettingsTab,
			availableWhenReadOnly: false,
		},
		{
			title: 'Progreso',
			component: ProgressTab,
			availableWhenReadOnly: false,
		},
		{
			title: 'Dados',
			component: DicesTab,
			availableWhenReadOnly: true,
		},
	];

	let currentTabIndex: number = $state(0);

	let currentTab: Tab = $derived(TABS[currentTabIndex]);

	const onCharacterChange = (chara: Character) => {
		const newChara = chara.copy();
		onChange(newChara);
		character = newChara;
	};
</script>

<div class="character-sheet">
	<div class="tabs">
		{#each TABS as tab, index (tab.title)}
			{#if tab.availableWhenReadOnly || !readonly}
				<button
					class="tab"
					class:selected={currentTabIndex === index}
					onclick={() => (currentTabIndex = index)}>{tab.title}</button
				>
			{/if}
		{/each}
	</div>
	<currentTab.component {character} {readonly} onChange={onCharacterChange} />
</div>

<style>
	.character-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);

		.tabs {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--spacing-md);
		}
	}
</style>
