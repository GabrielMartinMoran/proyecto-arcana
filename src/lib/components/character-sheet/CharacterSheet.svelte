<script lang="ts">
	import { Character } from '$lib/types/character';
	import type { Component } from 'svelte';
	import TitleField from '../ui/TitleField.svelte';
	import BioTab from './tabs/BioTab.svelte';
	import CardsTab from './tabs/CardsTab.svelte';
	import EconomyTab from './tabs/EconomyTab.svelte';
	import GeneralTab from './tabs/GeneralTab.svelte';
	import NotesTab from './tabs/NotesTab.svelte';
	import ProgressTab from './tabs/ProgressTab.svelte';
	import SeeAsMDTab from './tabs/SeeAsMDTab.svelte';
	import SettingsTab from './tabs/SettingsTab.svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
		currentTab: string;
		onTabChange: (tab: string) => void;
		allowPartyChange: boolean;
	};

	let {
		character,
		readonly,
		onChange,
		currentTab,
		onTabChange,
		allowPartyChange = true,
	}: Props = $props();

	type Tab = {
		name: string;
		title: string;
		component: Component<Props, any, any>;
		availableWhenReadOnly: boolean;
	};

	const TABS: Tab[] = [
		{
			name: 'general',
			title: 'General',
			component: GeneralTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'cards',
			title: 'Cartas',
			component: CardsTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'bio',
			title: 'Bio',
			component: BioTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'notes',
			title: 'Notas',
			component: NotesTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'progress',
			title: 'Progreso',
			component: ProgressTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'economy',
			title: 'Economía',
			component: EconomyTab,
			availableWhenReadOnly: true,
		},
		{
			name: 'settings',
			title: 'Configuración',
			component: SettingsTab,
			availableWhenReadOnly: false,
		},
		{
			name: 'see_as_md',
			title: 'Ver como MD',
			component: SeeAsMDTab,
			availableWhenReadOnly: true,
		},
	];

	let currentTabIndex: number = $derived(
		Math.max(
			TABS.findIndex((tab) => tab.name === currentTab),
			0,
		),
	);
	let currentTabReference: Tab = $derived(TABS.find((tab) => tab.name === currentTab) ?? TABS[0]);

	let __saveTimeout: ReturnType<typeof setTimeout> | null = null;
	const SAVE_DEBOUNCE_MS = 500;

	const onCharacterChangeDebounced = (chara: Character) => {
		const newChara = chara.copy();
		// Update local state immediately for UX responsiveness
		character = newChara;
		// Debounce the external save emission
		if (__saveTimeout) {
			clearTimeout(__saveTimeout);
		}
		__saveTimeout = setTimeout(() => {
			__saveTimeout = null;
			onChange(newChara);
		}, SAVE_DEBOUNCE_MS);
	};

	const changeTab = (index: number) => {
		currentTabIndex = index;
		onTabChange(TABS[index].name);
	};
</script>

<div class="character-sheet">
	<div class="title">
		<TitleField
			value={character.name}
			{readonly}
			onChange={(value) => {
				character.name = value;
				onCharacterChangeDebounced(character);
			}}
		/>
	</div>
	<div class="tabs">
		{#each TABS as tab, index (tab.title)}
			{#if tab.availableWhenReadOnly || !readonly}
				<button
					class="tab"
					class:selected={currentTabIndex === index}
					onclick={() => changeTab(index)}>{tab.title}</button
				>
			{/if}
		{/each}
	</div>
	<currentTabReference.component
		{character}
		{readonly}
		onChange={onCharacterChangeDebounced}
		{allowPartyChange}
	/>
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
