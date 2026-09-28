import { fonts } from './fonts.js';
import { defineTypography } from './review-types.js';

export const typography = defineTypography({
	fonts,
	roles: {
		// 1. One weight, normal only: nothing about weight or style beyond the number.
		prose: {
			font: 'sans',
			weights: 400,
			sizes: {
				min: { fontSize: 1, lineHeight: 1.5, letterSpacing: 0 },
				s: { fontSize: 2, lineHeight: 1.5, letterSpacing: 0 },
				base: { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 },
				l: { fontSize: 4, lineHeight: 1.4, letterSpacing: 0 },
				max: { fontSize: 5, lineHeight: 1.4, letterSpacing: 0 },
			},
		},

		// 2. One weight, offered upright and italic.
		code: {
			font: 'mono',
			weights: 400,
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', lineHeight: 1.4, letterSpacing: 0 },
				s: { fontSize: 1, lineHeight: 1.4, letterSpacing: 0 },
				base: { fontSize: 2, lineHeight: 1.5, letterSpacing: 0 },
			},
		},

		// 3. Full weight range, upright and italic; larger sizes default heavier.
		body: {
			font: 'sans',
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
			weight: 'lo',
			styles: ['normal', 'italic'],
			sizes: {
				base: { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 },
				l: { fontSize: 5, lineHeight: 1.4, letterSpacing: 0, weight: 'hi' },
				max: { fontSize: 7, lineHeight: 1.3, letterSpacing: -0.005, weight: 'hi' },
			},
		},

		// 4. Sparse range: only the two endpoints; the largest size uses the heavier one.
		heading: {
			font: 'sans',
			weights: { min: 600, max: 800 },
			weight: 'min',
			sizes: {
				base: { fontSize: 6, lineHeight: 1.25, letterSpacing: -0.01 },
				l: { fontSize: 9, lineHeight: 1.15, letterSpacing: -0.015 },
				max: { fontSize: 12, lineHeight: 1.1, letterSpacing: -0.02, weight: 'max' },
			},
		},
	},
});
