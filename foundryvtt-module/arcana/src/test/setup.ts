/**
 * Global Vitest setup for the jsdom environment.
 *
 * jsdom does not implement PointerEvent, and the sheet action handlers receive
 * pointer events from Foundry's ApplicationV2. Tests construct them through the
 * global API, so we provide a minimal MouseEvent-based polyfill when missing.
 */
class PointerEventPolyfill extends MouseEvent {}

if (typeof globalThis.PointerEvent === 'undefined') {
	globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof globalThis.PointerEvent;
}
