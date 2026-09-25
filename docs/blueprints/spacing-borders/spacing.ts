import type { axes } from '../axes/separate-files/axes.js';
import type { SpacingDraft } from './review-types.js';

export const spacing = {
	unit: 'px',
	min: 4,
	step: 8,
	count: 12,
	modes: {
		size: {
			s: { min: 3, step: 6 },
			l: { min: 5, step: 10 },
		},
	},
} as const satisfies SpacingDraft<typeof axes>;
