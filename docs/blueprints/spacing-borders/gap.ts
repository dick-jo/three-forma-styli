import type { axes } from '../axes/separate-files/axes.js';
import type { SpacingRangeDraft } from './review-types.js';

export const gap = {
	min: 'min',
	s: 1,
	l: 3,
	max: 6,
} as const satisfies SpacingRangeDraft<typeof axes>;
