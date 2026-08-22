import type { ContentIndexEntry } from '../../../types/content-index.js';
import type {
	AgentSearchResult,
	RankedResult,
	SearchDetailResult,
	SearchIntention,
	SearchOutput,
	SearchStatus,
} from './types.js';

/**
 * Agent-facing projection.
 *
 * The default output is deliberately minimal: `{ status, results, nextAction }`
 * where each result is `{ rank, confidence, kind, name, source }`. Rich detail
 * (score, match fields, metadata) is produced only for `--explain`/`--debug`.
 * `source` is the workspace-relative path plus the real anchor when present, so
 * the agent can open exactly the referenced section.
 */

export const buildSource = (entry: ContentIndexEntry): string =>
	entry.anchor ? `${entry.path}#${entry.anchor}` : entry.path;

export const toAgentResult = (result: RankedResult): AgentSearchResult => ({
	rank: result.rank,
	confidence: result.confidence,
	kind: result.entry.kind,
	name: result.entry.canonicalName,
	source: buildSource(result.entry),
});

export const toDetailResult = (
	result: RankedResult,
	intention: SearchIntention,
): SearchDetailResult => ({
	rank: result.rank,
	confidence: result.confidence,
	kind: result.entry.kind,
	name: result.entry.canonicalName,
	source: buildSource(result.entry),
	id: result.entry.id,
	slug: result.entry.slug,
	score: result.score,
	matchType: result.matchType,
	matchedFields: result.matchedFields,
	level: result.entry.level,
	tags: result.entry.tags,
	path: result.entry.path,
	heading: result.entry.heading,
	anchor: result.entry.anchor,
	chapter: result.entry.chapter,
	dataset: result.entry.source,
	// T6 diagnostics: significant-term coverage, unmatched terms, lane and
	// matched terms. Only ever surfaced behind `--explain`; the agent-facing
	// projection (`toAgentResult`) stays minimal.
	coverage: result.coverage,
	unmatchedTerms: result.unmatchedTerms,
	lane: result.lane,
	matchedTerms: result.matchedTerms,
	// T7 query-level intention label (shared by every result of the query),
	// likewise only surfaced behind `--explain`.
	intention,
});

const nextActionFor = (status: SearchStatus, count: number): string => {
	switch (status) {
		case 'found':
			return count > 1
				? `Abrir el resultado 1 y responder citando esa sección; si no responde a la intención, continuar con el siguiente resultado de la lista sin repetir la consulta.`
				: `Abrir el resultado 1 y responder citando esa sección.`;
		case 'ambiguous':
			return 'Pedir al usuario que elija entre las alternativas antes de responder; no tratar ninguna como normativa sin verificar su fuente.';
		case 'not_found':
			return count > 0
				? 'No hay una fuente con confianza suficiente; las sugerencias están marcadas con confianza baja y requieren verificación antes de responder. No inventar reglas.'
				: 'No existe una fuente suficiente en el índice; declarar la ausencia sin inventar una regla ni una fuente.';
		case 'invalid_query':
		default:
			return 'Consulta inválida; proporcionar un término o frase para buscar.';
	}
};

export const projectSearchOutput = (
	selected: RankedResult[],
	status: SearchStatus,
): SearchOutput => ({
	status,
	results: selected.map(toAgentResult),
	nextAction: nextActionFor(status, selected.length),
});

export const projectSearchDetail = (
	selected: RankedResult[],
	intention: SearchIntention,
): SearchDetailResult[] => selected.map((result) => toDetailResult(result, intention));
