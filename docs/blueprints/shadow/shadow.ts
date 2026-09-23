import { shadowsForColors } from './review-helpers.js';
import type { ShadowDraft } from './review-types.js';

// Blueprint mock; helper declaration only, illustrative values. See README.md.
export const shadows = {
	// All lengths below use this unit.
	unit: 'px',
	// Give the neutral elevation range short names: --shd-min, --shd-lo, etc.
	defaultRange: 'neu',
	ranges: {
		// The ordinary elevation range uses the Color swatch named `shd`.
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

		// Optional inner shadows, with their own values: --shd-inset-min, etc.
		inset: {
			min: [{ inset: true, x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'min' } }],
			lo: [{ inset: true, x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo-x' } }],
			hi: [{ inset: true, x: 0, y: 3, blur: 6, color: { color: 'shd', alpha: 'lo' } }],
			max: [{ inset: true, x: 0, y: 4, blur: 8, color: { color: 'shd', alpha: 'lo' } }],
		},

		// Optional treatment tuned for text; `text` is an authored identity.
		text: {
			min: [{ x: 0, y: 1, blur: 0, color: { color: 'shd' } }],
			lo: [{ x: 0, y: 1, blur: 1, color: { color: 'shd' } }],
			hi: [{ x: 0, y: 2, blur: 2, color: { color: 'shd' } }],
			max: [{ x: 0, y: 3, blur: 3, color: { color: 'shd' } }],
		},

		// One glow design, applied to these Color identities.
		...shadowsForColors({
			prefix: 'glow',
			colors: ['neu', 'pri'],
			range: {
				min: [{ x: 0, y: 0, blur: 4, alpha: 'min' }],
				lo: [
					{ x: 0, y: 0, blur: 3, alpha: 'lo-x' },
					{ x: 0, y: 0, blur: 12, alpha: 'min' },
				],
				hi: [
					{ x: 0, y: 0, blur: 4, alpha: 'lo' },
					{ x: 0, y: 0, blur: 24, alpha: 'lo-x' },
				],
				max: [
					{ x: 0, y: 0, blur: 6, alpha: 'lo' },
					{ x: 0, y: 0, blur: 40, alpha: 'lo' },
				],
			},
		}),
	},
} as const satisfies ShadowDraft;
