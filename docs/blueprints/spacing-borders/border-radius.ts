import type { axes } from '../axes/separate-files/axes.js';
import type { SpacingRangeDraft } from './review-types.js';

export const radius = {
	min: 'min',
	s: 1,
	l: 2,
	max: 3,
} as const satisfies SpacingRangeDraft<typeof axes>;
