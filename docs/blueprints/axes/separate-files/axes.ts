import type { AxisCatalogue } from './support/authoring.js';

export const axes = {
	theme: {
		default: 'light',
		modes: ['light', 'dark'],
		activation: { attribute: 'data-theme-mode' },
	},
	size: {
		default: 'regular',
		modes: ['regular', 's', 'l'],
		activation: { attribute: 'data-size-mode' },
	},
} as const satisfies AxisCatalogue;
