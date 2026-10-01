import { mapAbilityCard } from '$lib/mappers/card-mapper';
import type { FormulaContext } from '$lib/utils/modifiers-calculator';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Card from './Card.svelte';

const buildContext = (overrides: Partial<FormulaContext> = {}): FormulaContext => ({
	cuerpo: 1,
	reflejos: 1,
	mente: 1,
	instinto: 1,
	presencia: 1,
	ppGastados: 0,
	...overrides,
});

const mapFormulaCard = (uses: unknown) =>
	mapAbilityCard({
		name: 'Reprensión Infernal',
		level: 1,
		type: 'efecto',
		tags: ['Linaje'],
		description: 'La usas un número de veces por día de descanso igual a tu Presencia',
		uses,
	});

describe('Card uses chip', () => {
	it('FEAT-card-uses-formula @character-sheet — shows the computed total for a formula card when the character context is provided', () => {
		render(Card, {
			props: {
				card: mapFormulaCard({ type: 'LONG_REST', formula: 'presencia' }),
				formulaContext: buildContext({ presencia: 4 }),
			},
		});

		expect(screen.getByText('Usos: 4')).toBeInTheDocument();
	});

	it('FEAT-card-uses-formula @library @rendering — hides the uses chip for a formula card without a character context', () => {
		render(Card, {
			props: {
				card: mapFormulaCard({ type: 'LONG_REST', formula: 'presencia' }),
			},
		});

		expect(screen.queryByText(/Usos:/)).not.toBeInTheDocument();
	});

	it('keeps the legacy uses chip for a card without a formula', () => {
		render(Card, {
			props: {
				card: mapFormulaCard({ type: 'LONG_REST', qty: 3 }),
				formulaContext: buildContext({ presencia: 4 }),
			},
		});

		expect(screen.getByText('Usos: 3 por día de descanso')).toBeInTheDocument();
	});
});
