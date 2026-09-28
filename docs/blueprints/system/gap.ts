import type { axes } from './axes.js';
import type { SpacingRangeDraft } from './support/types.js';

// Each position points at a Spacing position and follows it through Size modes.
export const gap = {
	min: 'min',
	s: 1,
	l: 3,
	max: 6,
} as const satisfies SpacingRangeDraft<typeof axes>;
