export const clickOutsideDetector = (node: Node) => {
	// the node has been mounted in the DOM

	let isJustOpened = false;

	// Use mousedown instead of click because Svelte 5 flushes effects
	// synchronously during click handlers, which can replace nodes before
	// composedPath() captures the correct path
	window.addEventListener('mousedown', handleMouseDown);

	function handleMouseDown(e: MouseEvent) {
		if (isJustOpened) return; // Ignore clicks right after open
		// Use composedPath() which captures the path even if nodes are detached
		if (!e.composedPath().includes(node)) {
			node.dispatchEvent(new CustomEvent('outsideclick', { bubbles: true }));
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener('mousedown', handleMouseDown);
		},
		update(options: { justOpened?: boolean }) {
			if (options?.justOpened !== undefined) {
				isJustOpened = options.justOpened;
				if (options.justOpened) {
					setTimeout(() => { isJustOpened = false; }, 100);
				}
			}
		}
	};
};
