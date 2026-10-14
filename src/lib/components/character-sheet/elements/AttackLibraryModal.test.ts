import type { AttackLibraryEntry } from '$lib/services/attack-library-service';
import { Character, type AttackDraft } from '$lib/types/character';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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

import AttackLibraryModal from './AttackLibraryModal.svelte';

const BLOCKED_SPELL_REASON =
	'Requiere una carta de sustitución (Estudios Mágicos / Pacto Supremo / Herencia Sobrenatural)';

const weaponEntries: AttackLibraryEntry[] = [
	{
		id: 'weapon-daga',
		name: 'Daga',
		atkFormula: '1d8e+reflejos',
		dmgFormula: '1d4',
		notes: 'Perforante · Precisa, Arrojadiza (Cercana)',
		importable: true,
	},
	{
		id: 'weapon-maza',
		name: 'Maza',
		atkFormula: '1d8e+cuerpo',
		dmgFormula: '1d6',
		notes: 'Contundente · Requisito: Cuerpo 2',
		importable: true,
	},
	{
		id: 'weapon-arco-corto',
		name: 'Arco corto',
		atkFormula: '1d8e+reflejos',
		dmgFormula: '1d6',
		notes: 'Perforante · A dos manos, Rango (Media) · Requisito: Reflejos 2',
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
	{
		id: 'card-llama-sagrada',
		name: 'Llama Sagrada',
		atkFormula: '1d8e+instinto',
		dmgFormula: '1d6',
		notes: 'Conjuro · Daño: Radiante',
		importable: true,
	},
];

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

type ModalProps = {
	opened: boolean;
	character: Character;
	onClose: () => void;
	onAddAttacks: (drafts: AttackDraft[]) => void;
};

const renderModal = (
	props: Partial<Pick<ModalProps, 'opened' | 'character' | 'onAddAttacks'>> & {
		onClose?: () => void;
	} = {},
) => {
	const onClose = props.onClose ?? vi.fn();
	const onAddAttacks = props.onAddAttacks ?? vi.fn();

	render(AttackLibraryModal, {
		props: {
			opened: true,
			character: buildCharacter(),
			onClose,
			onAddAttacks,
			...props,
		},
	});

	return { onClose, onAddAttacks };
};

const getAddButton = (entryName: string): HTMLButtonElement => {
	const row = screen.getByText(entryName).closest('.attack-library-item');
	expect(row).not.toBeNull();
	return within(row as HTMLElement).getByRole('button', { name: 'Agregar' }) as HTMLButtonElement;
};

const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
};

describe('AttackLibraryModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.loadWeaponEntries.mockResolvedValue(weaponEntries);
		mocks.loadSpellEntries.mockResolvedValue(spellEntries);
	});

	it('FEAT-attack-library @modal-open @tabs — shows the title, both tabs and the weapons tab by default', async () => {
		const character = buildCharacter();
		renderModal({ character });

		expect(screen.getByText('Biblioteca de Ataques')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Armas' })).toHaveClass('active');
		expect(screen.getByRole('button', { name: 'Conjuros' })).not.toHaveClass('active');

		expect(await screen.findByText('Daga')).toBeInTheDocument();
		expect(
			screen.getByText(
				'ATQ: 1d8e+reflejos · DMG: 1d4 · Perforante · Precisa, Arrojadiza (Cercana)',
			),
		).toBeInTheDocument();
		expect(screen.queryByText('Llama Sagrada')).not.toBeInTheDocument();
		expect(screen.getByText(/3 entradas/)).toBeInTheDocument();

		expect(mocks.loadWeaponEntries).toHaveBeenCalledTimes(1);
		expect(mocks.loadSpellEntries).toHaveBeenCalledWith(character);
	});

	it('FEAT-attack-library @tabs — switches to the Conjuros tab and lists spell entries', async () => {
		renderModal();

		await screen.findByText('Daga');
		await fireEvent.click(screen.getByRole('button', { name: 'Conjuros' }));

		expect(await screen.findByText('Llama Sagrada')).toBeInTheDocument();
		expect(screen.queryByText('Daga')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Conjuros' })).toHaveClass('active');
		expect(screen.getByRole('button', { name: 'Armas' })).not.toHaveClass('active');
		expect(screen.getByText(/2 entradas/)).toBeInTheDocument();
	});

	it('FEAT-attack-library @search — filters the active tab by name case-insensitively', async () => {
		renderModal();

		await screen.findByText('Daga');
		await fireEvent.input(screen.getByPlaceholderText('Buscar por nombre...'), {
			target: { value: 'DAGA' },
		});

		expect(screen.getByText('Daga')).toBeInTheDocument();
		expect(screen.queryByText('Maza')).not.toBeInTheDocument();
		expect(screen.queryByText('Arco corto')).not.toBeInTheDocument();
		expect(screen.getByText(/1 entrada/)).toBeInTheDocument();
	});

	it('FEAT-attack-library @weapon-melee — adds the exact draft and keeps the modal open', async () => {
		const { onAddAttacks, onClose } = renderModal();

		await screen.findByText('Daga');
		await fireEvent.click(getAddButton('Daga'));

		expect(onAddAttacks).toHaveBeenCalledExactlyOnceWith([
			{
				name: 'Daga',
				atkFormula: '1d8e+reflejos',
				dmgFormula: '1d4',
				notes: 'Perforante · Precisa, Arrojadiza (Cercana)',
			},
		]);
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Daga')).toBeInTheDocument();
	});

	it('FEAT-attack-library @spell-blocked-alias — disables the blocked entry with the exact tooltip and does not add it', async () => {
		const { onAddAttacks } = renderModal();

		await fireEvent.click(screen.getByRole('button', { name: 'Conjuros' }));
		await screen.findByText('Descarga Elemental');

		expect(screen.getByText('ATQ: — · DMG: 1d8 · Conjuro · tipo elegido')).toBeInTheDocument();

		const blockedButton = getAddButton('Descarga Elemental');
		expect(blockedButton).toBeDisabled();
		expect(blockedButton).toHaveAttribute('title', BLOCKED_SPELL_REASON);

		await fireEvent.click(blockedButton);

		expect(onAddAttacks).not.toHaveBeenCalled();
	});

	it('FEAT-attack-library @search — shows the empty state when no entry matches the search', async () => {
		renderModal();

		await screen.findByText('Daga');
		await fireEvent.input(screen.getByPlaceholderText('Buscar por nombre...'), {
			target: { value: 'zzz' },
		});

		expect(screen.getByText('No se encontraron ataques')).toBeInTheDocument();
		expect(screen.getByText(/0 entradas/)).toBeInTheDocument();
	});

	it('shows the empty state after loading when the active tab has no entries', async () => {
		mocks.loadWeaponEntries.mockResolvedValue([]);
		mocks.loadSpellEntries.mockResolvedValue([]);

		renderModal();

		expect(await screen.findByText('No se encontraron ataques')).toBeInTheDocument();
	});

	it('shows "Cargando…" while the entries load in parallel', async () => {
		const weaponsLoad = deferred<AttackLibraryEntry[]>();
		const spellsLoad = deferred<AttackLibraryEntry[]>();
		mocks.loadWeaponEntries.mockReturnValue(weaponsLoad.promise);
		mocks.loadSpellEntries.mockReturnValue(spellsLoad.promise);

		renderModal();

		expect(screen.getByText('Cargando…')).toBeInTheDocument();
		expect(mocks.loadWeaponEntries).toHaveBeenCalledTimes(1);
		expect(mocks.loadSpellEntries).toHaveBeenCalledTimes(1);

		weaponsLoad.resolve(weaponEntries);
		spellsLoad.resolve(spellEntries);

		expect(await screen.findByText('Daga')).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByText('Cargando…')).not.toBeInTheDocument());
	});

	it('closes with the footer "Cerrar" button', async () => {
		const { onClose } = renderModal();

		await fireEvent.click(screen.getByText('Cerrar'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('closes with the modal ✕ button', async () => {
		const { onClose } = renderModal();

		await fireEvent.click(screen.getByLabelText('Cerrar'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
