import type { AxisCatalogue } from './review-types.js';

// Proposed authoring mock, not input supported by today's compiler.
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
