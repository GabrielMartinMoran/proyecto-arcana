<script lang="ts">
	import { Character } from '$lib/types/character';
	import type { Component } from 'svelte';
	import TitleField from '../ui/TitleField.svelte';
	import BioTab from './tabs/BioTab.svelte';
	import CardsTab from './tabs/CardsTab.svelte';
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
			title: 'Bio',
			component: BioTab,
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
	<div class="title">
		<TitleField
			value={character.name}
			{readonly}
			onChange={(value) => {
				character.name = value;
				onCharacterChange(character);
			}}
		/>
	</div>
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
		width: 100%;

		.tabs {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--spacing-sm);
		}
	}
</style>
