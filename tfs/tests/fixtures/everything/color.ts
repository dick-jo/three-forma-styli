import { defineAlpha, defineColors, oklch } from 'three-forma-styli';

export const alpha = defineAlpha({
	values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
});

export const colors = defineColors({
	// Complete ordinary palette (dark).
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.28, 0, 0),
		ink: oklch(0.92, 0, 0),
		neu: oklch(0.75, 0, 0),
		pri: oklch(0.7, 0.16, 285),
		duo: oklch(0.72, 0.14, 160),
		shd: oklch(0.06, 0, 0),
	},
	polarity: 'negative',

	groups: {
		accents: { identities: ['pri', 'duo'] },
	},

	constraints: {
		luminance: {
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['ink', 'neu', 'pri', 'duo'],
		},
	},

	// Only the changes. Dark has none, so it needs no entry.
	modes: {
		theme: {
			light: {
				tokens: {
					bg: oklch(0.97, 0, 0),
					ev: oklch(1, 0, 0),
					ink: oklch(0.18, 0, 0),
					neu: oklch(0.4, 0, 0),
					pri: oklch(0.45, 0.18, 285),
					duo: oklch(0.45, 0.14, 160),
					shd: oklch(0.2, 0, 0),
				},
				polarity: 'positive',
			},
		},
	},
});
