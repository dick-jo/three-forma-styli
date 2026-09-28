import type { alpha } from './alpha.js';
import type { axes } from './axes.js';
import { colors } from './color.js';
import { shadowsForColors, type ShadowDraft } from './support/types.js';

export const shadows = {
	unit: 'px',
	defaultRange: 'neu', // short names: --shd-min … --shd-max
	ranges: {
		neu: {
			min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'min' } }],
			lo: [
				{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
				{ x: 0, y: 6, blur: 18, spread: -4, color: { color: 'shd', alpha: 'min' } },
			],
			hi: [
				{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
				{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo-x' } },
			],
			max: [
				{ x: 0, y: 3, blur: 6, color: { color: 'shd', alpha: 'lo' } },
				{ x: 0, y: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
			],
		},

		// One glow design, copied for each accent Color: glow-pri, glow-duo.
		...shadowsForColors({
			prefix: 'glow',
			colors: colors.groups.accents.identities,
			range: {
				min: [{ x: 0, y: 0, blur: 4, alpha: 'min' }],
				lo: [{ x: 0, y: 0, blur: 12, alpha: 'lo-x' }],
				hi: [{ x: 0, y: 0, blur: 24, alpha: 'lo' }],
				max: [{ x: 0, y: 0, blur: 40, alpha: 'lo' }],
			},
		}),
	},
} as const satisfies ShadowDraft<typeof axes, typeof colors, typeof alpha>;
