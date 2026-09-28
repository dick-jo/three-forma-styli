// Each @ts-expect-error proves TypeScript rejects the mistake while editing.
import { fonts } from './fonts.js';
import { defineTypography, type TypographySelection } from './review-types.js';
import type { typography } from './typography.js';

const base = { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 } as const;

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error A one-weight role has no weight names to select.
		prose: { font: 'sans', weights: 400, weight: 'lo', sizes: { base } },
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error The default must name a weight this role offers.
		heading: { font: 'sans', weights: { min: 600, max: 800 }, weight: 'hi', sizes: { base } },
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error Unknown physical style.
		code: { font: 'mono', weights: 400, styles: ['oblique'], sizes: { base } },
	},
});

// ---- Consumer selections ----
type Selection = TypographySelection<(typeof typography)['roles']>;

export const valid: Selection[] = [
	{ role: 'code' },
	{ role: 'code', fontStyle: 'italic' },
	{ role: 'body', size: 'l' },
	{ role: 'body', fontStyle: 'italic' },
	{ role: 'body', size: 'l', weight: 'max' },
	{ role: 'heading', weight: 'max' },
];

export const invalid: Selection[] = [
	// @ts-expect-error prose offers only normal.
	{ role: 'prose', fontStyle: 'italic' },
	// @ts-expect-error code has one weight; nothing to choose.
	{ role: 'code', weight: 'max' },
	// @ts-expect-error heading offers min and max only.
	{ role: 'heading', weight: 'lo' },
];
