import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	base: './',
	plugins: [svelte()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		cssCodeSplit: false,
		// The Workbench is a checked-in review artifact, not application payload.
		// Keeping it inspectable also avoids minifiers encoding runtime whitespace
		// sets as literal trailing whitespace inside template strings.
		minify: false,
		rollupOptions: {
			output: {
				entryFileNames: 'workbench.js',
				assetFileNames: (asset) =>
					asset.names.some((name) => name.endsWith('.css'))
						? 'workbench.css'
						: 'assets/[name][extname]',
			},
		},
	},
});
