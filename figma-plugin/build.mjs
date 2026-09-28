// Bundles the plugin's sandbox code and copies its UI into dist/.
import { copyFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist', { recursive: true });
await build({
	entryPoints: ['src/code.ts'],
	outfile: 'dist/code.js',
	bundle: true,
	target: 'es2017',
	format: 'iife',
	logLevel: 'warning',
});
await copyFile('src/ui.html', 'dist/ui.html');
