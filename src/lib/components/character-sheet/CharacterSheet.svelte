<script lang="ts">
	import { resolve } from '$app/paths';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import type { Component } from 'svelte';
	import { get } from 'svelte/store';
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
		allowPartyChange?: boolean;
	};

	let {
		character,
		readonly,
		onChange,
		currentTab,
		onTabChange,
		allowPartyChange = true,
	}: Props = $props();

	let { user } = useFirebaseService();

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
			// Satisfy Props type which requires these even if SettingsTab doesn't use them (or uses different props)
			// Actually, SettingsTab defines its own Props which are different from CharacterSheet Props.
			// The issue is that we are using a dynamic component <currentTabReference.component> which TypeScript
			// infers as a union of all possible component types in TABS.
			// We need to make sure the props passed to <currentTabReference.component> are compatible with ALL components in TABS,
			// OR we need to accept that TypeScript will complain if we don't differentiate.
			// However, since we are passing extra props {allowPartyChange}, it causes issues for components that don't expect it?
			// No, extra props are usually fine in Svelte unless strict.
			// The error is: Type '{ ... }' is missing the following properties from type 'Props': currentTab, onTabChange
			// This suggests that ONE of the components (SettingsTab?) expects 'Props' (the type defined in CharacterSheet?)
			// Let's check SettingsTab props again.
			// SettingsTab has: character, onChange, allowPartyChange.
			// CharacterSheet Props has: character, readonly, onChange, currentTab, onTabChange, allowPartyChange.
			// Wait, the error message said:
			// Type '{ character: Character; readonly: boolean; onChange: (chara: Character) => void; allowPartyChange: boolean; }'
			// is missing ... currentTab, onTabChange.
			// This means the component at line 153 expects currentTab and onTabChange.
			// But I removed them in the previous step!
			// I need to put them BACK.
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

	const onCharacterChange = (chara: Character) => {
		const newChara = chara.copy();
		character = newChara;
		onChange(newChara);
	};

	const changeTab = (index: number) => {
		currentTabIndex = index;
		onTabChange(TABS[index].name);
	};

	import { dialogService } from '$lib/services/dialog-service.svelte';

	const copyPublicURL = async () => {
		const userId = get(user)?.uid;
		if (!userId) return;
		const publicURL = resolve(`/characters/shared/${userId}/${character.id}`);
		await navigator.clipboard.writeText(window.location.origin + publicURL);
		await dialogService.alert(
			'Se copio el enlace público del personaje al portapapeles!\n\nCompartelo con quien quieras que lo vea.'
		);
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
					onclick={() => changeTab(index)}>{tab.title}</button
				>
			{/if}
		{/each}
		{#if !readonly}
			<span class="spacer"></span>
			<button onclick={copyPublicURL}>🔗 Compartir</button>
		{/if}
	</div>
	<currentTabReference.component
		{character}
		{readonly}
		onChange={onCharacterChange}
		{allowPartyChange}
		currentTab={currentTab ?? 'stats'}
		onTabChange={(t) => onTabChange(t)}
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

		.spacer {
			flex-grow: 1;
		}
	}
</style>
