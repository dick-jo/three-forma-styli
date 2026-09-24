import type { RuntimeColorTheme } from '@three-forma-styli/core/runtime';
import type { runtimeColorThemeConfig } from './runtime-contract.js';

// A customer supplies the same five colours as the ordinary authoring example.
// The existing runtime API calls dark backgrounds / light foregrounds `negative`.
export const customerTheme = {
	polarity: 'negative',
	colors: {
		bg: { l: 0.2, c: 0, h: 0 },
		ev: { l: 0.3, c: 0, h: 0 },
		pri: { l: 0.5, c: 0.16, h: 285 },
		neu: { l: 0.75, c: 0, h: 0 },
		ink: { l: 0.9, c: 0, h: 0 },
	},
} as const satisfies RuntimeColorTheme<typeof runtimeColorThemeConfig.colorIdentities>;

// A deliberate customer edit, not automatic correction by TFS.
export const correctedTheme = {
	...customerTheme,
	colors: {
		...customerTheme.colors,
		pri: { ...customerTheme.colors.pri, l: 0.63 },
	},
} as const satisfies RuntimeColorTheme<typeof runtimeColorThemeConfig.colorIdentities>;
