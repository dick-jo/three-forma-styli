import type { AlphaSystem } from '@three-forma-styli/core';

export const alpha = {
	defaultScale: 'neu',
	scales: {
		neu: {
			values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
		},
	},
} as const satisfies AlphaSystem;
