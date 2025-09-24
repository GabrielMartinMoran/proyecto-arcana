<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { Character } from '$lib/types/character';
	import AttacksList from '../elements/AttacksList.svelte';
	import AttributeField from '../elements/AttributeField.svelte';
	import EquipmentList from '../elements/EquipmentList.svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	let { rollExpression } = useDiceRollerService();

	const onAttributeDiceRoll = (attributeName: string) => {
		console.log(`Rolling dice for ${attributeName}`);
		rollExpression({
			expression: `1d6e+${attributeName}`,
			variables: {
				cuerpo: character.attributes.cuerpo,
				reflejos: character.attributes.reflejos,
				mente: character.attributes.mente,
				instinto: character.attributes.instinto,
			},
		});
	};
</script>

<Container title="Atributos Principales">
	<div class="attributes">
		<AttributeField
			name="Cuerpo"
			value={character.attributes.cuerpo}
			{readonly}
			onDiceRoll={() => onAttributeDiceRoll('cuerpo')}
			onChange={(value) => {
				character.attributes.cuerpo = value;
				onChange(character);
			}}
		/>
		<AttributeField
			name="Reflejos"
			value={character.attributes.reflejos}
			{readonly}
			onDiceRoll={() => onAttributeDiceRoll('reflejos')}
			onChange={(value) => {
				character.attributes.reflejos = value;
				onChange(character);
			}}
		/>
		<AttributeField
			name="Mente"
			value={character.attributes.mente}
			{readonly}
			onDiceRoll={() => onAttributeDiceRoll('mente')}
			onChange={(value) => {
				character.attributes.mente = value;
				onChange(character);
			}}
		/>
		<AttributeField
			name="Instinto"
			value={character.attributes.instinto}
			{readonly}
			onDiceRoll={() => onAttributeDiceRoll('instinto')}
			onChange={(value) => {
				character.attributes.instinto = value;
				onChange(character);
			}}
		/>
		<AttributeField
			name="Presencia"
			value={character.attributes.presencia}
			{readonly}
			onDiceRoll={() => onAttributeDiceRoll('presencia')}
			onChange={(value) => {
				character.attributes.presencia = value;
				onChange(character);
			}}
		/>
		<InputField
			label="Suerte"
			value={character.currentLuck}
			max={character.maxLuck}
			{readonly}
			onChange={(value) => {
				character.currentLuck = Number(value);
				onChange(character);
			}}
		/>
	</div>
</Container>
<Container title="Atributos Derivados">
	<div class="attributes">
		<InputField
			label="Salud"
			value={character.currentHP}
			max={character.maxHP}
			{readonly}
			onChange={(value) => {
				character.currentHP = Number(value);
				onChange(character);
			}}
		/>
		<InputField
			label="Salud Temporal"
			value={character.tempHP}
			{readonly}
			onChange={(value) => {
				character.tempHP = Number(value);
				onChange(character);
			}}
		/>
		<InputField label="Velocidad" value={character.speed} readonly={true} />
		<InputField label="Esquiva" value={character.evasion} readonly={true} />
		<InputField label="Mitigación" value={character.mitigation} readonly={true} />
		<InputField label="Iniciativa" value={character.initiative} readonly={true} />
	</div>
</Container>

<Container title="Información">
	<div class="info">
		<AttacksList
			attacks={character.attacks}
			{readonly}
			onChange={(attacks) => {
				character.attacks = attacks;
				onChange(character);
			}}
		/>
		{#if character.attacks.length === 0}
			<div class="empty">
				<em>No hay ataques cargados.</em>
			</div>
		{/if}
		<TextField
			label="Información Rápida"
			value={character.quickInfo}
			{readonly}
			placeholder="Información general, habilidades, etc."
			onChange={(value) => {
				character.quickInfo = value;
				onChange(character);
			}}
		/>
		<InputField
			label="Lenguas"
			value={character.languages}
			{readonly}
			fullWidth={true}
			placeholder="Lista de lenguas concidas"
			textAlign="left"
			onChange={(value) => {
				character.languages = value as string;
				onChange(character);
			}}
		/>
	</div>
</Container>
<Container title="Equipo">
	<div class="equipment">
		<InputField label="Oro" value={character.gold} readonly={true} fullWidth={true} />
		<EquipmentList
			equipment={character.equipment}
			{readonly}
			onChange={(equipment) => {
				character.equipment = equipment;
				onChange(character);
			}}
		/>
		{#if character.equipment.length === 0}
			<div class="empty">
				<em>El equipo esta vacío.</em>
			</div>
		{/if}
	</div>
</Container>

<style>
	.attributes {
		display: flex;
		flex-direction: row;
		justify-content: space-evenly;
		flex-wrap: wrap;
		width: 100%;
		gap: var(--spacing-md);
		margin-top: var(--spacing-md);
	}

	.equipment,
	.info {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--spacing-md);
		margin-top: var(--spacing-md);

		.empty {
			display: flex;
			flex: 1;
			justify-content: center;
			align-items: center;
		}
	}
</style>
