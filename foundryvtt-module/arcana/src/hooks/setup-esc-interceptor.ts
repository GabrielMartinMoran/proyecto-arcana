/**
 * Intercepts the ESC keybinding in Foundry VTT to close only the active
 * collapsible window and bring the next one to the front.
 */

type CollapsibleWindow = {
	_minimized?: boolean;
	bringToFront?: () => void;
	bringToTop?: () => void;
	close: () => void;
	hasFrame?: boolean;
	minimized?: boolean;
	options?: {
		minimizable?: boolean;
		window?: { minimizable?: boolean };
	};
	popOut?: boolean;
	position?: { zIndex?: number };
	rendered?: boolean;
};

type FoundryApplications = {
	applications?: {
		instances?: { values: () => Iterable<CollapsibleWindow> };
	};
};

type FoundryTour = {
	close?: () => void;
	tourInProgress?: boolean;
};

type FoundryCanvas = {
	activeLayer?: {
		controlled?: unknown[];
		releaseAll?: () => void;
	};
};

type FoundryNotifications = {
	closeAll?: () => void;
	queue?: unknown[];
};

function getFoundryApplications(): FoundryApplications {
	return globalThis.foundry as FoundryApplications;
}

function getFoundryTour(): FoundryTour | undefined {
	return (globalThis as typeof globalThis & { Tour?: FoundryTour }).Tour;
}

function getFoundryCanvas(): FoundryCanvas | undefined {
	return (globalThis as typeof globalThis & { canvas?: FoundryCanvas }).canvas;
}

function getFoundryNotifications(): FoundryNotifications | undefined {
	return (ui as typeof ui & { notifications?: FoundryNotifications }).notifications;
}

function isCollapsible(app: CollapsibleWindow | undefined): boolean {
	if (!app) return false;
	// V2
	if (app.options?.window?.minimizable === true && app.hasFrame === true) return true;
	// V1
	if (app.options?.minimizable === true && app.popOut === true) return true;
	return false;
}

function isMinimized(app: CollapsibleWindow | undefined): boolean {
	if (!app) return false;
	return Boolean(app.minimized) || Boolean(app._minimized);
}

function getAllWindows(): CollapsibleWindow[] {
	const v1 = Object.values(ui.windows ?? {}) as unknown as CollapsibleWindow[];
	const v2 = Array.from(getFoundryApplications().applications?.instances?.values() ?? []).filter(
		(app) => app.rendered === true,
	);
	return [...v1, ...v2];
}

function getActiveCollapsibleWindow(windows: CollapsibleWindow[]): CollapsibleWindow | undefined {
	const active = windows
		.filter((w) => !isMinimized(w))
		.sort((a, b) => (b.position?.zIndex ?? 0) - (a.position?.zIndex ?? 0))[0];
	if (active && isCollapsible(active)) return active;
	return undefined;
}

function bringWindowToFront(app: CollapsibleWindow | undefined): void {
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
			const tour = getFoundryTour();
			if (tour?.tourInProgress) {
				tour.close?.();
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
				const canvas = getFoundryCanvas();
				if (canvas?.activeLayer?.controlled?.length) {
					canvas.activeLayer.releaseAll?.();
				}
				return true;
			}

			// Priority 5: Canvas selection
			const canvas = getFoundryCanvas();
			if (canvas?.activeLayer?.controlled?.length) {
				canvas.activeLayer.releaseAll?.();
				return true;
			}

			// Priority 6: Notifications
			const notifications = getFoundryNotifications();
			if (notifications?.queue?.length) {
				notifications.closeAll?.();
				return true;
			}

			return originalOnDown(ctx);
		} catch (error) {
			console.warn('Error in ESC interceptor:', error);
			return originalOnDown(ctx);
		}
	};
}
