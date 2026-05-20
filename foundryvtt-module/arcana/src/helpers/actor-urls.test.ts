import { describe, expect, it, vi } from 'vitest';
import { isCharacter } from './actor-urls';

describe('actor URL classification', () => {
	it.each([
		'https://app.arcana.com/characters/shared/user-1/char-1',
		'https://app.arcana.com/embedded/characters/user-1/char-1',
		'http://localhost:5173/characters/shared/user-1/char-1',
		'http://localhost:5173/embedded/characters/user-1/char-1',
	])(
		'FEAT foundry-v14-health-sync — stored URL %s classifies actor as a character wherever actor branching is used',
		(sheetUrl) => {
			const actor = {
				getFlag: vi.fn((scope: string, key: string) => {
					if (scope === 'arcana' && key === 'sheetUrl') return sheetUrl;
					return undefined;
				}),
			} as any;

			expect(isCharacter(actor)).toBe(true);
		},
	);
});
