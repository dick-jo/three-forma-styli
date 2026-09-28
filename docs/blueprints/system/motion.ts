import { cubicBezier, defineEasings, defineTime, linear } from './support/types.js';

export const time = defineTime({
	// Ordinary scale: --t-min … --t-max.
	unit: 'ms',
	values: { min: 50, lo: 100, hi: 200, max: 400 },
	// Named extras: --t-anim-*.
	scales: {
		anim: { unit: 'ms', values: { min: 500, lo: 1000, hi: 2000, max: 4000 } },
	},
});

export const easings = defineEasings({
	neu: cubicBezier(0.2, 0, 0.38, 0.9),
	pri: cubicBezier(0.34, 1.56, 0.64, 1),
	duo: linear(),
});
