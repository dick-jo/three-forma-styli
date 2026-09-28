import type { TimeDraft } from './support/types.js';

export const time = {
	defaultScale: 'neu', // short names: --t-min … --t-max
	scales: {
		neu: { unit: 'ms', values: { min: 50, lo: 100, hi: 200, max: 400 } },
		anim: { unit: 'ms', values: { min: 500, lo: 1000, hi: 2000, max: 4000 } },
	},
} as const satisfies TimeDraft;
