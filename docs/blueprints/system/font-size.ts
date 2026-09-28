import type { axes } from './axes.js';
import type { FontSizeDraft } from './support/types.js';

export const fontSize = {
	unit: 'rem',
	min: 0.625, // --fs-min
	start: 0.75, // --fs-1
	step: 0.125, // --fs-n = start + step × (n − 1)
	count: 12, // --fs-1 … --fs-12
	modes: {
		size: {
			s: { start: 0.6875 },
			l: { min: 0.6875, start: 0.8125 },
		},
	},
} as const satisfies FontSizeDraft<typeof axes>;
