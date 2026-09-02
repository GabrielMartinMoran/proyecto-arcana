import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { CardInlineDifficultyPart } from '$lib/utils/card-inline-difficulties';
import InlineDifficulty from './InlineDifficulty.svelte';

type DifficultyPart = Extract<CardInlineDifficultyPart, { type: 'difficulty' }>;

const difficulty = (overrides: Partial<DifficultyPart> = {}): DifficultyPart => ({
	type: 'difficulty',
	display: 'ND 5 + tu Instinto',
	base: 5,
	variableName: 'Instinto',
	span: { start: 0, end: 18 },
	suffix: '',
	result: 9,
	...overrides,
});

describe('InlineDifficulty', () => {
	it('FEAT-card-inline-difficulties @responsive — renders the original formula and the calculated result', () => {
		const { container } = render(InlineDifficulty, { props: { difficulty: difficulty() } });

		expect(container.querySelector('.inline-difficulty__formula')).toHaveTextContent(
			'ND 5 + tu Instinto',
		);
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 9',
		);
	});

	it('FEAT-card-inline-difficulties @responsive — keeps both the formula and the result markup nodes for the touch and fine-pointer branches', () => {
		const { container } = render(InlineDifficulty, { props: { difficulty: difficulty() } });

		const formula = container.querySelector('.inline-difficulty__formula');
		const result = container.querySelector('.inline-difficulty > span:not([class])');

		expect(formula).not.toBeNull();
		expect(result).not.toBeNull();
		// The formula is hidden from assistive tech on fine-pointer branches
		// while the result span stays visible without a hidden toggle.
		expect(formula?.getAttribute('aria-hidden')).toBe('true');
		expect(result?.getAttribute('hidden')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @rendering — preserves the original display and its canonical plus operator', () => {
		const { container } = render(InlineDifficulty, {
			props: { difficulty: difficulty({ display: 'ND 7+Instinto', base: 7, result: 11 }) },
		});

		expect(container.querySelector('.inline-difficulty__formula')).toHaveTextContent(
			'ND 7+Instinto',
		);
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 11',
		);
		expect(document.body).not.toHaveTextContent('más');
	});

	it('FEAT-card-inline-difficulties @responsive — exposes the formula as a desktop title', () => {
		const { container } = render(InlineDifficulty, { props: { difficulty: difficulty() } });

		expect(container.querySelector('.inline-difficulty')).toHaveAttribute(
			'title',
			'ND 5 + tu Instinto',
		);
		// The calculated-result prefix lives in the accessible description.
		expect(container.querySelector('.inline-difficulty__description')?.textContent).toContain(
			'calculada a partir de',
		);
	});

	it('FEAT-card-inline-difficulties @a11y — exposes an accessible description with result and formula beyond the title', () => {
		const { container } = render(InlineDifficulty, { props: { difficulty: difficulty() } });

		const description = container.querySelector('.inline-difficulty__description');
		expect(description).not.toBeNull();
		expect(description?.textContent).toContain('ND 9');
		expect(description?.textContent).toContain('ND 5 + tu Instinto');
	});

	it('FEAT-card-inline-difficulties @a11y — renders a non-interactive inline element without button semantics', () => {
		const { container } = render(InlineDifficulty, { props: { difficulty: difficulty() } });

		expect(container.querySelector('.inline-difficulty')?.tagName).toBe('SPAN');
		expect(container.querySelector('.inline-difficulty')?.getAttribute('role')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});
});
