import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('svelte/compiler').ModuleCompileOptions} */
const config = {
	preprocess: vitePreprocess(),
};

export default config;
