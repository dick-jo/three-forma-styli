import { fonts } from './fonts.js';
import { defineTypography } from './review-types.js';

// Scatter's four production roles, values unchanged, in the proposed shape.
// `caption` is hypothetical: the one-weight case, which Scatter does not use.
export const typography = defineTypography({
	fonts,
	roles: {
		prose: {
			font: 'supreme',
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
			weight: 'lo',
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
				s: { fontSize: 1, lineHeight: 1.3, letterSpacing: 0.005 },
				base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0 },
				l: { fontSize: 3, lineHeight: 1.225, letterSpacing: -0.0025 },
				max: { fontSize: 4, lineHeight: 1.2, letterSpacing: -0.005 },
			},
		},
		heading: {
			font: 'supreme',
			weights: { min: 500, lo: 600, hi: 700, max: 800 },
			weight: 'max',
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 1, lineHeight: 1, letterSpacing: 0 },
				s: { fontSize: 2, lineHeight: 0.9, letterSpacing: -0.005 },
				base: { fontSize: 4, lineHeight: 0.8, letterSpacing: -0.01 },
				l: { fontSize: 6, lineHeight: 0.8, letterSpacing: -0.0175 },
				max: { fontSize: 8, lineHeight: 0.8, letterSpacing: -0.025 },
			},
		},
		label: {
			font: 'jetbrains-mono',
			weights: { min: 400, lo: 500, hi: 600, max: 700 },
			weight: 'lo',
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', lineHeight: 1.3, letterSpacing: 0.02 },
				s: { fontSize: 1, lineHeight: 1.25, letterSpacing: 0.015 },
				base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0.01 },
				l: { fontSize: 3, lineHeight: 1.175, letterSpacing: 0.005 },
				max: { fontSize: 4, lineHeight: 1.15, letterSpacing: 0 },
			},
		},
		code: {
			font: 'jetbrains-mono',
			weights: { min: 400, lo: 500, hi: 600, max: 700 },
			weight: 'lo',
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', lineHeight: 1.3, letterSpacing: 0 },
				s: { fontSize: 1, lineHeight: 1.25, letterSpacing: 0 },
				base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 },
				l: { fontSize: 3, lineHeight: 1.175, letterSpacing: 0 },
				max: { fontSize: 4, lineHeight: 1.15, letterSpacing: 0 },
			},
		},
		caption: {
			font: 'supreme',
			weights: 400,
			sizes: {
				base: { fontSize: 1, lineHeight: 1.3, letterSpacing: 0 },
			},
		},
	},
});
