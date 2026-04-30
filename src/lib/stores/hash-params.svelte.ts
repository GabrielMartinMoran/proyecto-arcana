export function createHashParams() {
	let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');

	if (typeof window !== 'undefined') {
		window.addEventListener('hashchange', () => {
			hash = window.location.hash;
		});
	}

	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const params = $derived(new URLSearchParams(hash.slice(1)));

	return {
		get param() {
			return params;
		},
		get(key: string) {
			return params.get(key);
		},
		getAll(key: string) {
			return params.getAll(key);
		},
		has(key: string) {
			return params.has(key);
		},
		sync() {
			if (typeof window !== 'undefined') {
				hash = window.location.hash;
			}
		},
	};
}

export const hashParams = createHashParams();
