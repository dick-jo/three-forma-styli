import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	base: './',
	plugins: [svelte()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		cssCodeSplit: false,
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
