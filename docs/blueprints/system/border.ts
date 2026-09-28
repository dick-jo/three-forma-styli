import { defineBorder } from './support/types.js';

export const border = defineBorder({
	radius: {
		min: 'min',
		s: 1,
		l: 2,
		max: 3,
	},
	width: {
		unit: 'px',
		value: 1,
	},
});
