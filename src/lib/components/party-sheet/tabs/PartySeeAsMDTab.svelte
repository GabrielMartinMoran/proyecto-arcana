<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import type { Card } from '$lib/types/cards/card';
	import type { Character } from '$lib/types/character';
	import { Party } from '$lib/types/party';
	import { serializeCharacterAsMD } from '$lib/utils/serializers/character-serializer';
	import { renderNotesAsMarkdown } from '$lib/utils/serializers/notes-markdown';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { dialogService } from '$lib/services/dialog-service.svelte';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	let allCards: Card[] = $state([]);

	const {
		loadAbilityCards,
		abilityCards: abilityCardsStore,
		loadItemCards,
		itemCards: itemCardsStore,
	} = useCardsService();

	function serializePartyAsMD(p: Party, cards: Card[]): string {
		let md = '';

		// Title
		md += `# ${p.name}\n\n`;

		// Members section
		md += `## Miembros\n`;
		if (Array.isArray(p.characters) && p.characters.length > 0) {
			for (let i = 0; i < p.characters.length; i++) {
				const ch = p.characters[i] as Character;
				// Reuse character serializer to render each member, wrapped as blockquote
				{
					const chMd = serializeCharacterAsMD(ch, cards);
					const quoted = chMd
						.split('\n')
						.map((ln) => (ln.length ? `> ${ln}` : '>'))
						.join('\n');
					md += `${quoted}\n`;
				}
				if (i < p.characters.length - 1) {
					md += `\n---\n\n`;
				}
			}
		} else {
			md += `__Sin miembros.__\n\n`;
		}

		// Notes section (reusable notes markdown util)
		md += renderNotesAsMarkdown(p.notes, { headerTitle: 'Notas' });

		return md;
	}

	let partyMD: string = $derived(serializePartyAsMD(party, allCards));

	onMount(async () => {
		await Promise.all([loadItemCards(), loadAbilityCards()]);
		allCards = [...get(itemCardsStore), ...get(abilityCardsStore)];
	});

	const copyMarkdown = async () => {
		try {
			await navigator.clipboard.writeText(partyMD);
			await dialogService.alert('Grupo en formato Markdown copiado al portapapeles!');
		} catch (err) {
			console.error('[PartySeeAsMDTab] Failed to copy text:', err);
			await dialogService.alert('Error al copiar el markdown al portapapeles');
		}
	};
</script>

<Container>
	<div class="header">
		<label>Grupo</label>
		<button onclick={copyMarkdown}>Copiar Markdown</button>
	</div>
	<pre>{partyMD}</pre>
</Container>

<style>
	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		flex-wrap: wrap;
	}

	pre {
		white-space: pre-wrap;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--disabled-bg);
		padding: var(--spacing-sm);
	}
</style>
