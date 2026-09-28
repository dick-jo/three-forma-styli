import { defineAxes } from './support/types.js';

export const axes = defineAxes({
	theme: {
		modes: ['dark', 'light'],
		activation: { attribute: 'data-theme-mode' },
	},
	size: {
		modes: ['regular', 's', 'l'],
		activation: { attribute: 'data-size-mode' },
	},
});
