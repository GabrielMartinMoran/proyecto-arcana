<script lang="ts">
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { onMount } from 'svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	const { loadCards, cards } = useCardsService();

	onMount(async () => {
		await loadCards();
	});

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		character.cards = updatedCards;
		onChange(character);
	};
</script>

{#if !readonly}
	<Container>
		<InputField
			label="Ranuras de Cartas Activas"
			value={character.maxActiveCards}
			{readonly}
			fullWidth={true}
			onChange={(value) => {
				character.maxActiveCards = Number(value);
				onChange(character);
			}}
		/>
	</Container>
{/if}

<Container title="Cartas Activas ({character.numActiveCards}/{character.maxActiveCards})">
	<CardsList
		cards={$cards.filter((x) => character.cards.some((y) => y.isActive && y.id === x.id))}
		{readonly}
		characterCards={character.cards}
		listMode="active"
		onChange={onCharacterCardsChange}
	/>
</Container>

<Container title="Colección">
	<CardsList
		cards={$cards.filter((x) => character.cards.some((y) => y.id === x.id))}
		{readonly}
		characterCards={character.cards}
		listMode="collection"
		onChange={onCharacterCardsChange}
	/>
</Container>

<Container title="Todas las Cartas">
	<CardsList
		cards={$cards.filter((x) => character.cards.find((y) => y.id === x.id) === undefined)}
		{readonly}
		characterCards={character.cards}
		listMode="all"
		onChange={onCharacterCardsChange}
	/>
</Container>
