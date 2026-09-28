import { cubicBezier, defineEasings, defineTime, linear } from 'three-forma-styli';

export const time = defineTime({
	// Interface feedback: --t-min … --t-max.
	unit: 'ms',
	values: { min: 50, lo: 100, hi: 200, max: 400 },
	scales: {
		// Longer animation: --t-anim-min … --t-anim-max.
		anim: { unit: 'ms', values: { min: 500, lo: 1000, hi: 2000, max: 4000 } },
	},
});

export const easings = defineEasings({
	neu: cubicBezier(0.2, 0, 0.38, 0.9), // calm ease-out
	pri: cubicBezier(0.34, 1.56, 0.64, 1), // slight overshoot
	duo: linear(), // constant speed
});
