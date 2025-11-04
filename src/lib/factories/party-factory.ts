/**
 * Party factory - creates a new Party instance with sensible defaults.
 *
 * This mirrors the pattern used by other factories in the project (e.g. character-factory).
 * The `ownerId` parameter is optional; if provided it will be set on the created party.
 *
 * Note: This file expects a `Party` class/type to exist at `$lib/types/party`.
 * Create that type according to the project proposal if it doesn't exist yet.
 */

import { Party } from '$lib/types/party';

export const createParty = (ownerId?: string): Party => {
	return new Party({
		id: crypto.randomUUID(),
		name: 'Nuevo Grupo',
		ownerId: ownerId ?? '',
		notes: [],
		members: {},
	});
};
