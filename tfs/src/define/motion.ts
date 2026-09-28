import type { LO_HI_POSITIONS, TIME_UNITS } from '../const.js';

type TimeScale = {
	readonly unit: (typeof TIME_UNITS)[number];
	readonly values: Readonly<Record<(typeof LO_HI_POSITIONS)[number], number>>;
};

/** Ordinary scale unnamed at the top (--t-*); named extras in `scales` (--t-{name}-*). */
export type TimeDraft = TimeScale & {
	readonly scales?: Readonly<Record<string, TimeScale>>;
};

export function defineTime<const T extends TimeDraft>(time: T): T {
	return time;
}

type CubicBezierEasing = {
	readonly type: 'cubicBezier';
	readonly value: readonly [x1: number, y1: number, x2: number, y2: number];
};
type LinearPoint = readonly [input: number, output: number];
type LinearEasing = { readonly type: 'linear'; readonly value: readonly LinearPoint[] };
export type EasingValue = CubicBezierEasing | LinearEasing;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): CubicBezierEasing {
	return { type: 'cubicBezier', value: [x1, y1, x2, y2] };
}

/** `[input, output]` points; inputs ordered, equal inputs jump, outputs may overshoot. No points = constant speed. */
export function linear(points?: readonly LinearPoint[]): LinearEasing {
	return {
		type: 'linear',
		value: points ?? [
			[0, 0],
			[1, 1],
		],
	};
}

export function defineEasings<const T extends Readonly<Record<string, EasingValue>>>(
	easings: T
): T {
	return easings;
}
