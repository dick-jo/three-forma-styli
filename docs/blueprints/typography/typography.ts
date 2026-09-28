import { fonts } from './fonts.js';
import type { TypographyDraft } from './review-types.js';

export const typography = {
	fonts,
	roles: {
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
	},
} as const satisfies TypographyDraft<typeof fonts>;
