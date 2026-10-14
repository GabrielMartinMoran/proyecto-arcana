import { useCardsService } from '$lib/services/cards-service';
import { itemsService } from '$lib/services/items-service';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { Character } from '$lib/types/character';
import type { LibraryItem } from '$lib/types/item';
import { extractCardAttack, type ExtractedCardAttack } from '$lib/utils/card-attack-extraction';
import { weaponToAttackDrafts } from '$lib/utils/weapon-attack-mapping';
import { get } from 'svelte/store';
import { CONFIG } from '../../config';

/** A ready-to-render (and, unless blocked, importable) attack library row. */
export interface AttackLibraryEntry {
	id: string;
	name: string;
	atkFormula: string | null;
	dmgFormula: string;
	notes: string;
	/** `false` only when the attack formula needs an unresolved attribute alias. */
	importable: boolean;
	disabledReason?: string;
}

type ArcaneAttribute = 'mente' | 'presencia';

interface ArcaneAttributeRule {
	triggerCardName: string;
	attribute: ArcaneAttribute;
}

const { loadAbilityCards, abilityCards: abilityCardsStore } = useCardsService();

const CARD_ENTRY_PREFIX = 'card-';
const ONE_HANDED_ENTRY_SUFFIX = '-1h';
const TWO_HANDED_ENTRY_SUFFIX = '-2h';
const SPAIN_LOCALE = 'es';
const BLOCKED_SPELL_REASON =
	'Requiere una carta de sustitución (Estudios Mágicos / Pacto Supremo / Herencia Sobrenatural)';

/**
 * Local mirror of the `CONFIG.CARD_ALIASES` rules for the "Atributo Arcano"
 * alias: the trigger cards and the attribute they substitute. The inline card
 * parser keeps its own resolver; this service never depends on it.
 */
const ARCANE_ATTRIBUTE_ALIAS = 'Atributo Arcano';

const toArcaneAttribute = (displayName: string): ArcaneAttribute | null => {
	const normalized = displayName.toLowerCase();
	return normalized === 'mente' || normalized === 'presencia' ? normalized : null;
};

const ARCANE_ATTRIBUTE_RULES: ArcaneAttributeRule[] = CONFIG.CARD_ALIASES.flatMap(
	({ triggerCards, attributeSubstitutions }) =>
		attributeSubstitutions
			.filter((substitution) => substitution.from === ARCANE_ATTRIBUTE_ALIAS)
			.flatMap((substitution) => {
				const attribute = toArcaneAttribute(substitution.to);
				return attribute === null
					? []
					: triggerCards.map((triggerCardName) => ({ triggerCardName, attribute }));
			}),
);

/**
 * Loads the weapon catalog and turns every weapon into its library entries, in
 * catalog order. Versátil weapons yield one entry per damage die. The load is
 * delegated to `itemsService`, which owns the IO cache; no entries are cached.
 */
async function loadWeaponEntries(): Promise<AttackLibraryEntry[]> {
	await itemsService.loadItems();

	return itemsService.getItemsByCategory('weapons').flatMap(buildWeaponEntries);
}

function buildWeaponEntries(item: LibraryItem): AttackLibraryEntry[] {
	const drafts = weaponToAttackDrafts(item);

	return drafts.map((draft, draftIndex) => ({
		id: buildWeaponEntryId(item.id, draftIndex, drafts.length),
		name: draft.name,
		atkFormula: draft.atkFormula,
		dmgFormula: draft.dmgFormula,
		notes: draft.notes,
		importable: true,
	}));
}

/**
 * Catalog weapon ids already carry the 'weapon-' namespace (e.g. `weapon-daga`),
 * so the entry id is the item id itself; Versátil weapons append the
 * handedness suffix (D-11).
 */
function buildWeaponEntryId(itemId: string, draftIndex: number, draftCount: number): string {
	if (draftCount === 1) return itemId;

	const handednessSuffix = draftIndex === 0 ? ONE_HANDED_ENTRY_SUFFIX : TWO_HANDED_ENTRY_SUFFIX;
	return `${itemId}${handednessSuffix}`;
}

/**
 * Loads the ability card catalog and extracts one entry per damage spell that
 * rolls an attack, sorted by name. Cards that carry the "Atributo Arcano"
 * alias are blocked (not importable) until the character owns a substitution
 * card; cards without an attack pattern are omitted.
 */
async function loadSpellEntries(character: Character): Promise<AttackLibraryEntry[]> {
	await loadAbilityCards();

	const arcaneAttribute = resolveArcaneAttribute(character);

	return get(abilityCardsStore)
		.flatMap((card) => buildSpellEntries(card, arcaneAttribute))
		.sort((left, right) => left.name.localeCompare(right.name, SPAIN_LOCALE));
}

function buildSpellEntries(
	card: AbilityCard,
	arcaneAttribute: ArcaneAttribute | null,
): AttackLibraryEntry[] {
	const attack = extractCardAttack(card.description, { arcaneAttribute });
	return attack ? [buildSpellEntry(card, attack)] : [];
}

function buildSpellEntry(card: AbilityCard, attack: ExtractedCardAttack): AttackLibraryEntry {
	const entry: AttackLibraryEntry = {
		id: `${CARD_ENTRY_PREFIX}${card.id}`,
		name: card.name,
		atkFormula: attack.atkFormula,
		dmgFormula: attack.dmgFormula,
		notes: attack.notes,
		importable: attack.atkFormula !== null,
	};

	if (!entry.importable) {
		entry.disabledReason = BLOCKED_SPELL_REASON;
	}

	return entry;
}

/**
 * Resolves the "Atributo Arcano" alias for a character. Requires the ability
 * card catalog to be loaded. When both substitution branches are owned, the
 * highest attribute wins and a tie resolves to presencia.
 */
function resolveArcaneAttribute(character: Character): ArcaneAttribute | null {
	const ownedCardNames = resolveOwnedCardNames(character);
	const attributeCandidates = ARCANE_ATTRIBUTE_RULES.filter((rule) =>
		ownedCardNames.has(rule.triggerCardName),
	).map((rule) => rule.attribute);

	const hasMind = attributeCandidates.includes('mente');
	const hasPresence = attributeCandidates.includes('presencia');

	if (hasMind && hasPresence) {
		return character.attributes.presence >= character.attributes.mind ? 'presencia' : 'mente';
	}

	return attributeCandidates.at(0) ?? null;
}

function resolveOwnedCardNames(character: Character): Set<string> {
	const catalog = get(abilityCardsStore);

	return new Set(
		character.cards.flatMap((ownedCard) => {
			const catalogCard = catalog.find((card) => card.id === ownedCard.id);
			return catalogCard ? [catalogCard.name] : [];
		}),
	);
}

export const attackLibraryService: {
	loadWeaponEntries(): Promise<AttackLibraryEntry[]>;
	loadSpellEntries(character: Character): Promise<AttackLibraryEntry[]>;
	resolveArcaneAttribute(character: Character): 'mente' | 'presencia' | null;
} = {
	loadWeaponEntries,
	loadSpellEntries,
	resolveArcaneAttribute,
};
