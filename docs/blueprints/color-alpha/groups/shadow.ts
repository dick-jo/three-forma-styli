import { shadowsForColors } from '../../shadow/review-helpers.js';
import type { ShadowDraft } from '../../shadow/review-types.js';
import { colors } from './color.js';

// Blueprint only: reuses the accepted Shadow helper's declaration, not an implementation.
export const shadows = {
	unit: 'px',
	ranges: {
		...shadowsForColors({
			prefix: 'glow',
			colors: colors.groups.glow.identities,
			range: {
				min: [{ x: 0, y: 0, blur: 4, alpha: 'min' }],
				lo: [{ x: 0, y: 0, blur: 8, alpha: 'lo-x' }],
				hi: [{ x: 0, y: 0, blur: 16, alpha: 'lo' }],
				max: [{ x: 0, y: 0, blur: 32, alpha: 'hi' }],
			},
		}),
	},
} as const satisfies ShadowDraft;
