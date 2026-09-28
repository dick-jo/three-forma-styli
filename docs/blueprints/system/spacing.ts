import type { axes } from './axes.js';
import type { SpacingDraft } from './support/types.js';

export const spacing = {
	unit: 'px',
	min: 4, // --sp-min
	step: 8, // --sp-n = 8 × n
	count: 12, // --sp-1 … --sp-12
	modes: {
		size: {
			s: { min: 3, step: 6 },
			l: { min: 5, step: 10 },
		},
	},
} as const satisfies SpacingDraft<typeof axes>;
