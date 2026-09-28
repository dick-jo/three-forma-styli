import { defineGap, defineSpacing } from 'three-forma-styli';

export const spacing = defineSpacing({
	unit: 'px',
	min: 4, // --sp-min
	step: 8, // --sp-n = 8 × n
	count: 12,
	modes: {
		size: {
			s: { min: 3, step: 6 },
			l: { min: 5, step: 10 },
		},
	},
});

export const gap = defineGap({ min: 'min', s: 1, l: 2, max: 3 });
