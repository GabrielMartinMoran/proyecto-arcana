import * as esbuild from 'esbuild';
import * as fs from 'fs';

const watch = process.argv.includes('--watch');

const config = {
	entryPoints: ['main.ts'],
	bundle: true,
	outfile: 'dist/main.js',
	format: 'esm',
	platform: 'browser',
	target: 'es2022',
	sourcemap: true,
	external: [],
	logLevel: 'info',
};

// Copy static files to dist
function copyStaticFiles() {
	// Create dist directory if it doesn't exist
	if (!fs.existsSync('dist')) {
		fs.mkdirSync('dist', { recursive: true });
	}

	// Copy template.html
	fs.copyFileSync('template.html', 'dist/template.html');
	console.log('📄 Copied template.html to dist/');

	// Copy system.json
	fs.copyFileSync('system.json', 'dist/system.json');
	console.log('📄 Copied system.json to dist/');

	// Copy main.js to root (for direct module loading)
	fs.copyFileSync('dist/main.js', 'main.js');
	console.log('📄 Copied main.js to root/');
}

if (watch) {
	const context = await esbuild.context(config);
	await context.watch();
	copyStaticFiles();
	console.log('👀 Watching for changes...');
} else {
	await esbuild.build(config);
	copyStaticFiles();
	console.log('✅ Build complete!');
}
