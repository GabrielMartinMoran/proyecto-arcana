import { findActorOrTokenActor, safeNum, safeStr } from '../helpers.js';
import { isCharacterURL, isDevelopURL } from '../helpers/actor-urls.js';
import { isInitiativeRoll } from '../helpers/rolls-helper.js';

const MESSAGE_TYPES = {
	PRECALCULATED_ROLL: 'PRECALCULATED_ROLL',
	UPDATE_ACTOR: 'UPDATE_ACTOR',
};

export function setupMessageListener() {
	window.addEventListener('message', async (event) => {
		const data = event.data;
		if (!data) return;

		if (data.type === MESSAGE_TYPES.PRECALCULATED_ROLL) {
			await handlePrecalculatedRoll(data);
		}

		if (data.type === MESSAGE_TYPES.UPDATE_ACTOR) {
			await handleUpdateActor(data);
		}
	});
}

async function handlePrecalculatedRoll(data) {
	try {
		const roll = new Roll(data.formula);
		let resultIndex = 0;
		for (let term of roll.terms) {
			if (term instanceof Die || term.constructor.name === 'Die') {
				const dieCount = term.number;
				const newResults = [];
				for (let i = 0; i < dieCount; i++) {
					const value = data.results[resultIndex];
					if (value !== undefined) {
						newResults.push({
							result: value,
							active: true,
						});
						resultIndex++;
					} else {
						newResults.push({
							result: Math.ceil(Math.random() * term.faces),
							active: true,
						});
					}
				}
				term.results = newResults;
				term._evaluated = true;
			}
		}
		await roll.evaluate();
		await roll.toMessage({ flavor: data.flavor, speaker: ChatMessage.getSpeaker() });

		if (isInitiativeRoll(data)) {
			const combat = game.combat;
			if (combat) {
				const speaker = ChatMessage.getSpeaker();
				let combatant = null;
				if (speaker.token) combatant = combat.combatants.find((c) => c.tokenId === speaker.token);
				else if (speaker.actor)
					combatant = combat.combatants.find((c) => c.actorId === speaker.actor);
				if (combatant) await combat.setInitiative(combatant.id, roll.total);
			}
		}
	} catch (e) {
		console.error(e);
	}
}

async function handleUpdateActor(data) {
	const actor = await (data.uuid ? fromUuid(data.uuid) : findActorOrTokenActor(data.actorId));
	if (actor) {
		const u = {};
		const p = data.payload;
		let hasChanges = false;

		const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
		const isCharacter = isCharacterURL(sheetUrl);

		if (p.name) {
			const oldName = safeStr(actor.name);
			let newName = safeStr(p.name);
			if (isDevelopURL(sheetUrl)) {
				newName = `[DEV] ${newName}`;
			}
			if (newName !== oldName) {
				u['name'] = newName;
				if (actor.isToken) u['token.name'] = newName;
				hasChanges = true;
			}
		}

		if (p.imageUrl) {
			const lastSource = actor.getFlag('arcana', 'imgSource');
			const newSource = safeStr(p.imageSource);
			if (newSource && lastSource) {
				if (newSource !== lastSource) {
					u['img'] = p.imageUrl;
					u['prototypeToken.texture.src'] = p.imageUrl;
					hasChanges = true;
					actor.setFlag('arcana', 'imgSource', newSource);
				}
			} else {
				const oldImg = safeStr(actor.img);
				const newImg = safeStr(p.imageUrl);
				if (oldImg !== newImg) {
					u['img'] = newImg;
					u['prototypeToken.texture.src'] = newImg;
					hasChanges = true;
					if (newSource) actor.setFlag('arcana', 'imgSource', newSource);
				}
			}
		}

		if (p.hp) {
			if (!isCharacter) {
				const currentVal = safeNum(foundry.utils.getProperty(actor, 'system.health.value'));
				const oldMax = safeNum(foundry.utils.getProperty(actor, 'system.health.max'));
				const newMax = safeNum(p.hp.max);
				if (newMax !== oldMax) {
					u['system.health.max'] = newMax;

					if (currentVal > newMax) {
						u['system.health.value'] = newMax;
					}
					hasChanges = true;
				}
			} else {
				const oldVal = safeNum(foundry.utils.getProperty(actor, 'system.health.value'));
				const oldMax = safeNum(foundry.utils.getProperty(actor, 'system.health.max'));
				const newVal = safeNum(p.hp.value);
				const newMax = safeNum(p.hp.max);

				if (newVal !== oldVal) {
					u['system.health.value'] = newVal;
					hasChanges = true;
				}
				if (newMax !== oldMax) {
					u['system.health.max'] = newMax;
					hasChanges = true;
				}
			}
		}

		if (hasChanges) {
			await actor.update(u, { render: false });

			const tokensToUpdate = actor.isToken ? [actor.token] : actor.getActiveTokens();
			const tokenUpdates = {};
			let needsTokenUpdate = false;

			if (u['img']) {
				tokenUpdates['texture.src'] = u['img'];
				needsTokenUpdate = true;
			}
			if (u['name']) {
				tokenUpdates['name'] = u['name'];
				needsTokenUpdate = true;
			}

			for (let t of tokensToUpdate) {
				if (needsTokenUpdate) await t.document.update(tokenUpdates);
				if (p.hp) t.object?.drawBars();
			}

			if (actor.sheet && actor.sheet.rendered && !isCharacter) {
				const html = actor.sheet.element;
				if (u['system.health.max']) {
					html.find("input[name='system.health.max']").val(u['system.health.max']);

					if (actor.isToken) {
						actor.baseActor.update({
							'system.health.max': u['system.health.max'],
						});
					}
				}
				if (u['system.health.value']) {
					html.find("input[name='system.health.value']").val(u['system.health.value']);

					if (actor.isToken) {
						actor.baseActor.update({
							'system.health.value': u['system.health.value'],
						});
					}
				}

				actor.render();
			}

			ui.actors.render();
		}
	}
}
