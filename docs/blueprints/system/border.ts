import type { axes } from './axes.js';
import type { BorderDraft } from './support/types.js';

export const border = {
	radius: {
		min: 'min',
		s: 1,
		l: 2,
		max: 3,
	},
	width: {
		unit: 'px',
		value: 1,
	},
} as const satisfies BorderDraft<typeof axes>;
