import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const appEnv = {};
	for (const key in env) {
		if (key.startsWith('VITE_')) {
			appEnv[key] = env[key];
		}
	}

	return {
		plugins: [sveltekit(), svelteTesting()],
		server: {
			port: 5174,
		},
		test: {
			environment: 'jsdom',
			setupFiles: ['src/test/vitest-setup.ts'],
		},
		define: {
			__APP_ENV__: JSON.stringify(appEnv),
		},
	};
});
