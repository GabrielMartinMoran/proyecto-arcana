import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { CONFIG } from '../config.js';

let client: ChatOpenAI | null = null;
const getClient = () => {
	if (!client) {
		client = new ChatOpenAI({
			model: CONFIG.OPENAI_MODEL,
			apiKey: CONFIG.OPENAI_API_KEY,
			maxTokens: 200,
		});
	}
	return client;
};

export const generateSummary = async (
	sectionTitle: string,
	content: string,
	contextHint: string,
): Promise<string> => {
	if (CONFIG.SKIP_AI || !CONFIG.OPENAI_API_KEY) return '';

	const prompt = `Eres un asistente experto en el sistema de rol ARCANA.
Escribe una introducción/resumen breve (2-4 oraciones en español) para la sección "${sectionTitle}".
El resumen debe ser conciso y útil como contexto para un LLM que consulte esta documentación.
Contexto: ${contextHint}

Contenido:
${content.slice(0, 3000)}`;

	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await getClient().invoke([new HumanMessage(prompt)]);
			return (res.content as string).trim();
		} catch (err: any) {
			if (attempt === 3) {
				console.warn(
					`  [AI] Giving up on "${sectionTitle}" after 3 attempts: ${err?.message ?? err}`,
				);
				return '';
			}
			const delay = Math.pow(2, attempt) * 1000;
			console.warn(
				`  [AI] Attempt ${attempt} failed for "${sectionTitle}" (${err?.message ?? err}), retrying in ${delay}ms...`,
			);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	return '';
};
