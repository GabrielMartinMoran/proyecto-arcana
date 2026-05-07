import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('does not apply auto-resize class by default', () => {
		render(TextField, {
			props: {
				value: '',
				readonly: false,
				onChange: vi.fn(),
			},
		});

		const textarea = screen.getByRole('textbox');
		expect(textarea).not.toHaveClass('auto-resize');
	});

	it('applies auto-resize class when autoResize is true', () => {
		render(TextField, {
			props: {
				value: '',
				readonly: false,
				onChange: vi.fn(),
				autoResize: true,
			},
		});

		const textarea = screen.getByRole('textbox');
		expect(textarea).toHaveClass('auto-resize');
	});
});
