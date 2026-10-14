import type { AttackLibraryEntry } from '$lib/services/attack-library-service';
import { Character, type Attack } from '$lib/types/character';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	loadWeaponEntries: vi.fn(),
	loadSpellEntries: vi.fn(),
}));

vi.mock('$lib/services/attack-library-service', () => ({
	attackLibraryService: {
		loadWeaponEntries: mocks.loadWeaponEntries,
		loadSpellEntries: mocks.loadSpellEntries,
	},
}));

import AttacksList from './AttacksList.svelte';

const BLOCKED_SPELL_REASON =
	'Requiere una carta de sustitución (Estudios Mágicos / Pacto Supremo / Herencia Sobrenatural)';

const weaponEntries: AttackLibraryEntry[] = [
	{
		id: 'weapon-maza',
		name: 'Maza',
		atkFormula: '1d8e+cuerpo',
		dmgFormula: '1d6',
		notes: 'Contundente · Requisito: Cuerpo 2',
		importable: true,
	},
];

const spellEntries: AttackLibraryEntry[] = [
	{
		id: 'card-descarga-elemental',
		name: 'Descarga Elemental',
		atkFormula: null,
		dmgFormula: '1d8',
		notes: 'Conjuro · tipo elegido',
		importable: false,
		disabledReason: BLOCKED_SPELL_REASON,
	},
];

const buildAttacks = (): Attack[] => [
	{
		id: 'attack-sword',
		name: 'Espada',
		atkFormula: '1d8e+cuerpo',
		dmgFormula: '1d8',
		notes: 'Cortante',
	},
	{
		id: 'attack-dagger',
		name: 'Daga',
		atkFormula: '1d8e+reflejos',
		dmgFormula: '1d4',
		notes: 'Perforante',
	},
	{
		id: 'attack-bow',
		name: 'Arco',
		atkFormula: '1d8e+reflejos',
		dmgFormula: '1d6',
		notes: 'Perforante · Rango (Media)',
	},
];

const EXISTING_ATTACK_IDS = ['attack-sword', 'attack-dagger', 'attack-bow'];

const buildCharacter = (): Character =>
	new Character({
		id: 'char-1',
		name: 'Ayla',
		attributes: { body: 1, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 10,
		tempHP: 0,
		currentLuck: 2,
		img: null,
		party: { partyId: null, ownerId: null },
		narrativeContext: { appearance: '', background: '', beliefs: '' },
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 3,
		version: 1,
		skills: [],
		customCards: [],
	});

type Props = {
	attacks: Attack[];
	readonly: boolean;
	onChange: (attacks: Attack[]) => void;
	onAttackRoll: (attack: Attack) => void;
	onDamageRoll: (attack: Attack) => void;
	character: Character;
};

const renderList = (
	overrides: Partial<Omit<Props, 'attacks' | 'onChange' | 'onAttackRoll' | 'onDamageRoll'>> = {},
) => {
	const onChange = vi.fn();
	const onAttackRoll = vi.fn();
	const onDamageRoll = vi.fn();

	render(AttacksList, {
		props: {
			attacks: buildAttacks(),
			readonly: false,
			onChange,
			onAttackRoll,
			onDamageRoll,
			character: buildCharacter(),
			...overrides,
		},
	});

	return { onChange, onAttackRoll, onDamageRoll };
};

const openLibraryModal = async () => {
	await fireEvent.click(screen.getByRole('button', { name: /Agregar de biblioteca/ }));
	await screen.findByText('Maza');
};

const getAddButton = (entryName: string): HTMLButtonElement => {
	const row = screen.getByText(entryName).closest('.attack-library-item');
	expect(row).not.toBeNull();
	return within(row as HTMLElement).getByRole('button', { name: 'Agregar' }) as HTMLButtonElement;
};

describe('AttacksList library integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.loadWeaponEntries.mockResolvedValue(weaponEntries);
		mocks.loadSpellEntries.mockResolvedValue(spellEntries);
	});

	it('FEAT-attack-library — shows the blank-add and library buttons in edit mode', () => {
		renderList();

		expect(screen.getByTitle('Agregar Ataque')).toBeInTheDocument();

		const libraryButton = screen.getByRole('button', { name: /Agregar de biblioteca/ });
		expect(libraryButton).toHaveTextContent('📚 Agregar de biblioteca');
		expect(libraryButton).toHaveAttribute('title', 'Agregar de biblioteca');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('FEAT-attack-library @readonly — hides both add buttons in read-only mode while roll buttons remain', () => {
		renderList({ readonly: true });

		expect(screen.queryByTitle('Agregar Ataque')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Agregar de biblioteca/ })).not.toBeInTheDocument();
		expect(screen.getAllByTitle('Tirar Ataque')).toHaveLength(3);
		expect(screen.getAllByTitle('Tirar Daño')).toHaveLength(3);
	});

	it('appends one blank attack row with a fresh id when the "➕" button is clicked', async () => {
		const { onChange } = renderList();

		await fireEvent.click(screen.getByTitle('Agregar Ataque'));

		expect(onChange).toHaveBeenCalledTimes(1);
		const updated = vi.mocked(onChange).mock.calls[0][0];
		expect(updated).toHaveLength(4);

		const added = updated.at(-1)!;
		expect(added).toMatchObject({ name: '', atkFormula: '', dmgFormula: '', notes: '' });
		expect(EXISTING_ATTACK_IDS).not.toContain(added.id);
	});

	it('FEAT-attack-library @modal-open — opens the attack library modal from the header button', async () => {
		renderList();

		await fireEvent.click(screen.getByRole('button', { name: /Agregar de biblioteca/ }));

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Biblioteca de Ataques')).toBeInTheDocument();
		expect(await within(dialog).findByText('Maza')).toBeInTheDocument();
	});

	it('FEAT-attack-library @snapshot-duplicates — importing appends one snapshot row with a fresh id', async () => {
		const { onChange } = renderList();

		await openLibraryModal();
		await fireEvent.click(getAddButton('Maza'));

		expect(onChange).toHaveBeenCalledTimes(1);
		const updated = vi.mocked(onChange).mock.calls[0][0];
		expect(updated).toHaveLength(4);
		expect(updated.slice(0, 3).map((attack) => attack.name)).toEqual(['Espada', 'Daga', 'Arco']);

		const imported = updated.at(-1)!;
		expect(imported).toMatchObject({
			name: 'Maza',
			atkFormula: '1d8e+cuerpo',
			dmgFormula: '1d6',
			notes: 'Contundente · Requisito: Cuerpo 2',
		});
		expect(typeof imported.id).toBe('string');
		expect(imported.id).not.toBe('');
		expect(EXISTING_ATTACK_IDS).not.toContain(imported.id);

		// The modal stays open for consecutive imports (T4 behavior).
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('FEAT-attack-library @snapshot-duplicates — two imports create two rows with distinct ids', async () => {
		const { onChange } = renderList();

		await openLibraryModal();
		await fireEvent.click(getAddButton('Maza'));
		await fireEvent.click(getAddButton('Maza'));

		expect(onChange).toHaveBeenCalledTimes(2);
		const updated = vi.mocked(onChange).mock.calls[1][0];
		expect(updated).toHaveLength(5);

		const [firstImported, secondImported] = updated.slice(-2);
		expect(firstImported.name).toBe('Maza');
		expect(secondImported.name).toBe('Maza');
		expect(firstImported.id).not.toBe(secondImported.id);
	});

	it('FEAT-attack-library @snapshot-duplicates — an imported row is editable without affecting the other', async () => {
		const { onChange } = renderList();

		await openLibraryModal();
		await fireEvent.click(getAddButton('Maza'));
		await fireEvent.click(getAddButton('Maza'));

		const importedNameInputs = screen.getAllByDisplayValue('Maza');
		expect(importedNameInputs).toHaveLength(2);

		await fireEvent.input(importedNameInputs[0], { target: { value: 'Maza pesada' } });

		const updated = vi.mocked(onChange).mock.calls.at(-1)![0];
		expect(updated.slice(0, 3).map((attack) => attack.name)).toEqual(['Espada', 'Daga', 'Arco']);

		const [editedRow, untouchedRow] = updated.slice(-2);
		expect(editedRow.name).toBe('Maza pesada');
		expect(untouchedRow.name).toBe('Maza');
		expect(untouchedRow.atkFormula).toBe('1d8e+cuerpo');
		expect(untouchedRow.dmgFormula).toBe('1d6');
		expect(untouchedRow.notes).toBe('Contundente · Requisito: Cuerpo 2');
		expect(editedRow.id).not.toBe(untouchedRow.id);
	});

	it('FEAT-attack-library @modal-open — the footer "Cerrar" button closes the modal', async () => {
		renderList();

		await openLibraryModal();
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await fireEvent.click(screen.getByText('Cerrar'));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.queryByText('Biblioteca de Ataques')).not.toBeInTheDocument();
	});
});
