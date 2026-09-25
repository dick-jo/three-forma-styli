import type { axes } from '../axes/separate-files/axes.js';
import type { BorderWidthDraft, SpacingDraft, SpacingRangeDraft } from './review-types.js';

// Independent alternatives for review; not extra simultaneously emitted scales.
export const remSpacing = {
	unit: 'rem',
	min: 0.25,
	step: 0.5,
	count: 12,
} as const satisfies SpacingDraft<typeof axes>;

export const radiusWithSizeChanges = {
	min: 'min',
	s: 1,
	l: 2,
	max: 3,
	modes: {
		size: {
			l: { max: 4 },
		},
	},
} as const satisfies SpacingRangeDraft<typeof axes>;

export const widthWithSizeChanges = {
	unit: 'px',
	value: 1,
	modes: {
		size: {
			l: { value: 2 },
		},
	},
} as const satisfies BorderWidthDraft<typeof axes>;
