import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const EVALS_PATH = path.resolve(
	import.meta.dirname,
	'..',
	'evals',
	'arcana-reference-routing.json',
);

interface RoutingEval {
	id: number;
	name: string;
	prompt: string;
	expected_route: {
		status: string;
		kind?: string;
		family?: string;
		command?: string;
		[key: string]: unknown;
	};
	expected_output: string;
	expectations: string[];
	assertions: string[];
}

interface RoutingEvalsFile {
	skill_name: string;
	evals: RoutingEval[];
}

const readEvals = (): RoutingEvalsFile => {
	assert.ok(fs.existsSync(EVALS_PATH), `missing evals file at ${EVALS_PATH}`);
	return JSON.parse(fs.readFileSync(EVALS_PATH, 'utf-8')) as RoutingEvalsFile;
};

describe('routing evals contract (T4 req 9)', () => {
	const evalsFile = readEvals();

	test('evaluates the arcana-reference skill', () => {
		assert.equal(evalsFile.skill_name, 'arcana-reference');
	});

	test('contains the required routing cases', () => {
		const names = evalsFile.evals.map((entry) => entry.name.toLocaleLowerCase());
		const requiredCases: { id: string; keywords: string[] }[] = [
			{ id: 'ventaja (manual del jugador)', keywords: ['ventaja'] },
			{ id: 'cartas de bardo de nivel 2 y 3', keywords: ['bardo'] },
			{ id: 'pacto supremo (slug canonico)', keywords: ['pacto'] },
			{ id: 'objetos de nivel 3 con etiqueta Utilidad', keywords: ['objeto'] },
			{ id: 'liche (bestiario sin rango)', keywords: ['liche'] },
			{ id: 'diseno avanzado de criaturas PPF', keywords: ['ppf'] },
			{ id: 'typo de Ciclope (fuzzy)', keywords: ['ciclope'] },
			{ id: 'consulta ambigua', keywords: ['ambig'] },
			{ id: 'consulta no encontrada', keywords: ['encontrad', 'not_found', 'not-found'] },
			{ id: 'fallback a la siguiente fuente', keywords: ['fallback'] },
		];
		for (const required of requiredCases) {
			const found = names.some((name) =>
				required.keywords.some((keyword) => name.includes(keyword)),
			);
			assert.ok(
				found,
				`evals must include a case for "${required.id}" (keywords: ${required.keywords.join(' | ')})`,
			);
		}
	});

	test('each eval carries a prompt, an expected route, expectations and objective assertions', () => {
		assert.ok(evalsFile.evals.length >= 10, 'at least ten routing cases expected');
		for (const entry of evalsFile.evals) {
			assert.ok(
				typeof entry.prompt === 'string' && entry.prompt.length > 0,
				`eval ${entry.id} prompt`,
			);
			assert.ok(
				entry.expected_route && typeof entry.expected_route === 'object',
				`eval ${entry.id} route`,
			);
			assert.match(
				entry.prompt,
				/arcana|pacto|bardo|ventaja|criatura|objeto|ppf|cilop|ciclope|ciclpe|mag|zombi|vampir|liche|utilidad|nivel|puntos/i,
			);
			assert.ok(entry.expected_output.length > 0, `eval ${entry.id} expected_output`);
			assert.ok(
				Array.isArray(entry.expectations) && entry.expectations.length > 0,
				`eval ${entry.id} expectations`,
			);
			assert.ok(
				Array.isArray(entry.assertions) && entry.assertions.length > 0,
				`eval ${entry.id} assertions`,
			);
		}
	});

	test('every expected route uses a valid CLI search status and command', () => {
		const statuses = ['found', 'ambiguous', 'not_found', 'invalid_query'];
		for (const entry of evalsFile.evals) {
			assert.ok(
				statuses.includes(entry.expected_route.status),
				`eval ${entry.id} has invalid status ${entry.expected_route.status}`,
			);
			if (entry.expected_route.command) {
				assert.ok(
					entry.expected_route.command.includes('node dist/index.js search'),
					`eval ${entry.id} command must use node dist/index.js search`,
				);
			}
		}
	});

	test('evals are static and deterministic: no LLM invocation, no invented results', () => {
		const payload = JSON.stringify(evalsFile);
		assert.match(payload, /static|deterministic|sin LLM|no LLM/i);
		assert.ok(
			!payload.includes('"transcript"') && !payload.includes('"actual_output"'),
			'evals must not embed invented run results',
		);
	});
});
