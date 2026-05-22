import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	rollExpression: vi.fn(),
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: mocks.rollExpression,
	}),
}));

import InlineRollText from './InlineRollText.svelte';

describe('InlineRollText', () => {
	beforeEach(() => {
		mocks.rollExpression.mockClear();
	});

	it('FEAT-statblock-inline-dice @rendering — renders formula buttons without losing prose', () => {
		render(InlineRollText, {
			props: {
				text: 'Inflige 1d6 de daño',
				rollTitle: 'Golpe brutal',
			},
		});

		expect(document.body).toHaveTextContent('Inflige');
		expect(screen.getByRole('button', { name: '1d6 🎲' })).toBeInTheDocument();
		expect(document.body).toHaveTextContent('de daño');
	});

	it('FEAT-statblock-inline-dice @rolling — rolls normalized expression directly with source title', async () => {
		render(InlineRollText, {
			props: {
				text: 'Inflige 1d8+1 de daño',
				rollTitle: 'Golpe brutal',
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8+1 🎲' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8+1',
			title: 'Golpe brutal',
		});
	});

	it('FEAT-statblock-inline-dice @xss — escapes hostile text while keeping formula buttons', () => {
		render(InlineRollText, {
			props: {
				text: '<img src=x onerror=alert(1)> causa 1d6',
				rollTitle: 'Texto hostil',
			},
		});

		expect(screen.getByText('<img src=x onerror=alert(1)> causa')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '1d6 🎲' })).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
