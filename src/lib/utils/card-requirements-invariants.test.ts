import { CONFIG } from '../../config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';

type RawCard = {
	name: string;
	requirements?: string | null;
};

const CARDS_DIRECTORY = join(process.cwd(), 'static', 'docs', 'cards');

const ACCESS_CARD_BY_FILE: Record<string, string> = {
	'arcanista.yml': 'Afinidad Arcana',
	'brujo.yml': 'Pacto Supremo',
	'hechicero.yml': 'Herencia Sobrenatural',
	'combatiente.yml': 'Maestría Marcial',
	'sinergia.yml': 'Maestría Marcial',
};

const readCardSource = (fileName: string): RawCard[] => {
	const parsed = parseYaml(readFileSync(join(CARDS_DIRECTORY, fileName), 'utf8')) as {
		cards: RawCard[];
	};
	return parsed.cards;
};

const cardSourceFiles = (): string[] =>
	(JSON.parse(readFileSync(join(CARDS_DIRECTORY, 'index.json'), 'utf8')) as { files: string[] })
		.files;

const requirementAtoms = (card: RawCard): string[] =>
	(card.requirements ?? '')
		.split(/[&|()]/)
		.map((atom) => atom.trim().toLowerCase())
		.filter((atom) => atom.length > 0);

const buildGrantedTargetsByTrigger = (): Map<string, string> => {
	const grants = new Map<string, string>();
	for (const alias of CONFIG.CARD_ALIASES) {
		for (const triggerCard of alias.triggerCards) {
			grants.set(triggerCard.toLowerCase(), alias.targetCard.toLowerCase());
		}
	}
	return grants;
};

const reachesAccessCard = (
	cardName: string,
	accessCardName: string,
	cardsByName: Map<string, RawCard>,
	grantedTargetsByTrigger: Map<string, string>,
	visited: Set<string> = new Set(),
): boolean => {
	const normalizedName = cardName.toLowerCase();
	const normalizedAccess = accessCardName.toLowerCase();
	if (normalizedName === normalizedAccess) return true;
	if (visited.has(normalizedName)) return false;

	const nextVisited = new Set(visited).add(normalizedName);
	const card = cardsByName.get(normalizedName);
	if (!card) return false;

	return requirementAtoms(card).some((atom) => {
		if (atom === normalizedAccess) return true;
		if (grantedTargetsByTrigger.get(atom) === normalizedAccess) return true;
		return cardsByName.has(atom)
			? reachesAccessCard(atom, accessCardName, cardsByName, grantedTargetsByTrigger, nextVisited)
			: false;
	});
};

const ungatedVirtualAttributeCards = (fileName: string, virtualAttribute: string): string[] => {
	const cards = cardSourceFiles().flatMap(readCardSource);
	const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
	const grantedTargetsByTrigger = buildGrantedTargetsByTrigger();
	const accessCardName = ACCESS_CARD_BY_FILE[fileName];

	return readCardSource(fileName)
		.filter((card) => (card.requirements ?? '').includes(virtualAttribute))
		.filter(
			(card) => !reachesAccessCard(card.name, accessCardName, cardsByName, grantedTargetsByTrigger),
		)
		.map((card) => card.name);
};

describe('card source access requirements', () => {
	it('reads non-empty card sources', () => {
		for (const fileName of Object.keys(ACCESS_CARD_BY_FILE)) {
			expect(readCardSource(fileName).length).toBeGreaterThan(0);
		}
	});

	it('gates every Arcanista card that uses Atributo Arcano through Afinidad Arcana', () => {
		expect(ungatedVirtualAttributeCards('arcanista.yml', 'Atributo Arcano')).toEqual([]);
	});

	it('gates every Brujo card that uses Atributo Arcano through Pacto Supremo', () => {
		expect(ungatedVirtualAttributeCards('brujo.yml', 'Atributo Arcano')).toEqual([]);
	});

	it('gates every Hechicero card that uses Atributo Arcano through Herencia Sobrenatural', () => {
		expect(ungatedVirtualAttributeCards('hechicero.yml', 'Atributo Arcano')).toEqual([]);
	});

	it('gates every Combatiente card that uses Atributo Marcial through Maestría Marcial', () => {
		expect(ungatedVirtualAttributeCards('combatiente.yml', 'Atributo Marcial')).toEqual([]);
	});

	it('gates the Sinergia card that uses Atributo Marcial through Maestría Marcial', () => {
		expect(ungatedVirtualAttributeCards('sinergia.yml', 'Atributo Marcial')).toEqual([]);
	});
});
