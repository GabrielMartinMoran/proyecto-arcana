import adapter from '@sveltejs/adapter-static';

// El nombre de tu repositorio de GitHub
const dev = process.argv.includes('dev');
const base = dev ? '' : '/proyecto-arcana';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html',
		}),
		paths: {
			base: base,
		},
	},
};

export default config;
