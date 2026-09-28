import { fonts } from './fonts.js';
import { defineTypography } from './review-types.js';

// Scatter's four production roles, values unchanged, in the proposed shape.
// `caption` (one weight) and `badge` (two weights) are hypothetical cases.
export const typography = defineTypography({
	fonts,
	roles: {
		prose: {
			font: 'supreme',
			textTransform: 'none',
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', weight: 'lo', lineHeight: 1.35, letterSpacing: 0.01 },
				s: { fontSize: 1, weight: 'lo', lineHeight: 1.3, letterSpacing: 0.005 },
				base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
				l: { fontSize: 3, weight: 'lo', lineHeight: 1.225, letterSpacing: -0.0025 },
				max: { fontSize: 4, weight: 'lo', lineHeight: 1.2, letterSpacing: -0.005 },
			},
		},
		heading: {
			font: 'supreme',
			textTransform: 'uppercase',
			weights: { min: 500, lo: 600, hi: 700, max: 800 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 1, weight: 'max', lineHeight: 1, letterSpacing: 0 },
				s: { fontSize: 2, weight: 'max', lineHeight: 0.9, letterSpacing: -0.005 },
				base: { fontSize: 4, weight: 'max', lineHeight: 0.8, letterSpacing: -0.01 },
				l: { fontSize: 6, weight: 'max', lineHeight: 0.8, letterSpacing: -0.0175 },
				max: { fontSize: 8, weight: 'max', lineHeight: 0.8, letterSpacing: -0.025 },
			},
			// Hypothetical: only the changes, like every other domain.
			modes: {
				size: {
					s: { sizes: { max: { lineHeight: 0.9 } } },
				},
			},
		},
		label: {
			font: 'jetbrains-mono',
			textTransform: 'uppercase',
			weights: { min: 400, lo: 500, hi: 600, max: 700 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', weight: 'lo', lineHeight: 1.3, letterSpacing: 0.02 },
				s: { fontSize: 1, weight: 'lo', lineHeight: 1.25, letterSpacing: 0.015 },
				base: { fontSize: 2, weight: 'lo', lineHeight: 1.2, letterSpacing: 0.01 },
				l: { fontSize: 3, weight: 'lo', lineHeight: 1.175, letterSpacing: 0.005 },
				max: { fontSize: 4, weight: 'lo', lineHeight: 1.15, letterSpacing: 0 },
			},
		},
		code: {
			font: 'jetbrains-mono',
			textTransform: 'none',
			weights: { min: 400, lo: 500, hi: 600, max: 700 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', weight: 'lo', lineHeight: 1.3, letterSpacing: 0 },
				s: { fontSize: 1, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
				base: { fontSize: 2, weight: 'lo', lineHeight: 1.2, letterSpacing: 0 },
				l: { fontSize: 3, weight: 'lo', lineHeight: 1.175, letterSpacing: 0 },
				max: { fontSize: 4, weight: 'lo', lineHeight: 1.15, letterSpacing: 0 },
			},
		},
		caption: {
			font: 'system',
			weights: 400,
			sizes: {
				base: { fontSize: 1, lineHeight: 1.3, letterSpacing: 0 },
			},
		},
		badge: {
			font: 'jetbrains-mono',
			textTransform: 'uppercase',
			weights: { min: 500, max: 700 },
			sizes: {
				base: { fontSize: 1, weight: 'min', lineHeight: 1, letterSpacing: 0.02 },
				max: { fontSize: 3, weight: 'max', lineHeight: 1, letterSpacing: 0.01 },
			},
		},
	},
});
