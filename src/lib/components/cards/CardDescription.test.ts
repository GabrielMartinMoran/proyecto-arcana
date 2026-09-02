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

import CardDescription from './CardDescription.svelte';

const context = (variables: Record<string, number>, title = 'Mi carta') => ({ variables, title });

describe('CardDescription', () => {
	beforeEach(() => {
		mocks.rollExpression.mockClear();
	});

	it('FEAT-card-inline-dice @rendering — renders markdown prose with no buttons when no context is provided', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '**Potente:** 1d6 de daño',
			},
		});

		expect(container.querySelector('strong')).toHaveTextContent('Potente:');
		expect(document.body).toHaveTextContent('1d6 de daño');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-dice @rendering — keeps a pure numeric formula read-only without context', () => {
		render(CardDescription, {
			props: {
				description: 'Inflige 1d6 de daño',
			},
		});

		expect(document.body).toHaveTextContent('Inflige 1d6 de daño');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-dice @rendering — renders one formula as an accessible button with the human readable label', () => {
		render(CardDescription, {
			props: {
				description: 'Inflige 1d8 + 2 de daño',
				rollContext: context({}),
			},
		});

		expect(document.body).toHaveTextContent('Inflige');
		expect(screen.getByRole('button', { name: '1d8 + 2 🎲' })).toBeInTheDocument();
		expect(document.body).toHaveTextContent('de daño');
	});

	it('FEAT-card-inline-dice @multiple-formulas — renders several formula buttons in source order', () => {
		render(CardDescription, {
			props: {
				description: 'Recupera 1d6 + 5 + 4d2 y luego 2d6 + 3',
				rollContext: context({}),
			},
		});

		const buttons = screen.getAllByRole('button');
		expect(buttons.map((button) => button.textContent)).toEqual(['1d6 + 5 + 4d2 🎲', '2d6 + 3 🎲']);
		expect(document.body).toHaveTextContent('Recupera');
		expect(document.body).toHaveTextContent('y luego');
	});

	it('FEAT-card-inline-dice @attributes — rolls a canonical attribute formula with its variables and card name as title', async () => {
		const variables = { Cuerpo: 3, Reflejos: 2, Mente: 1, Instinto: 4, Presencia: 5 };
		render(CardDescription, {
			props: {
				description: 'Recupera 1d8 + Mente y 1d4 + Cuerpo',
				rollContext: context(variables, 'Festín Macabro'),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8 + Mente 🎲' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8+Mente',
			variables,
			title: 'Festín Macabro',
		});
	});

	it('FEAT-card-inline-dice @aliases — renders a resolved alias formula with its normalized expression', async () => {
		const variables = { AtributoMarcial: 3 };
		render(CardDescription, {
			props: {
				description: 'Recuperar 1d4 + Atributo Marcial',
				rollContext: context(variables, 'Maestría Marcial'),
			},
		});

		const button = screen.getByRole('button', { name: '1d4 + Atributo Marcial 🎲' });
		await fireEvent.click(button);

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d4+AtributoMarcial',
			variables,
			title: 'Maestría Marcial',
		});
	});

	it('FEAT-card-inline-dice @aliases — keeps an unresolved alias as prose with no partial button', () => {
		render(CardDescription, {
			props: {
				description: 'Recupera 2d6 + Atributo Arcano',
				rollContext: context({ Mente: 4 }),
			},
		});

		expect(document.body).toHaveTextContent('Recupera 2d6 + Atributo Arcano');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-dice @rendering — preserves markdown prose around formula segments', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '**Potente:** 1d6 con <br> salto de línea',
				rollContext: context({}),
			},
		});

		expect(container.querySelector('strong')).toHaveTextContent('Potente:');
		expect(container.querySelector('br')).not.toBeNull();
		expect(screen.getByRole('button', { name: '1d6 🎲' })).toBeInTheDocument();
	});

	it('FEAT-card-inline-dice @xss — sanitizes hostile markup while keeping formula buttons', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '<img src=x onerror=alert(1)> causa 1d6',
				rollContext: context({}),
			},
		});

		expect(screen.getByRole('button', { name: '1d6 🎲' })).toBeInTheDocument();
		expect(document.body).toHaveTextContent('causa');
		expect(container.querySelector('[onerror]')).toBeNull();
		expect(container.querySelector('script')).toBeNull();
	});

	it('FEAT-card-inline-dice @markdown-inline — keeps two formula buttons inline inside one Markdown paragraph', () => {
		const { container } = render(CardDescription, {
			props: {
				description:
					'_Una liana espinosa brota de tu mano como una extensión de tu voluntad._<br>Realizas un ataque de conjuro (1d8e + tu Instinto) a distancia Cercana. Si impactas, infliges 1d6 de daño Cortante.<br>El objetivo debe superar una Tirada de Salvación.',
				rollContext: context({ Instinto: 4, Mente: 3 }, 'Látigo de Espinas'),
			},
		});

		const buttons = screen.getAllByRole('button');
		expect(buttons.map((button) => button.textContent)).toEqual([
			'1d8💥 + tu Instinto 🎲',
			'1d6 🎲',
		]);
		expect(container.querySelectorAll('p')).toHaveLength(0);
		expect(container.querySelector('em')).toHaveTextContent(
			'Una liana espinosa brota de tu mano como una extensión de tu voluntad.',
		);
		expect(container.querySelector('br')).not.toBeNull();
		expect(document.body).toHaveTextContent('Realizas un ataque de conjuro');
		expect(document.body).toHaveTextContent('una Tirada de Salvación');
	});

	it('FEAT-card-inline-dice @explosive @rendering @rolling — shows the explosion marker but sends the e expression, variables and card title', async () => {
		const variables = { Instinto: 4, Mente: 3 };
		render(CardDescription, {
			props: {
				description: 'Realizas un ataque de conjuro 1d8e + tu Instinto a distancia Cercana',
				rollContext: context(variables, 'Látigo de Espinas'),
			},
		});

		const button = screen.getByRole('button', { name: '1d8💥 + tu Instinto 🎲' });
		await fireEvent.click(button);

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8e+Instinto',
			variables,
			title: 'Látigo de Espinas',
		});
	});

	it('FEAT-card-inline-dice @explosive @damage — marks only the explosive attack while a plain d8 damage stays unmarked', () => {
		render(CardDescription, {
			props: {
				description:
					'Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño del tipo elegido.',
				rollContext: context({ Presencia: 5 }, 'Descarga Sobrenatural'),
			},
		});

		const buttons = screen.getAllByRole('button');
		expect(buttons.map((button) => button.textContent)).toEqual(['1d8💥 + Presencia 🎲', '1d8 🎲']);
	});

	it('FEAT-card-inline-dice @explosive @title — routes the attack title only to the explosive formula and keeps the default title for plain damage', async () => {
		const variables = { Presencia: 5 };
		render(CardDescription, {
			props: {
				description:
					'Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño.',
				rollContext: {
					variables,
					title: 'Ayla: Descarga Sobrenatural',
					attackTitle: 'Ayla: Ataque con Descarga Sobrenatural',
				},
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8💥 + Presencia 🎲' }));
		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8e+Presencia',
			variables,
			title: 'Ayla: Ataque con Descarga Sobrenatural',
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8 🎲' }));
		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8',
			variables,
			title: 'Ayla: Descarga Sobrenatural',
		});
	});

	it('FEAT-card-inline-dice @explosive @title — keeps the default title when no attack title is provided', async () => {
		const variables = { Presencia: 5 };
		render(CardDescription, {
			props: {
				description: 'Realizas un ataque de conjuro 1d8e + Presencia a distancia Media',
				rollContext: context(variables, 'Descarga Sobrenatural'),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8💥 + Presencia 🎲' }));
		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8e+Presencia',
			variables,
			title: 'Descarga Sobrenatural',
		});
	});

	it('FEAT-card-inline-dice @explosive @rendering — replaces an uppercase explosive suffix only on the dice token', async () => {
		const variables = { Presencia: 5 };
		render(CardDescription, {
			props: {
				description: 'Clava 1D8E + tu Presencia cerca de una letra e',
				rollContext: context(variables, 'Ejemplo'),
			},
		});

		const button = screen.getByRole('button', { name: '1D8💥 + tu Presencia 🎲' });
		await fireEvent.click(button);

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8e+Presencia',
			variables,
			title: 'Ejemplo',
		});
	});

	it('FEAT-card-inline-dice @rendering — keeps the no-context description as one normal paragraph', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '**Potente:** 1d6 de daño',
			},
		});

		const paragraphs = container.querySelectorAll('p');
		expect(paragraphs).toHaveLength(1);
		expect(paragraphs[0]).toHaveTextContent('Potente:');
		expect(paragraphs[0]).toHaveTextContent('1d6 de daño');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @difficulties @character-sheet — renders a resolved difficulty without creating a partial dice button', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'El objetivo debe superar ND 5 + tu Instinto',
				rollContext: context({ Instinto: 4 }),
			},
		});

		expect(container.querySelector('.inline-difficulty__formula')).toHaveTextContent(
			'ND 5 + tu Instinto',
		);
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 9',
		);
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @difficulties @multiple-formulas — renders the difficulty and a real dice button in source order', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'El objetivo debe superar ND 5 + tu Instinto e inflige 1d6 de daño',
				rollContext: context({ Instinto: 4 }),
			},
		});

		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 9',
		);
		expect(screen.getByRole('button', { name: '1d6 🎲' })).toBeInTheDocument();
		expect(document.body).toHaveTextContent('El objetivo debe superar');
		expect(document.body).toHaveTextContent('e inflige');
		expect(document.body).toHaveTextContent('de daño');

		const html = container.innerHTML;
		expect(html.indexOf('inline-difficulty')).toBeGreaterThan(-1);
		expect(html.indexOf('inline-roll')).toBeGreaterThan(-1);
		expect(html.indexOf('inline-difficulty')).toBeLessThan(html.indexOf('inline-roll'));
	});

	it('FEAT-card-inline-difficulties @difficulties @read-only — keeps an ND expression as plain prose without a character context', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'El objetivo debe superar ND 5 + tu Instinto',
			},
		});

		expect(container.querySelector('.inline-difficulty')).toBeNull();
		expect(document.body).toHaveTextContent('ND 5 + tu Instinto');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @difficulties @unresolved — keeps an unresolved alias difficulty as prose with no calculated result or partial button', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'El objetivo debe superar ND 5 + tu Atributo Arcano',
				rollContext: context({ Mente: 4 }),
			},
		});

		expect(container.querySelector('.inline-difficulty')).toBeNull();
		expect(document.body).toHaveTextContent('ND 5 + tu Atributo Arcano');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @difficulties @aliases — calculates the difficulty from a resolved arcane alias', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'El objetivo debe superar ND 5 + tu Atributo Arcano',
				rollContext: context({ AtributoArcano: 5 }),
			},
		});

		expect(container.querySelector('.inline-difficulty__formula')).toHaveTextContent(
			'ND 5 + tu Atributo Arcano',
		);
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 10',
		);
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('FEAT-card-inline-difficulties @difficulties @markdown-inline — preserves strong and br markup around the difficulty part', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '**Potente:** supera ND 5 + tu Instinto <br> y continúa',
				rollContext: context({ Instinto: 4 }),
			},
		});

		expect(container.querySelector('strong')).toHaveTextContent('Potente:');
		expect(container.querySelector('br')).not.toBeNull();
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 9',
		);
		expect(document.body).toHaveTextContent('y continúa');
	});

	it('FEAT-card-inline-difficulties @difficulties @xss — sanitizes hostile markup while rendering the difficulty', () => {
		const { container } = render(CardDescription, {
			props: {
				description: '<img src=x onerror=alert(1)> supera ND 5 + tu Instinto',
				rollContext: context({ Instinto: 4 }),
			},
		});

		expect(container.querySelector('[onerror]')).toBeNull();
		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('.inline-difficulty > span:not([class])')).toHaveTextContent(
			'ND 9',
		);
		expect(document.body).toHaveTextContent('supera');
	});

	it('FEAT-card-inline-difficulties @aliases — keeps the Coraza Vital alias formula as a real button when the alias is resolved', () => {
		render(CardDescription, {
			props: {
				description: 'obtienes 1d4 + tu Atributo Arcano temporal',
				rollContext: context({ AtributoArcano: 3 }),
			},
		});

		expect(screen.getByRole('button', { name: '1d4 + tu Atributo Arcano 🎲' })).toBeInTheDocument();
	});

	it('FEAT-card-inline-difficulties @aliases — keeps the Coraza Vital alias formula as prose when the alias is unresolved', () => {
		const { container } = render(CardDescription, {
			props: {
				description: 'obtienes 1d4 + tu Atributo Arcano temporal',
				rollContext: context({ Mente: 4 }),
			},
		});

		expect(screen.queryByRole('button')).toBeNull();
		expect(container.querySelector('.inline-difficulty')).toBeNull();
		expect(document.body).toHaveTextContent('1d4 + tu Atributo Arcano temporal');
	});
});
