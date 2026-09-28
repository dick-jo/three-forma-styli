import type { TimeDraft, EasingValue } from './review-types.js';

// An alternative to time.ts, not an extra emitted scale.
export const timeInSeconds = {
	defaultScale: 'neu',
	scales: {
		neu: {
			unit: 's',
			values: { min: 0.05, lo: 0.1, hi: 0.2, max: 0.4 },
		},
	},
} as const satisfies TimeDraft;

// Equivalent to the helper-authored neu value; useful for inspecting stored data.
export const directEasing = {
	type: 'cubicBezier',
	value: [0.2, 0, 0.38, 0.9],
} as const satisfies EasingValue;
