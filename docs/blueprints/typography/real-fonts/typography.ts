import type { FontRoleDraft } from './review-types.js';
import type { fonts } from './fonts.js';

export const typography = {
	roles: {
		code: {
			font: 'mono',
			weights: { min: 400, max: 700 },
			weight: 'min',
			sizes: {
				base: { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 },
			},
			styles: {
				normal: { weights: ['min', 'max'] },
				italic: { weights: ['min', 'max'] },
			},
		},
	},
} as const satisfies { roles: Record<string, FontRoleDraft<typeof fonts>> };
