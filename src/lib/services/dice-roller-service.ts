import { mapRollLog } from '$lib/mappers/roll-log-mapper';
import { serializeRollLog } from '$lib/serializers/roll-log-serializer';
import { useFirebaseService } from '$lib/services/firebase-service';
import { useRollTargetService } from '$lib/services/roll-target-service';
import type { DiceResult } from '$lib/types/dice-result';
import type { DiceRoll } from '$lib/types/dice-roll';
import type { RollLog } from '$lib/types/roll-log';
import type { RollModalData } from '$lib/types/roll-modal-data';
import { buildRollsDetail, calculateTotal, parseDiceExpression } from '$lib/utils/dice-rolling';
import { get, writable, type Writable } from 'svelte/store';
import { CONFIG } from '../../config';

const PERSONAL_STORAGE_KEY = 'arcana:rollLogs:personal';
const PARTY_STORAGE_KEY_PREFIX = 'arcana:rollLogs:party:';
const MAX_LOGS_TO_KEEP = 100;

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
const rollTargetSvc = useRollTargetService();
let currentUserId: string | null = null;
let unsubscribeRemoteLogs: (() => void) | null = null;
let applyingRemoteLogsUpdate = false;
let savingToCloud = false;

const loadRollLogs = (): RollLog[] => {
	try {
		const key = (() => {
			const t = rollTargetSvc.getTarget();
			return t && t.type === 'party'
				? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
				: PERSONAL_STORAGE_KEY;
		})();
		const logs = localStorage.getItem(key);
		const rawLogs = logs ? JSON.parse(logs) : [];
		const trimmed = Array.isArray(rawLogs) ? rawLogs.slice(-MAX_LOGS_TO_KEEP) : rawLogs;
		return trimmed.map((x: any) => mapRollLog(x));
	} catch (error) {
		console.error('Error loading roll logs:', error);
		return [];
	} finally {
		// Subscribe to store changes to persist logs
		state.logs.subscribe(async (logs) => {
			try {
				await saveRollLogs(logs);
			} catch (err) {
				console.error('[dice-roller-service] saveRollLogs subscription error:', err);
			}
		});
	}
};

const saveRollLogs = async (logs: RollLog[] | any[]): Promise<void> => {
	// Skip if applying remote updates to avoid echo loops
	if (applyingRemoteLogsUpdate) {
		return;
	}

	// Prevent concurrent cloud saves
	if (savingToCloud) {
		// Still persist locally to maintain UI state
		try {
			const trimmed = Array.isArray(logs) ? logs.slice(-MAX_LOGS_TO_KEEP) : [];
			const serialized = trimmed.map((x: any) => serializeRollLog(x));
			const key = (() => {
				const t = rollTargetSvc.getTarget();
				return t && t.type === 'party'
					? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
					: PERSONAL_STORAGE_KEY;
			})();
			localStorage.setItem(key, JSON.stringify(serialized));
		} catch (err) {
			console.error('[dice-roller-service] Error persisting locally during concurrent save:', err);
		}
		return;
	}

	try {
		const trimmedLogs = Array.isArray(logs) ? logs.slice(-MAX_LOGS_TO_KEEP) : [];

		// Find pending entries that need to be synced to cloud
		const pendingLogs = trimmedLogs.filter((x: any) => x && x.pending);

		// Ensure all pending logs have IDs
		for (const log of pendingLogs) {
			if (log && !(log as any).id) {
				try {
					(log as any).id = crypto.randomUUID();
				} catch {
					// Fallback if crypto.randomUUID() is not available
					(log as any).id = `local-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
				}
			}
		}

		// Sync pending logs to cloud if user is authenticated
		if (currentUserId && firebase.isEnabled() && pendingLogs.length > 0) {
			try {
				savingToCloud = true;
				const serializedPending = pendingLogs.map((x: any) => serializeRollLog(x));

				{
					const target = rollTargetSvc.getTarget();
					if (target && target.type === 'party') {
						const current: any = get(firebase.user as any);
						const author = {
							id: current?.uid,
							name: current?.displayName ?? current?.email ?? 'Usuario',
							photoURL: current?.photoURL ?? undefined,
						};
						await (firebase as any).saveGroupRollLogsForParty(
							target.partyId,
							serializedPending,
							author,
						);
					} else {
						await firebase.saveRollLogsForUser(currentUserId, serializedPending);
					}
				}

				// Clear pending flags for successfully saved entries
				const savedIds = serializedPending.map((s: any) => s.id).filter(Boolean);
				if (savedIds.length > 0) {
					state.logs.update((current) =>
						Array.isArray(current)
							? current.map((l: any) =>
									savedIds.includes((l as any).id) ? { ...l, pending: false } : l,
								)
							: current,
					);

					// Persist the updated store
					const updatedLogs = get(state.logs) || [];
					const serializedUpdated = (
						Array.isArray(updatedLogs) ? updatedLogs.slice(-MAX_LOGS_TO_KEEP) : []
					).map((x) => serializeRollLog(x));
					const key = (() => {
						const t = rollTargetSvc.getTarget();
						return t && t.type === 'party'
							? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
							: PERSONAL_STORAGE_KEY;
					})();
					localStorage.setItem(key, JSON.stringify(serializedUpdated));
				}
			} catch (cloudErr) {
				console.error(
					'[dice-roller-service] Cloud sync failed, falling back to localStorage:',
					cloudErr,
				);
			} finally {
				savingToCloud = false;
			}
		}

		// Always persist to localStorage for durability
		try {
			const serializedLogs = trimmedLogs.map((x: any) => serializeRollLog(x));
			const key = (() => {
				const t = rollTargetSvc.getTarget();
				return t && t.type === 'party'
					? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
					: PERSONAL_STORAGE_KEY;
			})();
			localStorage.setItem(key, JSON.stringify(serializedLogs));
		} catch (lsErr) {
			console.error('Error saving roll logs to localStorage:', lsErr);
		}
	} catch (error) {
		console.error('Error preparing roll logs for save:', error);
	} finally {
		savingToCloud = false;
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
	const log: RollLog & { pending?: boolean } & { authorId?: string; authorName?: string } = {
		id: crypto.randomUUID(),
		timestamp: new Date(),
		title: title || 'Tirada rápida',
		total: total,
		formattedTotal: resultFormatter ? resultFormatter(total) : undefined,
		pending: true, // Mark as pending for cloud sync
		detail: buildRollsDetail(rolls),
	};
	// If target is a party, attach author info so the roller sees "Tú" immediately in group logs
	const t = rollTargetSvc.getTarget();
	if (t && t.type === 'party') {
		const current: any = get(firebase.user as any);
		if (current?.uid) {
			(log as any).authorId = current.uid;
			(log as any).authorName = current.displayName ?? current.email ?? undefined;
		}
	}

	state.logs.update((x) => {
		const newArr = [...x, log];
		return newArr.slice(-MAX_LOGS_TO_KEEP);
	});
};

const mergeRemoteAndLocalLogs = (remoteLogs: RollLog[], localLogs: RollLog[]): RollLog[] => {
	const remoteMap = new Map<string, RollLog>();
	for (const log of remoteLogs) {
		if (log && (log as any).id) {
			remoteMap.set((log as any).id, log);
		}
	}

	const mergedById = new Map<string, RollLog>();

	// Start with remote entries
	for (const log of remoteLogs) {
		if (log && (log as any).id) {
			mergedById.set((log as any).id, log);
		}
	}

	// Overlay local entries, preferring pending ones
	for (const localLog of localLogs) {
		const lid = (localLog as any).id;

		if (!lid) {
			// Assign ID to local-only entry
			const genId = crypto.randomUUID();
			(localLog as any).id = genId;
			mergedById.set(genId, localLog);
			continue;
		}

		// Prefer pending local entries over remote ones
		if ((localLog as any).pending) {
			mergedById.set(lid, localLog);
			continue;
		}

		const remoteLog = remoteMap.get(lid);
		if (!remoteLog) {
			// Local-only entry
			mergedById.set(lid, localLog);
		} else {
			// Compare timestamps and prefer newer
			const localTime = new Date((localLog as any).timestamp).getTime();
			const remoteTime = new Date((remoteLog as any).timestamp).getTime();

			if (!isNaN(localTime) && !isNaN(remoteTime)) {
				mergedById.set(lid, localTime >= remoteTime ? localLog : remoteLog);
			} else {
				// Fallback to local if timestamps are invalid
				mergedById.set(lid, localLog);
			}
		}
	}

	// Convert to array, sort by timestamp, and trim
	const mergedArray = Array.from(mergedById.values()).sort(
		(a: RollLog, b: RollLog) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);

	return mergedArray.slice(-MAX_LOGS_TO_KEEP);
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

		// Setup Firebase integration
		(async () => {
			try {
				await firebase.initFirebase();

				await firebase.onAuthState(async (user) => {
					const previousUserId = currentUserId;
					currentUserId = user ? user.uid : null;

					// Stop previous listener if user changed
					if (previousUserId && previousUserId !== currentUserId && unsubscribeRemoteLogs) {
						try {
							unsubscribeRemoteLogs();
							unsubscribeRemoteLogs = null;
						} catch {
							// Ignore cleanup errors
						}
					}

					if (currentUserId && firebase.isEnabled()) {
						// Start listening to remote roll logs
						try {
							{
								const target = rollTargetSvc.getTarget();
								if (target && target.type === 'party') {
									unsubscribeRemoteLogs = (firebase as any).listenGroupRollLogsForParty(
										target.partyId,
										(remoteLogs: any[]) => {
											applyingRemoteLogsUpdate = true;
											try {
												const mapped = (remoteLogs || []).map((r: any) => mapRollLog(r));
												const local = get(state.logs) || [];
												const merged = mergeRemoteAndLocalLogs(mapped, local);
												state.logs.set(merged);
											} catch (applyErr) {
												console.error(
													'[dice-roller-service] Error applying remote logs:',
													applyErr,
												);
											} finally {
												applyingRemoteLogsUpdate = false;
											}
										},
									);
								} else {
									unsubscribeRemoteLogs = firebase.listenRollLogsForUser(
										currentUserId,
										(remoteLogs) => {
											applyingRemoteLogsUpdate = true;
											try {
												const mapped = (remoteLogs || []).map((r: any) => mapRollLog(r));
												const local = get(state.logs) || [];
												const merged = mergeRemoteAndLocalLogs(mapped, local);
												state.logs.set(merged);
											} catch (applyErr) {
												console.error(
													'[dice-roller-service] Error applying remote logs:',
													applyErr,
												);
											} finally {
												applyingRemoteLogsUpdate = false;
											}
										},
									);
								}
							}
						} catch (listenErr) {
							console.error('[dice-roller-service] Error starting remote listener:', listenErr);
						}
					} else {
						// Load local cached logs when not authenticated
						try {
							const key = (() => {
								const t = rollTargetSvc.getTarget();
								return t && t.type === 'party'
									? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
									: PERSONAL_STORAGE_KEY;
							})();
							const raw = localStorage.getItem(key);
							if (raw) {
								const parsed = JSON.parse(raw) as any[];
								const mappedLocal = parsed.map((x: any) => mapRollLog(x));
								state.logs.set(mappedLocal);
							}
						} catch (localErr) {
							console.error('[dice-roller-service] Error loading local logs:', localErr);
						}
					}
				});
			} catch (authErr) {
				console.warn(
					'[dice-roller-service] Firebase setup error (continuing with local logs):',
					authErr,
				);
			}
		})();
		// React to roll target changes: switch listener on the fly
		rollTargetSvc.target.subscribe((t) => {
			// Immediately reload local logs for the new target so the panel reflects only that source
			try {
				const key =
					t && t.type === 'party'
						? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
						: PERSONAL_STORAGE_KEY;
				const raw = localStorage.getItem(key);
				if (raw) {
					const parsed = JSON.parse(raw) as any[];
					const mappedLocal = parsed.map((x: any) => mapRollLog(x));
					state.logs.set(mappedLocal);
				} else {
					state.logs.set([]);
				}
			} catch {
				state.logs.set([]);
			}
			// Stop previous listener
			if (unsubscribeRemoteLogs) {
				try {
					unsubscribeRemoteLogs();
				} catch {
					/* ignore */
				}
				unsubscribeRemoteLogs = null;
			}
			// Start new listener depending on target and auth state
			if (currentUserId && firebase.isEnabled()) {
				try {
					if (t && t.type === 'party') {
						unsubscribeRemoteLogs = (firebase as any).listenGroupRollLogsForParty(
							t.partyId,
							(remoteLogs: any[]) => {
								applyingRemoteLogsUpdate = true;
								try {
									const mapped = (remoteLogs || []).map((r: any) => mapRollLog(r));
									const local = get(state.logs) || [];
									const merged = mergeRemoteAndLocalLogs(mapped, local);
									state.logs.set(merged);
								} catch (applyErr) {
									console.error('[dice-roller-service] Error applying remote logs:', applyErr);
								} finally {
									applyingRemoteLogsUpdate = false;
								}
							},
						);
					} else {
						unsubscribeRemoteLogs = firebase.listenRollLogsForUser(currentUserId, (remoteLogs) => {
							applyingRemoteLogsUpdate = true;
							try {
								const mapped = (remoteLogs || []).map((r: any) => mapRollLog(r));
								const local = get(state.logs) || [];
								const merged = mergeRemoteAndLocalLogs(mapped, local);
								state.logs.set(merged);
							} catch (applyErr) {
								console.error('[dice-roller-service] Error applying remote logs:', applyErr);
							} finally {
								applyingRemoteLogsUpdate = false;
							}
						});
					}
				} catch (listenErr) {
					console.error('[dice-roller-service] Error starting remote listener:', listenErr);
				}
			} else {
				// Fallback to local logs when not authenticated
				try {
					const key = (() => {
						const t = rollTargetSvc.getTarget();
						return t && t.type === 'party'
							? `${PARTY_STORAGE_KEY_PREFIX}${t.partyId}`
							: PERSONAL_STORAGE_KEY;
					})();
					const raw = localStorage.getItem(key);
					if (raw) {
						const parsed = JSON.parse(raw) as any[];
						const mappedLocal = parsed.map((x: any) => mapRollLog(x));
						state.logs.set(mappedLocal);
					} else {
						state.logs.set([]);
					}
				} catch (localErr) {
					console.error('[dice-roller-service] Error loading local logs:', localErr);
				}
			}
		});
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
								result.sides > 1
							) {
								roll.numExplosions++;
							}
						}

						if (roll.numExplosions > 0) {
							const explosionMember = {
								...roll.expressionMember,
								value: `${roll.numExplosions}d${roll.result[0].sides}`,
							};
							rolls.push({
								expressionMember: explosionMember,
								promise: rollDice(explosionMember.value as string),
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
