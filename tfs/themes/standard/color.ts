import { defineAlpha, defineColors, oklch } from 'three-forma-styli';

export const alpha = defineAlpha({
	values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
});

export const colors = defineColors({
	// Ordinary palette: dark.
	tokens: {
		bg: oklch(0.2603, 0, 129.63), // page background
		ev: oklch(0.2935, 0.0018, 286.29), // elevated surface
		ink: oklch(0.9333, 0.0371, 299.2), // text and icons
		neu: oklch(0.9302, 0.0371, 299.19), // neutral accent
		pri: oklch(0.7969, 0.1178, 296.37), // primary accent
		pos: oklch(0.7625, 0.203, 150.49), // positive
		neg: oklch(0.6875, 0.2113, 7.38), // negative
		shd: oklch(0, 0, 0), // shadow ink
	},
	polarity: 'negative',

	groups: {
		// The colours a component can be tinted with.
		colorways: { identities: ['neu', 'pri', 'pos', 'neg'] },
	},

	constraints: {
		luminance: {
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['ink', 'neu', 'pri', 'pos', 'neg'],
		},
	},

	modes: {
		theme: {
			light: {
				tokens: {
					bg: oklch(0.97, 0.005, 299),
					ev: oklch(1, 0, 0),
					ink: oklch(0.25, 0.03, 299),
					neu: oklch(0.4, 0.03, 299),
					pri: oklch(0.5, 0.16, 296),
					pos: oklch(0.55, 0.17, 150),
					neg: oklch(0.55, 0.2, 20),
					shd: oklch(0.2, 0, 0),
				},
				polarity: 'positive',
			},
		},
	},
});
