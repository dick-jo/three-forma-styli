import type { AxisCatalogue } from './support/types.js';

export const axes = {
	theme: {
		modes: ['dark', 'light'],
		activation: { attribute: 'data-theme-mode' },
	},
	size: {
		modes: ['regular', 's', 'l'],
		activation: { attribute: 'data-size-mode' },
	},
} as const satisfies AxisCatalogue;
