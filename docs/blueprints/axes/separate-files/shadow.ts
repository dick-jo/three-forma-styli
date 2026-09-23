import type { axes } from './axes.js';
import type { colors } from './color.js';
import type { alpha } from './alpha.js';
import type { ShadowDraft } from './support/authoring.js';

export const shadows = {
	unit: 'px',
	defaultRange: 'neu',
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
	},
	// Optional actual measurement change; Color following needs no mode entry.
	modes: {
		size: {
			s: {
				ranges: {
					neu: {
						max: [
							{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
							{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo' } },
						],
					},
				},
			},
		},
	},
} as const satisfies ShadowDraft<typeof axes, typeof colors, typeof alpha>;
