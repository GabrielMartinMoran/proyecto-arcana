import type { Card } from '$lib/types/cards/card';
import type { CharacterCard } from '$lib/types/character';
import { generateId } from '$lib/utils/id-generator';
import { describe, expect, it } from 'vitest';
import {
	applyParentDeactivation,
	applyParentRemoval,
	getAssociatedDescendants,
	getOwnedParentCandidates,
	getSlotConsumingActiveCards,
	hasValidCardLink,
	isEffectiveSlotExemption,
	isInactiveActivableOrigin,
	validateCardAssociation,
} from './card-association-utils';

const canonicalCard = (name: string, overrides: Partial<Card> = {}): Card => ({
	id: generateId(name),
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: '',
	uses: { qty: 0, type: null },
	type: 'activable',
	cardType: 'ability',
	...overrides,
});

const ownedCard = (id: string, overrides: Partial<CharacterCard> = {}): CharacterCard => ({
	id,
	uses: 2,
	level: 1,
	isActive: true,
	cardType: 'ability',
	isOvercharged: false,
	...overrides,
});

const withUses = (qty: number) => ({ qty, type: 'USES' as const });

const disciplinaMonastica = canonicalCard('Disciplina Monástica', {
	uses: withUses(3),
});
const artesMarciales = canonicalCard('Artes Marciales', {
	requirements: 'Disciplina Monástica',
	uses: withUses(3),
});
const sintonica = canonicalCard('Sintonía con el Acero');
const sintoniaFluida = canonicalCard('Sintonía Fluida');
const espadachin = canonicalCard('Espadachín', {
	requirements: 'Sintonía con el Acero | Sintonía Fluida',
});
const pactoSupremo = canonicalCard('Pacto Supremo', { uses: withUses(3) });
const fuegoRapido = canonicalCard('Fuego Rápido', { uses: withUses(2) });
const pasoCosmico = canonicalCard('Paso Cósmico', { uses: withUses(2) });
const estirpeDracnica = { ...canonicalCard('Estirpe Dracónica'), id: 'custom-dragon' };
const alientoDracnico = canonicalCard('Aliento Dracónico', { requirements: 'Estirpe Dracónica' });
const efectoPasivo = canonicalCard('Beneficio Pasivo', { type: 'efecto' });
const consumiblePocion = canonicalCard('Poción de Curación', {
	type: 'consumible',
	cardType: 'item',
});

describe('CharacterCard.grantedBy', () => {
	it('should persist an optional grantedBy link without breaking cards that omit it', () => {
		const linked: CharacterCard = {
			id: 'linked-card',
			uses: 1,
			level: 1,
			isActive: true,
			cardType: 'ability',
			isOvercharged: false,
			grantedBy: 'parent-id',
		};
		const unlinked: CharacterCard = {
			id: 'plain-card',
			uses: 1,
			level: 1,
			isActive: true,
			cardType: 'ability',
			isOvercharged: false,
		};
		const unlinkedNull: CharacterCard = {
			id: 'null-card',
			uses: 1,
			level: 1,
			isActive: true,
			cardType: 'ability',
			isOvercharged: false,
			grantedBy: null,
		};

		expect(linked.grantedBy).toBe('parent-id');
		expect(unlinked.grantedBy).toBeUndefined();
		expect(unlinkedNull.grantedBy).toBeNull();
	});
});

describe('getOwnedParentCandidates', () => {
	it('should return only owned and resolvable candidates, excluding the child itself', () => {
		const child = ownedCard(artesMarciales.id);
		const parent = ownedCard(disciplinaMonastica.id, { isActive: false });
		const unrelated = ownedCard(pactoSupremo.id);
		const orphan = ownedCard('missing-definition-id');
		const allCards = [artesMarciales, disciplinaMonastica, pactoSupremo];

		const candidates = getOwnedParentCandidates(
			child,
			[child, parent, unrelated, orphan],
			allCards,
		);

		expect(candidates.map((candidate) => candidate.card.id)).toEqual([
			disciplinaMonastica.id,
			pactoSupremo.id,
		]);
		expect(candidates.map((candidate) => candidate.isActive)).toEqual([false, true]);
	});

	it('should mark and order first the candidate that fulfills a simple requirement', () => {
		const child = ownedCard(artesMarciales.id);
		const parent = ownedCard(disciplinaMonastica.id);
		const unrelated = ownedCard(pactoSupremo.id);
		const allCards = [artesMarciales, disciplinaMonastica, pactoSupremo];

		const candidates = getOwnedParentCandidates(child, [child, parent, unrelated], allCards);

		expect(candidates[0].card.id).toBe(disciplinaMonastica.id);
		expect(candidates[0].fulfillsRequirement).toBe(true);
		expect(candidates[1].card.id).toBe(pactoSupremo.id);
		expect(candidates[1].fulfillsRequirement).toBe(false);
	});

	it('should mark every alternative that fulfills an OR requirement without choosing one', () => {
		const child = ownedCard(espadachin.id);
		const first = ownedCard(sintonica.id);
		const second = ownedCard(sintoniaFluida.id);
		const unrelated = ownedCard(pactoSupremo.id);
		const allCards = [espadachin, sintonica, sintoniaFluida, pactoSupremo];

		const candidates = getOwnedParentCandidates(child, [child, first, second, unrelated], allCards);

		expect(candidates.map((candidate) => candidate.card.id)).toEqual([
			sintonica.id,
			sintoniaFluida.id,
			pactoSupremo.id,
		]);
		expect(candidates.map((candidate) => candidate.fulfillsRequirement)).toEqual([
			true,
			true,
			false,
		]);
	});

	it('should accept owned custom cards and identify them as custom', () => {
		const child = ownedCard(alientoDracnico.id);
		const custom = ownedCard(estirpeDracnica.id);
		const unrelated = ownedCard(disciplinaMonastica.id);
		const allCards = [alientoDracnico, estirpeDracnica, disciplinaMonastica];

		const candidates = getOwnedParentCandidates(child, [child, custom, unrelated], allCards);

		expect(candidates[0].card.id).toBe(estirpeDracnica.id);
		expect(candidates[0].isCustom).toBe(true);
		expect(candidates[0].fulfillsRequirement).toBe(true);
		expect(candidates[1].fulfillsRequirement).toBe(false);
	});

	it('should not mark any candidate when the child has no requirement', () => {
		const child = ownedCard(disciplinaMonastica.id);
		const other = ownedCard(pactoSupremo.id);
		const allCards = [disciplinaMonastica, pactoSupremo];

		const candidates = getOwnedParentCandidates(child, [child, other], allCards);

		expect(candidates).toHaveLength(1);
		expect(candidates[0].fulfillsRequirement).toBe(false);
	});
});

describe('validateCardAssociation', () => {
	it('should accept an owned parent that causes no cycle', () => {
		const parent = ownedCard(disciplinaMonastica.id);
		const child = ownedCard(artesMarciales.id);

		expect(validateCardAssociation(child.id, parent.id, [parent, child])).toEqual({ valid: true });
	});

	it('should reject a parent that is not owned with PARENT_NOT_OWNED', () => {
		const child = ownedCard(artesMarciales.id);
		const result = validateCardAssociation(child.id, disciplinaMonastica.id, [child]);

		expect(result).toEqual({
			valid: false,
			code: 'PARENT_NOT_OWNED',
			message: 'La carta padre debe pertenecer a la colección del personaje.',
		});
	});

	it('should reject self-association with SELF_ASSOCIATION', () => {
		const child = ownedCard(artesMarciales.id);
		const result = validateCardAssociation(child.id, child.id, [child]);

		expect(result).toEqual({
			valid: false,
			code: 'SELF_ASSOCIATION',
			message: 'Una carta no puede ser su propio padre.',
		});
	});

	it('should reject a link that would create a cycle with CYCLE', () => {
		const cardA = ownedCard('card-a', { grantedBy: 'card-b' });
		const cardB = ownedCard('card-b');
		const result = validateCardAssociation(cardB.id, cardA.id, [cardA, cardB]);

		expect(result).toEqual({
			valid: false,
			code: 'CYCLE',
			message: 'La asociación crearía un ciclo entre cartas.',
		});
	});
});

describe('hasValidCardLink', () => {
	it('should accept a link whose parent exists even when the parent is inactive', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: false });
		const child = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });

		expect(hasValidCardLink(child, [child, parent])).toBe(true);
	});

	it('should reject an orphan link to a missing parent', () => {
		const child = ownedCard(artesMarciales.id, { grantedBy: 'ghost-parent' });

		expect(hasValidCardLink(child, [child])).toBe(false);
	});

	it('should reject null, undefined and empty grantedBy values', () => {
		const nullLink = ownedCard(artesMarciales.id, { grantedBy: null });
		const emptyLink = ownedCard(artesMarciales.id, { grantedBy: '' });

		expect(hasValidCardLink(nullLink, [nullLink])).toBe(false);
		expect(hasValidCardLink(ownedCard(artesMarciales.id), [ownedCard(artesMarciales.id)])).toBe(
			false,
		);
		expect(hasValidCardLink(emptyLink, [emptyLink])).toBe(false);
	});

	it('should reject a link that points to the card itself', () => {
		const selfLinked = ownedCard(artesMarciales.id, { grantedBy: artesMarciales.id });

		expect(hasValidCardLink(selfLinked, [selfLinked])).toBe(false);
	});
});

describe('isEffectiveSlotExemption', () => {
	const allCards = [artesMarciales, disciplinaMonastica, efectoPasivo, consumiblePocion];

	it('should be false when the flag is absent even with a valid link and an active activable parent', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const child = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });

		expect(isEffectiveSlotExemption(child, [child, parent], allCards)).toBe(false);
	});

	it('should be false when the flag is explicitly false', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const child = ownedCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: false,
		});

		expect(isEffectiveSlotExemption(child, [child, parent], allCards)).toBe(false);
	});

	it('should be true for an activable child with the flag, a valid link and an active activable parent', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const child = ownedCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});

		expect(isEffectiveSlotExemption(child, [child, parent], allCards)).toBe(true);
	});

	it('should be false when the activable parent is inactive even with the flag', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: false });
		const child = ownedCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});

		expect(isEffectiveSlotExemption(child, [child, parent], allCards)).toBe(false);
	});

	it('should be true for an activable child with the flag linked to an effect parent that is not active', () => {
		const parent = ownedCard(efectoPasivo.id, { isActive: false });
		const child = ownedCard(artesMarciales.id, {
			grantedBy: efectoPasivo.id,
			doesNotConsumeActiveSlot: true,
		});

		expect(isEffectiveSlotExemption(child, [child, parent], allCards)).toBe(true);
	});

	it('should be false for effect and consumable children even with the flag and an active parent', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const effect = ownedCard(efectoPasivo.id, {
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});
		const consumible = ownedCard(consumiblePocion.id, {
			grantedBy: disciplinaMonastica.id,
			cardType: 'item',
			doesNotConsumeActiveSlot: true,
		});

		expect(isEffectiveSlotExemption(effect, [effect, parent], allCards)).toBe(false);
		expect(isEffectiveSlotExemption(consumible, [consumible, parent], allCards)).toBe(false);
	});

	it('should be false when the link is missing or orphan even with the flag', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const unlinked = ownedCard(artesMarciales.id, { doesNotConsumeActiveSlot: true });
		const orphan = ownedCard(artesMarciales.id, {
			grantedBy: 'ghost-parent',
			doesNotConsumeActiveSlot: true,
		});

		expect(isEffectiveSlotExemption(unlinked, [unlinked, parent], allCards)).toBe(false);
		expect(isEffectiveSlotExemption(orphan, [orphan, parent], allCards)).toBe(false);
	});
});

describe('isInactiveActivableOrigin', () => {
	const allCards = [artesMarciales, disciplinaMonastica, efectoPasivo, consumiblePocion];

	it('should be true when the parent is an inactive activable card regardless of the child type', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: false });
		const activableChild = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });
		const effectChild = ownedCard(efectoPasivo.id, { grantedBy: disciplinaMonastica.id });
		const consumibleChild = ownedCard(consumiblePocion.id, {
			grantedBy: disciplinaMonastica.id,
			cardType: 'item',
		});
		const cards = [activableChild, effectChild, consumibleChild, parent];

		expect(isInactiveActivableOrigin(activableChild, cards, allCards)).toBe(true);
		expect(isInactiveActivableOrigin(effectChild, cards, allCards)).toBe(true);
		expect(isInactiveActivableOrigin(consumibleChild, cards, allCards)).toBe(true);
	});

	it('should be false when the parent is active', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const child = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });

		expect(isInactiveActivableOrigin(child, [child, parent], allCards)).toBe(false);
	});

	it('should be false when the parent is an effect or consumable card even if inactive', () => {
		const effectParent = ownedCard(efectoPasivo.id, { isActive: false });
		const consumibleParent = ownedCard(consumiblePocion.id, {
			isActive: false,
			cardType: 'item',
		});
		const childLinkedToEffect = ownedCard(artesMarciales.id, { grantedBy: efectoPasivo.id });
		const childLinkedToConsumible = ownedCard(fuegoRapido.id, {
			grantedBy: consumiblePocion.id,
		});
		const cards = [childLinkedToEffect, childLinkedToConsumible, effectParent, consumibleParent];

		expect(isInactiveActivableOrigin(childLinkedToEffect, cards, allCards)).toBe(false);
		expect(isInactiveActivableOrigin(childLinkedToConsumible, cards, allCards)).toBe(false);
	});

	it('should be false when the link is missing or orphan', () => {
		const parent = ownedCard(disciplinaMonastica.id, { isActive: false });
		const unlinked = ownedCard(artesMarciales.id);
		const orphan = ownedCard(artesMarciales.id, { grantedBy: 'ghost-parent' });

		expect(isInactiveActivableOrigin(unlinked, [unlinked, parent], allCards)).toBe(false);
		expect(isInactiveActivableOrigin(orphan, [orphan, parent], allCards)).toBe(false);
	});
});

describe('slot accounting', () => {
	const allCards = [
		artesMarciales,
		disciplinaMonastica,
		efectoPasivo,
		consumiblePocion,
		fuegoRapido,
		pasoCosmico,
		pactoSupremo,
		sintonica,
		espadachin,
	];

	it('should count as slot-free only explicit exemptions on linked activable children', () => {
		const normal = ownedCard(artesMarciales.id);
		const linkedFree = ownedCard(fuegoRapido.id, {
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});
		const linkedUnmarked = ownedCard(sintonica.id, { grantedBy: disciplinaMonastica.id });
		const linkedEffectParentFree = ownedCard(espadachin.id, {
			grantedBy: efectoPasivo.id,
			doesNotConsumeActiveSlot: true,
		});
		const linkedWithInactiveParent = ownedCard(pasoCosmico.id, {
			grantedBy: pactoSupremo.id,
			doesNotConsumeActiveSlot: true,
		});
		const effect = ownedCard(efectoPasivo.id, { grantedBy: disciplinaMonastica.id });
		const consumible = ownedCard(consumiblePocion.id, {
			grantedBy: disciplinaMonastica.id,
			cardType: 'item',
		});
		const activeParent = ownedCard(disciplinaMonastica.id, { isActive: true });
		const inactiveParent = ownedCard(pactoSupremo.id, { isActive: false });
		const characterCards = [
			normal,
			linkedFree,
			linkedUnmarked,
			linkedEffectParentFree,
			linkedWithInactiveParent,
			effect,
			consumible,
			activeParent,
			inactiveParent,
		];

		const consuming = getSlotConsumingActiveCards(characterCards, allCards);

		expect(consuming.map((card) => card.id)).toEqual([
			artesMarciales.id,
			sintonica.id,
			pasoCosmico.id,
			disciplinaMonastica.id,
		]);
	});
});

describe('getAssociatedDescendants', () => {
	it('should return direct and transitive descendants without duplicates', () => {
		const parent = ownedCard('parent-id');
		const child = ownedCard('child-1', { grantedBy: 'parent-id' });
		const grandchild = ownedCard('child-2', { grantedBy: 'child-1' });
		const secondChild = ownedCard('child-3', { grantedBy: 'parent-id' });

		const descendants = getAssociatedDescendants(parent.id, [
			parent,
			child,
			grandchild,
			secondChild,
		]);

		expect(descendants).toHaveLength(3);
		expect(new Set(descendants.map((card) => card.id))).toEqual(
			new Set([child.id, grandchild.id, secondChild.id]),
		);
	});

	it('should terminate and deduplicate when old data contains a cycle', () => {
		const cardA = ownedCard('card-a', { grantedBy: 'card-b' });
		const cardB = ownedCard('card-b', { grantedBy: 'card-a' });

		const descendants = getAssociatedDescendants(cardA.id, [cardA, cardB]);

		expect(descendants.map((card) => card.id)).toEqual([cardB.id]);
	});
});

describe('applyParentDeactivation', () => {
	const allCards = [artesMarciales, disciplinaMonastica, efectoPasivo, pactoSupremo];

	it('should deactivate the parent and its activable descendants, restoring their uses', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, { uses: 0, grantedBy: disciplinaMonastica.id });
		const grandchild = ownedCard(pactoSupremo.id, {
			uses: 2,
			grantedBy: artesMarciales.id,
		});
		const effect = ownedCard(efectoPasivo.id, { uses: 1, grantedBy: disciplinaMonastica.id });
		const cards = [parent, child, grandchild, effect];

		const result = applyParentDeactivation(disciplinaMonastica.id, cards, allCards);
		const resultParent = result.find((card) => card.id === disciplinaMonastica.id);
		const resultChild = result.find((card) => card.id === artesMarciales.id);
		const resultGrandchild = result.find((card) => card.id === pactoSupremo.id);
		const resultEffect = result.find((card) => card.id === efectoPasivo.id);

		expect(resultParent?.isActive).toBe(false);
		expect(resultParent?.uses).toBe(3);
		expect(resultChild?.isActive).toBe(false);
		expect(resultChild?.uses).toBe(3);
		expect(resultChild?.grantedBy).toBe(disciplinaMonastica.id);
		expect(resultGrandchild?.isActive).toBe(false);
		expect(resultGrandchild?.uses).toBe(3);
		expect(resultGrandchild?.grantedBy).toBe(artesMarciales.id);
		expect(resultEffect?.isActive).toBe(true);
		expect(resultEffect?.uses).toBe(1);
		expect(resultEffect?.grantedBy).toBe(disciplinaMonastica.id);
	});

	it('should preserve the explicit no-slot choice and the link for activable descendants', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, {
			uses: 0,
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});
		const cards = [parent, child];

		const result = applyParentDeactivation(disciplinaMonastica.id, cards, allCards);
		const resultChild = result.find((card) => card.id === artesMarciales.id);

		expect(resultChild?.isActive).toBe(false);
		expect(resultChild?.uses).toBe(3);
		expect(resultChild?.grantedBy).toBe(disciplinaMonastica.id);
		expect(resultChild?.doesNotConsumeActiveSlot).toBe(true);
	});

	it('should not mutate the input cards or the input collection', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, { uses: 0, grantedBy: disciplinaMonastica.id });
		const cards = [parent, child];

		applyParentDeactivation(disciplinaMonastica.id, cards, allCards);

		expect(parent.isActive).toBe(true);
		expect(parent.uses).toBe(1);
		expect(child.isActive).toBe(true);
		expect(child.uses).toBe(0);
	});

	it('should return the same collection when the parent is not owned', () => {
		const child = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });
		const cards = [child];

		expect(applyParentDeactivation('ghost-parent', cards, allCards)).toBe(cards);
	});
});

describe('applyParentRemoval', () => {
	const allCards = [artesMarciales, disciplinaMonastica, efectoPasivo, pactoSupremo];

	it('should remove the parent, deactivate activable descendants and clear every affected link', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, { uses: 0, grantedBy: disciplinaMonastica.id });
		const grandchild = ownedCard(pactoSupremo.id, {
			uses: 2,
			grantedBy: artesMarciales.id,
		});
		const effect = ownedCard(efectoPasivo.id, { uses: 1, grantedBy: disciplinaMonastica.id });
		const cards = [parent, child, grandchild, effect];

		const result = applyParentRemoval(disciplinaMonastica.id, cards, allCards);
		const resultChild = result.find((card) => card.id === artesMarciales.id);
		const resultGrandchild = result.find((card) => card.id === pactoSupremo.id);
		const resultEffect = result.find((card) => card.id === efectoPasivo.id);

		expect(result.some((card) => card.id === disciplinaMonastica.id)).toBe(false);
		expect(resultChild?.isActive).toBe(false);
		expect(resultChild?.uses).toBe(3);
		expect(resultChild?.grantedBy).toBeNull();
		expect(resultGrandchild?.isActive).toBe(false);
		expect(resultGrandchild?.grantedBy).toBeNull();
		expect(resultEffect?.isActive).toBe(true);
		expect(resultEffect?.uses).toBe(1);
		expect(resultEffect?.grantedBy).toBeNull();
	});

	it('should clear the explicit no-slot choice and the link for every affected descendant', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, {
			uses: 0,
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});
		const grandchild = ownedCard(pactoSupremo.id, {
			uses: 2,
			grantedBy: artesMarciales.id,
			doesNotConsumeActiveSlot: true,
		});
		const effect = ownedCard(efectoPasivo.id, {
			uses: 1,
			grantedBy: disciplinaMonastica.id,
			doesNotConsumeActiveSlot: true,
		});
		const cards = [parent, child, grandchild, effect];

		const result = applyParentRemoval(disciplinaMonastica.id, cards, allCards);
		const resultChild = result.find((card) => card.id === artesMarciales.id);
		const resultGrandchild = result.find((card) => card.id === pactoSupremo.id);
		const resultEffect = result.find((card) => card.id === efectoPasivo.id);

		expect(resultChild?.isActive).toBe(false);
		expect(resultChild?.uses).toBe(3);
		expect(resultChild?.grantedBy).toBeNull();
		expect(resultChild?.doesNotConsumeActiveSlot).toBeUndefined();
		expect(resultGrandchild?.isActive).toBe(false);
		expect(resultGrandchild?.grantedBy).toBeNull();
		expect(resultGrandchild?.doesNotConsumeActiveSlot).toBeUndefined();
		expect(resultEffect?.isActive).toBe(true);
		expect(resultEffect?.uses).toBe(1);
		expect(resultEffect?.grantedBy).toBeNull();
		expect(resultEffect?.doesNotConsumeActiveSlot).toBeUndefined();
	});

	it('should not mutate the input cards or the input collection', () => {
		const parent = ownedCard(disciplinaMonastica.id, { uses: 1 });
		const child = ownedCard(artesMarciales.id, { uses: 0, grantedBy: disciplinaMonastica.id });
		const cards = [parent, child];

		applyParentRemoval(disciplinaMonastica.id, cards, allCards);

		expect(parent.grantedBy).toBeUndefined();
		expect(child.grantedBy).toBe(disciplinaMonastica.id);
		expect(child.isActive).toBe(true);
	});

	it('should return the same collection when the parent is not owned', () => {
		const child = ownedCard(artesMarciales.id, { grantedBy: disciplinaMonastica.id });
		const cards = [child];

		expect(applyParentRemoval('ghost-parent', cards, allCards)).toBe(cards);
	});
});
