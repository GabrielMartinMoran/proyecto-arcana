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

import type { Note } from './character';

export type PartyMembers = Record<string, string[]>;

export class Party {
	id: string;
	name: string;
	ownerId: string;
	notes: Note[];
	members: PartyMembers;

	constructor(props: any) {
		this.id = props?.id ?? '';
		this.name = props?.name ?? '';
		this.ownerId = props?.ownerId ?? '';
		this.notes = Array.isArray(props?.notes) ? props.notes : [];
		this.members = props?.members && typeof props.members === 'object' ? props.members : {};
	}

	/**
	 * Add a character to a user's membership list. Duplicates are ignored.
	 */
	addMember(userId: string, characterId: string) {
		if (!userId || !characterId) return;
		const arr = this.members[userId] ?? [];
		if (!arr.includes(characterId)) {
			arr.push(characterId);
		}
		this.members[userId] = arr;
	}

	/**
	 * Remove a character from a user's membership list.
	 * If characterId is omitted, remove the entire user from members.
	 */
	removeMember(userId: string, characterId?: string) {
		if (!userId) return;
		if (!characterId) {
			delete this.members[userId];
			return;
		}
		const arr = this.members[userId];
		if (!arr) return;
		const idx = arr.indexOf(characterId);
		if (idx !== -1) {
			arr.splice(idx, 1);
		}
		if (arr.length === 0) {
			delete this.members[userId];
		} else {
			this.members[userId] = arr;
		}
	}

	/**
	 * Replace the members map completely (useful for applying remote updates).
	 */
	setMembers(members: PartyMembers) {
		this.members = members ?? {};
	}

	/**
	 * Add or update a note. If note.id exists it will replace the existing note with the same id.
	 */
	upsertNote(note: Note) {
		if (!note || !note.id) return;
		const idx = this.notes.findIndex((n) => n.id === note.id);
		if (idx === -1) {
			this.notes.push(note);
		} else {
			this.notes[idx] = note;
		}
	}

	/**
	 * Remove a note by id.
	 */
	removeNote(noteId: string) {
		if (!noteId) return;
		this.notes = this.notes.filter((n) => n.id !== noteId);
	}

	/**
	 * Convenience checks
	 */
	isOwner(userId: string) {
		return userId && this.ownerId === userId;
	}

	isMember(userId: string) {
		return !!(userId && this.members && userId in this.members);
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

	/**
	 * Create a deep copy of the Party instance.
	 */
	copy(): Party {
		// Use structured cloning via JSON for simplicity and to produce plain data suitable for storage.
		// This matches the project's approach in other factories/types.
		const plain = JSON.parse(JSON.stringify(this));
		return new Party(plain);
	}
}

export interface PartyData {
	id: string;
	name: string;
	ownerId: string;
	notes: Note[];
	members: PartyMembers;
}
