/**
 * Wires ApplicationV2 detached-window lifecycle (Foundry v14) to the Arcana
 * integration:
 * - injects the full-bleed stylesheet that turns a detached window into the
 *   sheet itself (it also styles the sheet's floating re-attach control),
 * - forwards the same web-to-module message handling used in the main
 *   workspace to each detached window, and
 * - lets ESC close the detached window's primary application without touching
 *   other windows.
 *
 * The application implementation runs in the main workspace context while its
 * DOM lives in the detached window's Document, so messages posted by the
 * embedded iframe reach `window.parent` (the detached window) instead of the
 * main workspace listener. Registrations are keyed by window id and cleaned up
 * on close/re-open so no message is ever processed twice.
 */

import { registerMessageListener, type MessageHandler } from '../listeners/message-listener';

/** Id of the stylesheet that turns a detached window into a full-bleed sheet. */
export const DETACHED_STYLES_ID = 'arcana-detached-styles';

/**
 * Full-bleed rules for detached Arcana sheets plus the floating re-attach
 * control. Foundry's detached-window harness clones every `<style>` from the
 * main workspace head into each new window before adopting the application DOM
 * (window-manager.mjs), so these rules are already active when the sheet moves.
 * The `body.detached` scope keeps them inert in the main workspace; geometry
 * needs `!important` because the core writes inline pixel sizes.
 */
const DETACHED_STYLES_CSS = `
body.detached .application.arcana {
	left: 0 !important;
	top: 0 !important;
	width: 100% !important;
	height: 100% !important;
	max-width: none !important;
	max-height: none !important;
	min-width: 0;
	min-height: 0;
	border: none;
	border-radius: 0;
	box-shadow: none;
}

body.detached .application.arcana .window-header {
	display: none;
}

body.detached .application.arcana .window-content {
	padding: 0;
}

.arcana-detach-return {
	position: absolute;
	top: 8px;
	right: 8px;
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.25);
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.55);
	color: #f0f0e0;
	cursor: pointer;
	opacity: 0.35;
}

.arcana-detach-return:hover {
	opacity: 1;
}
`;

/**
 * Inject the detached-window stylesheet into a document head. Idempotent: a
 * document that already carries the style (including double registrations) is
 * left untouched.
 */
export function ensureDetachedStyles(doc: Document = document): void {
	if (!doc?.head || doc.getElementById(DETACHED_STYLES_ID)) return;

	const style = doc.createElement('style');
	style.id = DETACHED_STYLES_ID;
	style.textContent = DETACHED_STYLES_CSS;
	doc.head.append(style);
}

type DetachedApplication = { close?: () => void };

type DetachedWindowRegistration = {
	removeMessageListener: () => void;
	onKeyDown: (event: KeyboardEvent) => void;
	window: Window;
};

const registrationsByWindowId = new Map<string, DetachedWindowRegistration>();

/**
 * Register message forwarding and ESC handling on a detached window.
 * Re-registering the same window id replaces the previous registration.
 */
export function registerDetachedWindow(
	windowId: string,
	detachedWindow: Window,
	messageHandler?: MessageHandler,
): void {
	unregisterDetachedWindow(windowId);
	if (typeof detachedWindow?.addEventListener !== 'function') return;

	const removeMessageListener = registerMessageListener(detachedWindow, messageHandler);
	const onKeyDown = (event: KeyboardEvent): void => closeApplicationOnEscape(windowId, event);

	detachedWindow.addEventListener('keydown', onKeyDown);
	registrationsByWindowId.set(windowId, {
		removeMessageListener,
		onKeyDown,
		window: detachedWindow,
	});
}

/** Remove every listener registered for a detached window id. */
export function unregisterDetachedWindow(windowId: string): void {
	const registration = registrationsByWindowId.get(windowId);
	if (!registration) return;

	registration.removeMessageListener();
	registration.window.removeEventListener('keydown', registration.onKeyDown);
	registrationsByWindowId.delete(windowId);
}

/** Register the v14 detached-window hooks. */
export function setupDetachedWindow(messageHandler?: MessageHandler): void {
	ensureDetachedStyles();

	// @ts-expect-error - openDetachedWindow is a v14 hook missing from the installed v13 types
	Hooks.on('openDetachedWindow', (windowId: string, detachedWindow: Window) => {
		registerDetachedWindow(windowId, detachedWindow, messageHandler);
	});
	// @ts-expect-error - closeDetachedWindow is a v14 hook missing from the installed v13 types
	Hooks.on('closeDetachedWindow', (windowId: string) => {
		unregisterDetachedWindow(windowId);
	});
}

function closeApplicationOnEscape(windowId: string, event: KeyboardEvent): void {
	if (event.key !== 'Escape') return;

	const application = findApplication(windowId);
	if (typeof application?.close !== 'function') return;

	event.preventDefault();
	event.stopPropagation();
	application.close();
}

function findApplication(windowId: string): DetachedApplication | undefined {
	const instances = (globalThis as any).foundry?.applications?.instances;
	return instances?.get?.(windowId);
}
