import type { SpacingRange } from './support/authoring.js';

export const gap = {
	min: 'min',
	s: 1,
	l: 2,
	max: 3,
} as const satisfies SpacingRange;
