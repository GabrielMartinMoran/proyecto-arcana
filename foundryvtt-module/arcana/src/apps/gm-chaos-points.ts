/**
 * GM-only Chaos Points window for the Arcana Foundry system.
 *
 * A standalone ApplicationV2 (Handlebars) that shows the current world-scoped
 * counter and lets the GM adjust it manually (+1 / -1) or set an exact value.
 * All counter rules (clamping, normalization) live in the
 * `services/chaos-points` domain module; this window only reads and writes
 * through it. The window is gated on `game.user.isGM` at render time.
 */

import {
	CHAOS_SPEND_COSTS,
	adjustChaosPoints,
	getChaosPoints,
	setChaosPoints,
	spendChaosPoints,
} from '../services/chaos-points';

const ApplicationV2Base = foundry.applications.api.ApplicationV2;
const MixedApplication = foundry.applications.api.HandlebarsApplicationMixin(ApplicationV2Base);

export const GM_CHAOS_POINTS_TITLE = 'Puntos de Caos del DJ';

export type ChaosSpendKey = keyof typeof CHAOS_SPEND_COSTS;

export interface ChaosSpendOption {
	key: ChaosSpendKey;
	label: string;
	cost: number;
}

/** Spanish display names for the Pact of Chaos spends, keyed by the domain constant. */
const SPEND_LABELS: Record<ChaosSpendKey, string> = {
	hostileReflex: 'Reflejo Hostil',
	environmentalComplication: 'Complicación Ambiental',
	secondChance: 'Segunda Oportunidad',
};

/**
 * Build the spend buttons from the domain costs, so the UI never hardcodes a
 * price: each label is `"<name> (−<cost>)"` where the cost comes straight from
 * `CHAOS_SPEND_COSTS`.
 */
export function buildSpendOptions(): ChaosSpendOption[] {
	return (Object.keys(CHAOS_SPEND_COSTS) as ChaosSpendKey[]).map((key) => ({
		key,
		label: `${SPEND_LABELS[key]} (−${CHAOS_SPEND_COSTS[key]})`,
		cost: CHAOS_SPEND_COSTS[key],
	}));
}

/** True only for an authenticated GM user; false when the user is unknown. */
export function isGameMaster(): boolean {
	return game?.user?.isGM === true;
}

interface ChaosPointsContext {
	chaosPoints: number;
	spendOptions: ChaosSpendOption[];
}

export class GMChaosPointsApp extends MixedApplication {
	static ID = 'gm-chaos-points';

	/** @override */
	static DEFAULT_OPTIONS = {
		...ApplicationV2Base.DEFAULT_OPTIONS,
		id: GMChaosPointsApp.ID,
		classes: ['arcana', 'gm-chaos-points'],
		tag: 'form',
		window: {
			title: GM_CHAOS_POINTS_TITLE,
			resizable: false,
		},
		position: { width: 320 },
		actions: {
			adjust: GMChaosPointsApp.#adjust,
			spend: GMChaosPointsApp.#spend,
			set: GMChaosPointsApp.#set,
		},
	};

	/** @override */
	static PARTS = {
		form: {
			template: 'systems/arcana/gm-chaos-points.html',
		},
	};

	/** @override */
	async _prepareContext(options: any): Promise<ChaosPointsContext> {
		const context = (await super._prepareContext(options)) as Record<string, unknown>;
		return { ...context, chaosPoints: getChaosPoints(), spendOptions: buildSpendOptions() };
	}

	/**
	 * Refuse to open the window for non-GM users. Foundry renders the shell
	 * before actions run, so the gate must live in the render entry point.
	 * @override
	 */
	override async render(options?: any): Promise<this> {
		if (!isGameMaster()) return this;
		return super.render(options);
	}

	static async #adjust(
		this: GMChaosPointsApp,
		_event: PointerEvent,
		target: HTMLElement,
	): Promise<void> {
		const delta = Number(target.dataset.delta ?? 0);
		await setChaosPoints(adjustChaosPoints(getChaosPoints(), delta));
		this.render();
	}

	/**
	 * Spend on a Pact of Chaos action. The domain's `spendChaosPoints` owns the
	 * balance guard: a rejected spend warns and leaves the counter untouched
	 * (nothing changed, so no re-render is needed); an accepted spend persists
	 * the new value and re-renders.
	 */
	static async #spend(
		this: GMChaosPointsApp,
		_event: PointerEvent,
		target: HTMLElement,
	): Promise<void> {
		const key = target.dataset.spend;
		const cost = key === undefined ? undefined : (CHAOS_SPEND_COSTS as Record<string, number>)[key];
		if (cost === undefined) return;

		const result = spendChaosPoints(getChaosPoints(), cost);
		if (!result.ok) {
			ui.notifications.warn('Puntos de Caos insuficientes.');
			return;
		}

		await setChaosPoints(result.value);
		this.render();
	}

	static async #set(
		this: GMChaosPointsApp,
		_event: PointerEvent,
		target: HTMLElement,
	): Promise<void> {
		const form = (target as HTMLButtonElement).form ?? (this.element as HTMLFormElement | null);
		const input = form?.querySelector<HTMLInputElement>('input[name="chaosPoints"]');
		await setChaosPoints(Number(input?.value ?? 0));
		this.render();
	}
}
