/** Declaration only: the ratified constructors are not implemented or exported yet. */
import type { CubicBezierEasing, LinearEasing, LinearPoint } from './review-types.js';

export declare function cubicBezier(
	x1: number,
	y1: number,
	x2: number,
	y2: number
): CubicBezierEasing;
export declare function linear(): LinearEasing;
export declare function linear(points: readonly LinearPoint[]): LinearEasing;
