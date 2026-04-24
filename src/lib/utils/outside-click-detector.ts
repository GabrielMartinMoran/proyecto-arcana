type ClickOutsideDetectorOptions = {
	onOutsideClick?: () => void;
	justOpened?: boolean;
};

export const clickOutsideDetector = (node: Node, options: ClickOutsideDetectorOptions = {}) => {
	// the node has been mounted in the DOM

	let isJustOpened = options.justOpened ?? false;
	let onOutsideClick = options.onOutsideClick;

	// Use mousedown instead of click because Svelte 5 flushes effects
	// synchronously during click handlers, which can replace nodes before
	// composedPath() captures the correct path
	window.addEventListener('mousedown', handleMouseDown);

	function handleMouseDown(e: MouseEvent) {
		if (isJustOpened) return; // Ignore clicks right after open
		// Use composedPath() which captures the path even if nodes are detached
		if (!e.composedPath().includes(node)) {
			onOutsideClick?.();
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener('mousedown', handleMouseDown);
		},
		update(nextOptions: ClickOutsideDetectorOptions = {}) {
			onOutsideClick = nextOptions.onOutsideClick;
			if (nextOptions.justOpened !== undefined) {
				isJustOpened = nextOptions.justOpened;
				if (nextOptions.justOpened) {
					setTimeout(() => {
						isJustOpened = false;
					}, 100);
				}
			}
		},
	};
};
