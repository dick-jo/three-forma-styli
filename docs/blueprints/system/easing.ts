import { cubicBezier, linear, type EasingValue } from './support/types.js';

export const easings = {
	neu: cubicBezier(0.2, 0, 0.38, 0.9),
	pri: cubicBezier(0.34, 1.56, 0.64, 1),
	duo: linear(),
} as const satisfies Readonly<Record<string, EasingValue>>;
