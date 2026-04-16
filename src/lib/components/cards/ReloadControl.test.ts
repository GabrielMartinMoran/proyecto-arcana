import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ReloadControl from './ReloadControl.svelte';

describe('ReloadControl', () => {
	describe('render', () => {
		it('renders value, divider, and max inside one compact numeric group', () => {
			const { container } = render(ReloadControl, {
				props: { value: 2, max: 5 },
			});

			const control = container.querySelector('.reload-control.composite-field');
			const numericGroup = control?.querySelector('.numeric-group');
			expect(control).toBeInTheDocument();
			expect(numericGroup).toBeInTheDocument();
			expect(numericGroup?.querySelector('.value-input')).toBeInTheDocument();
			expect(numericGroup?.querySelector('.divider')).toBeInTheDocument();
			expect(numericGroup?.querySelector('.max')).toBeInTheDocument();
			expect(control?.querySelector('.reload-btn')).toBeInTheDocument();
		});

		it('renders the dice button as a separate sibling after the numeric group', () => {
			const { container } = render(ReloadControl, {
				props: { value: 2, max: 5 },
			});

			const control = container.querySelector('.reload-control.composite-field.vertical-center');
			expect(control).toBeInTheDocument();
			expect(Array.from(control?.children ?? []).map((child) => child.classList[0])).toEqual([
				'numeric-group',
				'reload-btn',
			]);
			expect(
				Array.from(control?.querySelector('.numeric-group')?.children ?? []).map(
					(child) => child.classList[0],
				),
			).toEqual(['value-input', 'divider', 'max']);
		});

		it('renders current uses value', () => {
			render(ReloadControl, {
				props: { value: 2, max: 5 },
			});
			const input = screen.getByRole('spinbutton');
			expect(input).toHaveValue(2);
		});

		it('renders "/" divider', () => {
			render(ReloadControl, {
				props: { value: 2, max: 5 },
			});
			expect(screen.getByText('/')).toBeInTheDocument();
		});

		it('renders maximum uses value', () => {
			render(ReloadControl, {
				props: { value: 2, max: 5 },
			});
			expect(screen.getByText('5')).toBeInTheDocument();
		});

		it('renders dice reload button', () => {
			render(ReloadControl, {
				props: { value: 2, max: 5 },
			});
			expect(screen.getByRole('button', { name: '🎲' })).toBeInTheDocument();
		});
	});

	describe('editable', () => {
		it('calls onValueChange when user edits the input', async () => {
			const onValueChange = vi.fn();
			render(ReloadControl, {
				props: { value: 2, max: 5, onValueChange },
			});
			const input = screen.getByRole('spinbutton');
			await fireEvent.input(input, { target: { value: 4 } });
			await tick();
			expect(onValueChange).toHaveBeenCalledWith(4);
		});
	});

	describe('disabled states', () => {
		it('disables reload button when at max uses', () => {
			const onReload = vi.fn();
			render(ReloadControl, {
				props: { value: 5, max: 5, onReload, reloadDisabled: true },
			});
			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('disables reload button when reloadDisabled is true', () => {
			const onReload = vi.fn();
			render(ReloadControl, {
				props: { value: 2, max: 5, onReload, reloadDisabled: true },
			});
			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('calls onReload when reload button is clicked', async () => {
			const onReload = vi.fn();
			render(ReloadControl, {
				props: { value: 2, max: 5, onReload, reloadDisabled: false },
			});
			const button = screen.getByRole('button');
			await fireEvent.click(button);
			expect(onReload).toHaveBeenCalled();
		});
	});
});
