import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Built into the TFS package, which serves it during `tfs dev`.
export default defineConfig({
	plugins: [svelte()],
	base: './',
	build: { outDir: '../tfs/dist/workbench', emptyOutDir: true },
});
