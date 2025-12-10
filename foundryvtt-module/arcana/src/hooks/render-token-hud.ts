import { isCharacter } from '../helpers/actor-urls';
import type { TokenDocumentData } from '../types/actor';

interface TokenHUDApp {
	object: {
		document: TokenDocumentData;
	};
}

export function renderTokenHUD(app: TokenHUDApp, html: JQuery): void {
	const $html = $(html);
	const tokenDocument = app.object.document;

	console.log('TOKEN DOC', tokenDocument);
	console.log('IS CHARACTER', isCharacter(tokenDocument.baseActor));

	// Solo si es PJ (Linkeado)
	if (tokenDocument.actorLink && isCharacter(tokenDocument.baseActor)) {
		// Selector específico: Solo Barra 1 y 2
		const barInputs = $html.find('.attribute.bar1 input, .attribute.bar2 input');

		if (barInputs.length > 0) {
			barInputs.prop('disabled', true);
			barInputs.css({
				opacity: '0.5',
				cursor: 'not-allowed',
				'background-color': '#222',
				color: '#999',
				border: '1px solid #444',
			});
			barInputs.attr('title', 'Vida gestionada por la web.');
		}
	}
}
