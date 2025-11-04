/**
 * Party type
 *
 * Represents a group (party) of characters shared between users.
 *
 * Fields:
 * - id: unique party id (string)
 * - name: human-readable name
 * - ownerId: uid of the user who owns/manages the party
 * - notes: array of small note objects
 * - members: map from userId -> array of characterIds that belong to that user in this party
 *
 * The implementation follows the style used by other types in the project (e.g. Character).
 */

import type { Character, Note } from './character';

export type PartyMembers = Record<string, string[]>;

export class Party {
	id: string;
	name: string;
	ownerId: string;
	notes: Note[];
	members: PartyMembers;
	characters: Character[];
	unsubscribeCharacterListener: () => void;

	constructor(props: any) {
		this.id = props?.id ?? '';
		this.name = props?.name ?? '';
		this.ownerId = props?.ownerId ?? '';
		this.notes = Array.isArray(props?.notes) ? props.notes : [];
		this.members = props?.members && typeof props.members === 'object' ? props.members : {};
		this.characters = props?.characters ?? [];
		this.unsubscribeCharacterListener = props?.unsubscribeCharacterListener ?? (() => {});
	}

	/**
	 * Return a flat array of all character ids present in the party across all users.
	 */
	getAllCharacterIds(): string[] {
		const out: string[] = [];
		for (const key of Object.keys(this.members)) {
			const arr = this.members[key] ?? [];
			for (const id of arr) {
				if (!out.includes(id)) out.push(id);
			}
		}
		return out;
	}

	getCharactersFullIdentifiers(): { userId: string; characterId: string }[] {
		const out: { userId: string; characterId: string }[] = [];
		for (const key of Object.keys(this.members)) {
			const arr = this.members[key] ?? [];
			for (const id of arr) {
				out.push({ userId: key, characterId: id });
			}
		}
		return out;
	}

	isAccessible(userId: string) {
		return this.ownerId === userId || this.members[userId]?.length > 0;
	}

	/**
	 * Create a deep copy of the Party instance.
	 */
	copy(): Party {
		// Use structured cloning via JSON for simplicity and to produce plain data suitable for storage.
		// This matches the project's approach in other factories/types.
		const plain = JSON.parse(JSON.stringify(this.asPlain()));
		const party = new Party(plain);
		party.characters = this.characters.filter(
			(c) => c.party.partyId === this.id && party.getAllCharacterIds().includes(c.id),
		);
		party.unsubscribeCharacterListener = this.unsubscribeCharacterListener;
		return party;
	}

	asPlain(): PartyData {
		return {
			id: this.id,
			name: this.name,
			ownerId: this.ownerId,
			notes: this.notes,
			members: this.members,
		};
	}
}

export interface PartyData {
	id: string;
	name: string;
	ownerId: string;
	notes: Note[];
	members: PartyMembers;
}
