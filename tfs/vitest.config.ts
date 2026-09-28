import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Some tests convert fonts (FontTools) or launch Chromium; CI machines are slower.
	test: { testTimeout: 30_000 },
	resolve: {
		alias: {
			'three-forma-styli/runtime': fileURLToPath(
				new URL('./src/runtime/index.ts', import.meta.url)
			),
			'three-forma-styli': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
		},
	},
});
