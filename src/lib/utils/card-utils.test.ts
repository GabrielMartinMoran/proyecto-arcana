import { mapAbilityCard } from '$lib/mappers/card-mapper';
import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../../config';
import { clampRemainingUses, getCardTotalUses } from './card-utils';
import type { FormulaContext } from './modifiers-calculator';

const buildContext = (overrides: Partial<FormulaContext> = {}): FormulaContext => ({
	cuerpo: 1,
	reflejos: 1,
	mente: 1,
	instinto: 1,
	presencia: 1,
	ppGastados: 0,
	...overrides,
});

const mappedAbilityCard = (uses?: unknown) => {
	const data: Record<string, unknown> = {
		name: 'Reprensión Infernal',
		level: 1,
		type: 'efecto',
		tags: ['Linaje'],
		description: 'Descripción de la carta',
	};
	if (uses !== undefined) data.uses = uses;
	return mapAbilityCard(data);
};

describe('getCardTotalUses', () => {
	describe('with a uses.formula', () => {
		it('should resolve a plain attribute formula', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'presencia' });

			expect(getCardTotalUses(card, buildContext({ presencia: 4 }))).toBe(4);
		});

		it('should resolve a formula when qty is null', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', qty: null, formula: 'presencia' });

			expect(getCardTotalUses(card, buildContext({ presencia: 4 }))).toBe(4);
		});

		it('should give the formula precedence over qty', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', qty: 2, formula: 'presencia' });

			expect(getCardTotalUses(card, buildContext({ presencia: 4 }))).toBe(4);
		});

		it.each([
			{ reflejos: 8, total: 4 },
			{ reflejos: 4, total: 2 },
			{ reflejos: 1, total: 1 },
			{ reflejos: 0, total: 1 },
		])(
			'should resolve max(1, floor(reflejos/2)) to $total when Reflejos is $reflejos',
			({ reflejos, total }) => {
				const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'max(1, floor(reflejos/2))' });

				expect(getCardTotalUses(card, buildContext({ reflejos }))).toBe(total);
			},
		);

		it('should return null when there is a formula but no context', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'presencia' });

			expect(getCardTotalUses(card)).toBeNull();
		});

		it('should floor a non-integer formula result', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'reflejos/2' });

			expect(getCardTotalUses(card, buildContext({ reflejos: 5 }))).toBe(2);
		});

		it('should clamp a negative formula result to zero', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'cuerpo - 10' });

			expect(getCardTotalUses(card, buildContext({ cuerpo: 3 }))).toBe(0);
		});

		it('should return 0 and warn when the formula is invalid', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const card = mappedAbilityCard({ type: 'LONG_REST', formula: 'presencia +' });

				expect(getCardTotalUses(card, buildContext({ presencia: 4 }))).toBe(0);
				expect(warnSpy).toHaveBeenCalledTimes(1);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should return 0 when the formula is not finite', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST', formula: '1/0' });

			expect(getCardTotalUses(card, buildContext())).toBe(0);
		});
	});

	describe('without a uses.formula', () => {
		it('should stay unlimited when the mapped card has no uses block', () => {
			const card = mappedAbilityCard();

			expect(getCardTotalUses(card, buildContext({ presencia: 4 }))).toBeNull();
		});

		it('should default to zero for a declared type without qty', () => {
			const card = mappedAbilityCard({ type: 'LONG_REST' });

			expect(getCardTotalUses(card, buildContext())).toBe(0);
		});

		it('should keep resolving a declared qty', () => {
			const card = mappedAbilityCard({ type: 'USES', qty: 3 });

			expect(getCardTotalUses(card)).toBe(3);
		});

		it('should keep resolving RELOAD to the configured value', () => {
			const card = mappedAbilityCard({ type: 'RELOAD' });

			expect(getCardTotalUses(card)).toBe(CONFIG.RELOAD_CARD_USES);
		});
	});
});

describe('clampRemainingUses', () => {
	it('should clamp remaining uses down to the total', () => {
		expect(clampRemainingUses(4, 2)).toBe(2);
	});

	it('should keep remaining uses below the total', () => {
		expect(clampRemainingUses(1, 4)).toBe(1);
	});

	it('should keep remaining uses equal to the total', () => {
		expect(clampRemainingUses(4, 4)).toBe(4);
	});

	it('should return null when there are no remaining uses', () => {
		expect(clampRemainingUses(null, 4)).toBeNull();
	});

	it('should keep remaining uses when the total is unlimited', () => {
		expect(clampRemainingUses(4, null)).toBe(4);
	});
});
