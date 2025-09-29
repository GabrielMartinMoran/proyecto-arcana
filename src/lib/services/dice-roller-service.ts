import { mapRollLog } from '$lib/mappers/roll-log-mapper';
import { serializeRollLog } from '$lib/serializers/roll-log-serializer';
import { useFirebaseService } from '$lib/services/firebase-service';
import type { DiceResult } from '$lib/types/dice-result';
import type { DiceRoll } from '$lib/types/dice-roll';
import type { RollLog } from '$lib/types/roll-log';
import type { RollModalData } from '$lib/types/roll-modal-data';
import { buildRollsDetail, calculateTotal, parseDiceExpression } from '$lib/utils/dice-rolling';
import { get, writable, type Writable } from 'svelte/store';
import { CONFIG } from '../../config';

const STORAGE_KEY = 'arcana:rollLogs';

const state: {
	inited: boolean;
	clearTimeoutId: NodeJS.Timeout | null;
	roll3DDice: (expression: string) => Promise<DiceResult[]>;
	clear3DDices: () => void;
	logs: Writable<RollLog[]>;
	rollModalOpened: Writable<boolean>;
	rollModalData: Writable<RollModalData | undefined>;
} = {
	inited: false,
	clearTimeoutId: null,
	roll3DDice: async () => [],
	clear3DDices: () => {},
	logs: writable([]),
	rollModalOpened: writable(false),
	rollModalData: writable(undefined),
};

const firebase = useFirebaseService();
let currentUserId: string | null = null;
let unsubscribeRemoteLogs: (() => void) | null = null;
const storeUnsubLogs: (() => void) | null = null;
let applyingRemoteLogsUpdate = false;

const loadRollLogs = (): RollLog[] => {
	try {
		const logs = localStorage.getItem(STORAGE_KEY);
		const rawLogs = logs ? JSON.parse(logs) : [];
		// Keep only the last 100 entries when loading from localStorage
		const trimmed = Array.isArray(rawLogs) ? rawLogs.slice(-100) : rawLogs;
		return trimmed.map((x: any) => mapRollLog(x));
	} catch (error) {
		console.error('Error loading roll logs:', error);
		return [];
	} finally {
		// subscribe asynchronously so saveRollLogs can be async and perform cloud writes
		state.logs.subscribe(async (logs) => {
			try {
				await saveRollLogs(logs);
			} catch (err) {
				console.error('[dice-roller-service] saveRollLogs subscription error:', err);
			}
		});
	}
};

const saveRollLogs = async (logs: RollLog[]): Promise<void> => {
	// If logs update originated from remote snapshot, don't echo them back to cloud.
	if (applyingRemoteLogsUpdate) return;

	try {
		// Trim to last 100 before serializing/saving
		const last100 = Array.isArray(logs) ? logs.slice(-100) : logs;
		const serializedLogs = last100.map((x) => serializeRollLog(x));

		// If user is signed-in and firebase is enabled, try to save to cloud.
		if (currentUserId && firebase.isEnabled()) {
			try {
				// saveRollLogsForUser expects plain objects; pass serialized logs
				await firebase.saveRollLogsForUser(currentUserId, serializedLogs);
				return;
			} catch (cloudErr) {
				// If cloud write fails, fall back to localStorage (but keep trying later via resync logic).
				console.error(
					'[dice-roller-service] saveRollLogs cloud write failed, falling back to localStorage:',
					cloudErr,
				);
			}
		}
		// Fallback: persist locally
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedLogs));
		} catch (lsErr) {
			console.error('Error saving roll logs to localStorage:', lsErr);
		}
	} catch (error) {
		console.error('Error preparing roll logs for save:', error);
	}
};

const rollDice = async (expression: string): Promise<DiceResult[]> => {
	const isStandardDice = CONFIG.STANDARD_DICES.some((x) => expression.endsWith(x));
	if (isStandardDice) {
		return state.roll3DDice(expression);
	} else {
		return new Promise((resolve) => {
			const [quantity, sides] = expression.split('d');
			const results: DiceResult[] = [];
			for (let i = 0; i < Number(quantity); i++) {
				results.push({
					value: Math.floor(Math.random() * Number(sides)) + 1,
					sides: Number(sides),
					dieType: 'd' + sides,
					groupId: 0,
					rollId: i,
					theme: 'default',
					themeColor: '#000000',
				});
			}
			resolve(results);
		});
	}
};

const logRolls = (
	rolls: DiceRoll[],
	title?: string,
	resultFormatter?: (result: number) => string | undefined,
) => {
	const total = calculateTotal(rolls);
	const log: RollLog = {
		id: crypto.randomUUID(),
		timestamp: new Date(),
		title: title || 'Tirada anónima',
		total: total,
		formattedTotal: resultFormatter ? resultFormatter(total) : undefined,
		detail: buildRollsDetail(rolls),
	};

	// Append the new log and trim to keep only the last 100 entries
	state.logs.update((x) => {
		const newArr = [...x, log];
		return newArr.slice(-100);
	});
};

type RollFnProps = {
	expression: string;
	variables?: Record<string, number>;
	title?: string;
	resultFormatter?: (result: number) => string | undefined;
};

export const useDiceRollerService = () => {
	if (!state.inited) {
		state.logs.set(loadRollLogs());
		state.inited = true;

		// Setup firebase integration for roll logs in background
		(async () => {
			try {
				// Initialize firebase (idempotent)
				try {
					await firebase.initFirebase();
				} catch (initErr) {
					console.warn(
						'[dice-roller-service] firebase init error (continuing with local logs):',
						initErr,
					);
				}

				// Attach auth state changes so we start/stop listening to remote roll logs
				try {
					await firebase.onAuthState(async (u) => {
						const previousUser = currentUserId;
						currentUserId = u ? u.uid : null;

						// If user changed, stop previous remote listener
						if (previousUser && previousUser !== currentUserId) {
							if (unsubscribeRemoteLogs) {
								try {
									unsubscribeRemoteLogs();
								} catch {
									/* ignore */
								}
								unsubscribeRemoteLogs = null;
							}
						}

						// If signed in and firebase enabled, start remote listener
						if (currentUserId && firebase.isEnabled()) {
							try {
								// Start listening to user's roll logs
								unsubscribeRemoteLogs = firebase.listenRollLogsForUser(
									currentUserId,
									(remoteLogs) => {
										// Avoid echoing remote updates back to cloud
										applyingRemoteLogsUpdate = true;
										try {
											// Map remote plain entries into RollLog via mapper
											const mapped = (remoteLogs || []).map((r: any) => mapRollLog(r));
											state.logs.set(mapped);
										} catch (applyErr) {
											console.error(
												'[dice-roller-service] Error applying remote roll logs:',
												applyErr,
											);
										} finally {
											applyingRemoteLogsUpdate = false;
										}
									},
								);
							} catch (listenErr) {
								console.error(
									'[dice-roller-service] Error starting remote roll logs listener:',
									listenErr,
								);
							}
						} else {
							// No user: ensure local cached logs are loaded
							try {
								const raw = localStorage.getItem(STORAGE_KEY);
								if (raw) {
									const parsed = JSON.parse(raw);
									state.logs.set(parsed.map((x: any) => mapRollLog(x)));
								}
							} catch (localErr) {
								console.error('[dice-roller-service] Error loading local fallback logs:', localErr);
							}
						}
					});
				} catch (authErr) {
					console.warn('[dice-roller-service] Error subscribing to auth state (ignored):', authErr);
				}
			} catch (err) {
				console.error(
					'[dice-roller-service] Unexpected error setting up firebase integration:',
					err,
				);
			}
		})();
	}

	const openRollModal = ({
		expression,
		variables = {},
		title = undefined,
		resultFormatter = () => undefined,
	}: RollFnProps) => {
		state.rollModalData.set({
			expression,
			variables,
			title: title ?? 'Tirar',
			rollType: 'normal',
			extraModsExpression: '',
			resultFormatter,
		});
		state.rollModalOpened.set(true);
	};

	const submitRollModal = async () => {
		const rollModalData = get(state.rollModalData);
		state.rollModalData.set(undefined);
		state.rollModalOpened.set(false);
		if (!rollModalData) return;
		let expression = rollModalData.expression;
		let title = rollModalData.title;
		if (rollModalData.rollType !== 'normal') {
			expression += rollModalData.rollType === 'advantage' ? '+1d4' : '-1d4';
			title += rollModalData.rollType === 'advantage' ? ' (ventaja)' : ' (desventaja)';
		}
		if (rollModalData?.extraModsExpression) {
			expression += `+${rollModalData.extraModsExpression.trim()}`;
			expression = expression.replaceAll('++', '+').replaceAll('+-', '-');
		}
		rollExpression({
			expression,
			variables: rollModalData.variables,
			title,
		});
	};

	const abortRollModal = () => {
		state.rollModalOpened.set(false);
		state.rollModalData.set(undefined);
	};

	const rollExpression = async ({
		expression,
		variables = {},
		title = undefined,
		resultFormatter = () => undefined,
	}: RollFnProps): Promise<number> => {
		const members = parseDiceExpression(expression, variables);

		if (state.clearTimeoutId) {
			clearTimeout(state.clearTimeoutId);
			state.clearTimeoutId = null;
		}

		state.clear3DDices();

		const rolls: DiceRoll[] = [];

		for (const member of members) {
			if (member.type === 'dice') {
				rolls.push({
					expressionMember: member,
					promise: rollDice(member.value as string),
					result: undefined,
					explosionResolved: false,
					numExplosions: 0,
				});
			} else {
				rolls.push({
					expressionMember: member,
					promise: undefined,
					result: member.value as number,
					explosionResolved: true,
					numExplosions: 0,
				});
			}
		}

		while (rolls.some((x) => x.result === undefined)) {
			const resolvers: Promise<DiceRoll>[] = [];
			const filteredRolls = rolls.filter(
				(x) => x.expressionMember.type === 'dice' && x.result === undefined,
			);
			for (const roll of filteredRolls) {
				resolvers.push(
					(async () => {
						roll.result = (await roll.promise) as DiceResult[];
						roll.promise = undefined;

						for (const result of roll.result) {
							if (
								roll.expressionMember.isExplosive &&
								result.sides === result.value &&
								result.sides > 1 // For preventing infinite loops
							) {
								roll.numExplosions++;
							}
						}

						if (roll.numExplosions > 0) {
							const expressionMember = {
								...roll.expressionMember,
								value: `${roll.numExplosions}d${roll.result[0].sides}`,
							};
							rolls.push({
								expressionMember: expressionMember,
								promise: rollDice(expressionMember.value as string),
								result: undefined,
								explosionResolved: false,
								numExplosions: 0,
							});
						}

						return roll;
					})(),
				);
			}
			await Promise.all(resolvers);
		}

		state.clearTimeoutId = setTimeout(() => {
			state.clear3DDices();
		}, CONFIG.CLEAR_3D_DICES_DELAY);

		logRolls(rolls, title, resultFormatter);

		return calculateTotal(rolls);
	};

	const register3DDiceRollerFn = (fn: (expression: string) => Promise<DiceResult[]>) => {
		state.roll3DDice = fn;
	};

	const registerClear3DDicesFn = (fn: () => void) => {
		state.clear3DDices = fn;
	};
	return {
		rollExpression,
		register3DDiceRollerFn,
		registerClear3DDicesFn,
		rollLogs: state.logs,
		rollModal: {
			rollModalOpened: state.rollModalOpened,
			openRollModal,
			rollModalData: state.rollModalData,
			submitRollModal,
			abortRollModal,
		},
	};
};
