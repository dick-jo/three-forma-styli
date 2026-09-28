// Each @ts-expect-error proves TypeScript rejects the mistake while editing.
import { fonts } from './fonts.js';
import { defineTypography, type TypographySelection } from './review-types.js';
import type { typography } from './typography.js';

const m = { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 } as const;

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error A one-weight role's sizes cannot name a weight.
		caption: { font: 'supreme', weights: 400, sizes: { base: { ...m, weight: 'lo' } } },
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error A several-weight role's size must state its weight.
		label: { font: 'supreme', weights: { min: 400, max: 700 }, sizes: { base: m } },
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'supreme',
			weights: { min: 500, max: 700 },
			// @ts-expect-error badge offers min and max only; there is no hi.
			sizes: { base: { ...m, weight: 'hi' } },
		},
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error Unknown physical style.
		code: { font: 'supreme', weights: 400, styles: ['oblique'], sizes: { base: m } },
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'supreme',
			weights: { min: 500, max: 700 },
			sizes: { base: { ...m, weight: 'min' } },
			modes: {
				size: {
					// @ts-expect-error A mode cannot add a size the role does not have.
					l: { sizes: { l: { lineHeight: 1 } } },
				},
			},
		},
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'supreme',
			weights: { min: 500, max: 700 },
			sizes: { base: { ...m, weight: 'min' } },
			modes: {
				// @ts-expect-error Unknown mode.
				size: { huge: { sizes: { base: { lineHeight: 1 } } } },
			},
		},
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'supreme',
			weights: { min: 500, max: 700 },
			sizes: { base: { ...m, weight: 'min' } },
			// @ts-expect-error A mode cannot change which weights exist.
			modes: { size: { s: { weights: { min: 400, max: 700 } } } },
		},
	},
});

// ---- Consumer selections ----
type Selection = TypographySelection<(typeof typography)['roles']>;

export const valid: Selection[] = [
	{ role: 'prose' },
	{ role: 'prose', fontStyle: 'italic' },
	{ role: 'label', size: 's', weight: 'max' },
	{ role: 'label', fontStyle: 'italic', weight: 'lo' },
	{ role: 'caption' },
	{ role: 'badge', size: 'max', weight: 'min' },
];

export const invalid: Selection[] = [
	// @ts-expect-error caption offers only normal.
	{ role: 'caption', fontStyle: 'italic' },
	// @ts-expect-error caption has one weight; nothing to choose.
	{ role: 'caption', weight: 'max' },
	// @ts-expect-error badge offers min and max only.
	{ role: 'badge', weight: 'lo' },
	// @ts-expect-error badge has no l size.
	{ role: 'badge', size: 'l' },
];
