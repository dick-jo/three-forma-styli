import type { axes } from './axes.js';
import type { SpacingDraft } from './support/authoring.js';

export const spacing = {
	unit: 'px',
	range: 12,
	modes: {
		size: {
			// `base` is today's multiplication-step input, not a token position.
			regular: { base: 8, min: 4 },
			s: { base: 6, min: 3 },
			l: { base: 10, min: 5 },
		},
	},
} as const satisfies SpacingDraft<typeof axes>;
