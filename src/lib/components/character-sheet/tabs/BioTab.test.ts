import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { Character } from '$lib/types/character';
import BioTab from './BioTab.svelte';

const buildCharacter = () =>
	new Character({
		id: 'test-id',
		name: 'Test Character',
		attributes: {
			body: 1,
			reflexes: 1,
			mind: 1,
			instinct: 1,
			presence: 1,
		},
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		skills: [],
		currentHP: 0,
		tempHP: 0,
		currentLuck: 0,
		img: null,
		narrativeContext: {
			appearance: 'Tall',
			background: 'Village',
			beliefs: 'Justice',
		},
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 1,
		version: 1,
	});

describe('BioTab', () => {
	it('renders all narrative textareas with auto-resize class', () => {
		const character = buildCharacter();
		const onChange = vi.fn();

		render(BioTab, {
			props: {
				character,
				readonly: false,
				onChange,
			},
		});

		const textareas = screen.getAllByRole('textbox');
		expect(textareas).toHaveLength(3);
		textareas.forEach((textarea) => {
			expect(textarea).toHaveClass('auto-resize');
		});
	});
});
