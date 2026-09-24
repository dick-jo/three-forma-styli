import type { AxisCatalogue } from './support/authoring.js';

export const axes = {
	theme: {
		modes: ['light', 'dark'],
		activation: { attribute: 'data-theme-mode' },
	},
	size: {
		modes: ['regular', 's', 'l'],
		activation: { attribute: 'data-size-mode' },
	},
} as const satisfies AxisCatalogue;
