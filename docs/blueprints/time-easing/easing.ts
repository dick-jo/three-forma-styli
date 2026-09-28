import { cubicBezier, linear } from './review-helpers.js';
import type { EasingValue } from './review-types.js';

export const easings = {
	neu: cubicBezier(0.2, 0, 0.38, 0.9),
	pri: cubicBezier(0.34, 1.56, 0.64, 1),
	duo: linear(),
	tri: linear([
		[0, 0],
		[0.4, 1],
		[0.6, 0.8],
		[0.8, 1],
		[0.9, 0.95],
		[1, 1],
	]),
} as const satisfies Readonly<Record<string, EasingValue>>;
