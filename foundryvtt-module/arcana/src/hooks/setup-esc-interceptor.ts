/**
 * Intercepts the ESC keybinding in Foundry VTT to close only the active
 * collapsible window and bring the next one to the front.
 */

function isCollapsible(app: any): boolean {
	if (!app) return false;
	// V2
	if (app.options?.window?.minimizable === true && app.hasFrame === true) return true;
	// V1
	if (app.options?.minimizable === true && app.popOut === true) return true;
	return false;
}

function isMinimized(app: any): boolean {
	if (!app) return false;
	return Boolean(app.minimized) || Boolean(app._minimized);
}

function getAllWindows(): any[] {
	const v1 = Object.values(ui.windows ?? {});
	// @ts-expect-error — foundry.applications.instances is not typed in v13-beta types
	const v2 = Array.from(foundry.applications?.instances?.values() ?? []).filter(
		(app) => (app as any).rendered === true,
	);
	return [...v1, ...v2];
}

function getActiveCollapsibleWindow(windows: any[]): any | undefined {
	const active = windows
		.filter((w) => !isMinimized(w))
		.sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];
	if (active && isCollapsible(active)) return active;
	return undefined;
}

function bringWindowToFront(app: any): void {
	if (!app) return;
	if (typeof app.bringToFront === 'function') {
		app.bringToFront();
	} else if (typeof app.bringToTop === 'function') {
		app.bringToTop();
	}
}

export function setupEscInterceptor(): void {
	const binding = game.keybindings.activeKeys
		.get('Escape')
		?.find((b: any) => b.action === 'core.dismiss');
	if (!binding) return;

	const originalOnDown = binding.onDown;
	if (!originalOnDown) return;

	binding.onDown = (ctx: any) => {
		try {
			// Priority 1: Context menus
			if (ui.context?.menu?.length) {
				ui.context.close?.();
				return true;
			}

			// Priority 2: Tours
			if (typeof globalThis.Tour !== 'undefined' && globalThis.Tour.tourInProgress) {
				// @ts-expect-error
				globalThis.Tour.close?.();
				return true;
			}

			// Priority 3: Collapsible windows
			const windows = getAllWindows();
			const active = getActiveCollapsibleWindow(windows);

			if (active) {
				const next = windows
					.filter((w) => w !== active && isCollapsible(w) && !isMinimized(w))
					.sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];

				active.close();
				if (next) bringWindowToFront(next);
				return true;
			}

			// Priority 4: Solo quedan ventanas minimizadas
			const frontmost = windows.sort(
				(a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0),
			)[0];
			if (frontmost && isCollapsible(frontmost) && isMinimized(frontmost)) {
				// @ts-expect-error
				if (globalThis.canvas?.activeLayer?.controlled?.length) {
					// @ts-expect-error
					globalThis.canvas.activeLayer.releaseAll?.();
				}
				return true;
			}

			// Priority 5: Canvas selection
			// @ts-expect-error
			if (globalThis.canvas?.activeLayer?.controlled?.length) {
				// @ts-expect-error
				globalThis.canvas.activeLayer.releaseAll?.();
				return true;
			}

			// Priority 6: Notifications
			// @ts-expect-error
			if (ui.notifications?.queue?.length) {
				// @ts-expect-error
				ui.notifications.closeAll?.();
				return true;
			}

			return originalOnDown(ctx);
		} catch (error) {
			console.warn('Error in ESC interceptor:', error);
			return originalOnDown(ctx);
		}
	};
}
