import type { axes } from '../axes/separate-files/axes.js';
import type { FontSizeDraft } from './review-types.js';

export const fontSize = {
	unit: 'rem',
	min: 0.625,
	start: 0.75,
	step: 0.125,
	count: 12,
	modes: {
		size: {
			s: { start: 0.6875 },
			l: { min: 0.6875, start: 0.8125 },
		},
	},
} as const satisfies FontSizeDraft<typeof axes>;
