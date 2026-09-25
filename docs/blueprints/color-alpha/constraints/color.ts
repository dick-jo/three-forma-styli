import { oklch } from '@three-forma-styli/core';
import type { axes } from '../../axes/separate-files/axes.js';
import type { ColorDraft } from './review-types.js';

// Approved blueprint shape; not an implemented authoring API.
export const colors = {
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.3, 0, 0),
		pri: oklch(0.7, 0.16, 285),
		neu: oklch(0.75, 0, 0),
		ink: oklch(0.9, 0, 0),
	},
	polarity: 'negative',
	constraints: {
		luminance: {
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['pri', 'neu', 'ink'],
		},
	},
	modes: {
		theme: {
			light: {
				tokens: {
					bg: oklch(0.8, 0, 0),
					ev: oklch(0.7, 0, 0),
					pri: oklch(0.3, 0.16, 285),
					neu: oklch(0.25, 0, 0),
					ink: oklch(0.1, 0, 0),
				},
				polarity: 'positive',
			},
			// Dark has no differences from the ordinary palette, so needs no entry.
		},
	},
} as const satisfies ColorDraft<typeof axes>;
