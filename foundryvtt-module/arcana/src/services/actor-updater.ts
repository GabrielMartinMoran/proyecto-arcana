import { findActorOrTokenActor, safeNum, safeStr } from '../helpers';
import { isCharacterURL, isDevelopURL } from '../helpers/actor-urls';
import type { ArcanaActor, UpdatePayload } from '../types/actor';
import type { UpdateActorData } from '../types/messages';

/**
 * Service responsible for updating actor data from external sources
 * Follows Single Responsibility Principle and Dependency Inversion
 */
export class ActorUpdater {
	/**
	 * Handle actor update message from iframe
	 */
	async handleUpdateActor(data: UpdateActorData): Promise<void> {
		const actor = await this.findActor(data);
		if (!actor) return;

		const updateData = this.buildUpdateData(actor, data.payload);
		if (!updateData.hasChanges) return;

		await actor.update(updateData.changes, { render: false });
		await this.updateTokens(actor, updateData.changes, data.payload);
		this.updateSheet(actor, updateData.changes);
		ui?.actors?.render();
	}

	/**
	 * Find the actor by UUID or ID
	 */
	private async findActor(data: UpdateActorData): Promise<ArcanaActor | undefined> {
		if (data.uuid) {
			const result = await fromUuid(data.uuid);
			return result as ArcanaActor | undefined;
		}
		if (data.actorId) {
			return findActorOrTokenActor(data.actorId);
		}
		return undefined;
	}

	/**
	 * Build update data object based on payload
	 */
	private buildUpdateData(
		actor: ArcanaActor,
		payload: UpdatePayload,
	): { changes: Record<string, any>; hasChanges: boolean } {
		const changes: Record<string, any> = {};
		let hasChanges = false;

		const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
		const isCharacter = isCharacterURL(sheetUrl);

		// Handle name update
		if (payload.name) {
			const nameUpdate = this.buildNameUpdate(actor, payload.name, sheetUrl);
			if (nameUpdate) {
				Object.assign(changes, nameUpdate);
				hasChanges = true;
			}
		}

		// Handle image update
		if (payload.imageUrl) {
			const imageUpdate = this.buildImageUpdate(actor, payload.imageUrl, payload.imageSource);
			if (imageUpdate) {
				Object.assign(changes, imageUpdate);
				hasChanges = true;
			}
		}

		// Handle HP update
		if (payload.hp) {
			const hpUpdate = this.buildHPUpdate(actor, payload.hp, isCharacter);
			if (hpUpdate) {
				Object.assign(changes, hpUpdate);
				hasChanges = true;
			}
		}

		// Handle Initiative update
		if (payload.initiative !== undefined) {
			console.log(`[Arcana] Updating initiative for ${actor.name} to ${payload.initiative}`);
			changes['flags.arcana.initiative'] = payload.initiative;
			hasChanges = true;
		}

		return { changes, hasChanges };
	}

	/**
	 * Build name update data
	 */
	private buildNameUpdate(
		actor: ArcanaActor,
		newName: string,
		sheetUrl: string,
	): Record<string, any> | null {
		const oldName = safeStr(actor.name);
		let processedName = safeStr(newName);

		if (isDevelopURL(sheetUrl)) {
			processedName = `[DEV] ${processedName}`;
		}

		if (processedName !== oldName) {
			const update: Record<string, any> = {
				name: processedName,
				'prototypeToken.name': processedName,
			};
			if (actor.isToken) {
				update['token.name'] = processedName;
			}
			return update;
		}

		return null;
	}

	/**
	 * Build image update data
	 */
	private buildImageUpdate(
		actor: ArcanaActor,
		imageUrl: string,
		imageSource?: string,
	): Record<string, any> | null {
		const lastSource = actor.getFlag('arcana', 'imgSource');
		const newSource = safeStr(imageSource);

		if (newSource && lastSource) {
			if (newSource !== lastSource) {
				actor.setFlag('arcana', 'imgSource', newSource);
				return {
					img: imageUrl,
					'prototypeToken.texture.src': imageUrl,
				};
			}
		} else {
			const oldImg = safeStr(actor.img);
			const newImg = safeStr(imageUrl);
			if (oldImg !== newImg) {
				if (newSource) {
					actor.setFlag('arcana', 'imgSource', newSource);
				}
				return {
					img: newImg,
					'prototypeToken.texture.src': newImg,
				};
			}
		}

		return null;
	}

	/**
	 * Build HP update data
	 */
	private buildHPUpdate(
		actor: ArcanaActor,
		hp: { value: number; max: number },
		isCharacter: boolean,
	): Record<string, any> | null {
		const changes: Record<string, any> = {};
		let hasChanges = false;

		if (!isCharacter) {
			// For NPCs/bestiary, only update max HP
			const currentVal = safeNum(foundry.utils.getProperty(actor, 'system.health.value'));
			const oldMax = safeNum(foundry.utils.getProperty(actor, 'system.health.max'));
			const newMax = safeNum(hp.max);

			if (newMax !== oldMax) {
				changes['system.health.max'] = newMax;
				if (currentVal > newMax) {
					changes['system.health.value'] = newMax;
				}
				hasChanges = true;
			}
		} else {
			// For characters, update both value and max
			const oldVal = safeNum(foundry.utils.getProperty(actor, 'system.health.value'));
			const oldMax = safeNum(foundry.utils.getProperty(actor, 'system.health.max'));
			const newVal = safeNum(hp.value);
			const newMax = safeNum(hp.max);

			if (newVal !== oldVal) {
				changes['system.health.value'] = newVal;
				hasChanges = true;
			}
			if (newMax !== oldMax) {
				changes['system.health.max'] = newMax;
				hasChanges = true;
			}
		}

		return hasChanges ? changes : null;
	}

	/**
	 * Update all active tokens for the actor
	 */
	private async updateTokens(
		actor: ArcanaActor,
		changes: Record<string, any>,
		_payload: UpdatePayload,
	): Promise<void> {
		const tokensToUpdate = actor.isToken ? [actor.token] : actor.getActiveTokens();
		const tokenUpdates: Record<string, any> = {};
		let needsTokenUpdate = false;

		if (changes['img']) {
			tokenUpdates['texture.src'] = changes['img'];
			needsTokenUpdate = true;
		}
		if (changes['name']) {
			tokenUpdates['name'] = changes['name'];
			needsTokenUpdate = true;
		}

		for (const t of tokensToUpdate) {
			if (needsTokenUpdate) {
				await t.update(tokenUpdates);
			}
			if (_payload.hp) {
				t.object?.drawBars();
			}
		}
	}

	/**
	 * Update the actor sheet UI if rendered
	 */
	private updateSheet(actor: ArcanaActor, changes: Record<string, any>): void {
		const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
		const isCharacter = isCharacterURL(sheetUrl);

		if (!actor.sheet || !actor.sheet.rendered || isCharacter) return;

		const html = actor.sheet.element;

		if (changes['system.health.max']) {
			html.find("input[name='system.health.max']").val(changes['system.health.max']);
			if (actor.isToken && actor.baseActor) {
				actor.baseActor.update({
					'system.health.max': changes['system.health.max'],
				});
			}
		}

		if (changes['system.health.value']) {
			html.find("input[name='system.health.value']").val(changes['system.health.value']);
			if (actor.isToken && actor.baseActor) {
				actor.baseActor.update({
					'system.health.value': changes['system.health.value'],
				});
			}
		}

		actor.render();
	}
}
