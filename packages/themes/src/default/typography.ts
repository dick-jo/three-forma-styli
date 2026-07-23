import {
	deriveTypographyRange,
	type DesignSystem,
	type TypographyFont,
	type TypographyMode,
	type TypographyRole,
} from '@three-forma-styli/core';

/**
 * The default theme's atomic font-size scale. fs-2 is the 14px application baseline;
 * every semantic role below references this shared twelve-step vocabulary.
 */
export const TYPOGRAPHY_MODES: Record<string, TypographyMode> = {
	default: {
		isDefault: true,
		tokens: {
			unit: 'rem',
			base: 0.75,
			min: 0.625,
			increment: 0.125,
			range: 12,
		},
	},
	small: {
		tokens: {
			unit: 'rem',
			base: 0.6875,
			min: 0.625,
			increment: 0.125,
			range: 12,
		},
	},
	large: {
		tokens: {
			unit: 'rem',
			base: 0.8125,
			min: 0.6875,
			increment: 0.125,
			range: 12,
		},
	},
};

/** Physical stacks only. Semantic weight aliases belong to roles. */
export const TYPOGRAPHY_FONTS: Record<string, TypographyFont> = {
	sans: {
		family: 'system-ui',
		fallbacks: ['sans-serif'],
		verification: 'unavailable',
	},
	mono: {
		family: 'ui-monospace',
		fallbacks: ['monospace'],
		verification: 'unavailable',
	},
};

const scale = TYPOGRAPHY_MODES.default.tokens;

const proseRange = deriveTypographyRange({
	scale,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
		base: { fontSize: 2, weight: 'min', lineHeight: 1.25, letterSpacing: 0 },
		max: { fontSize: 4, weight: 'min', lineHeight: 1.2, letterSpacing: -0.005 },
	},
	derived: {
		s: { between: ['min', 'base'] },
		l: { between: ['base', 'max'] },
	},
});

const headingRange = deriveTypographyRange({
	scale,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 1, weight: 'min', lineHeight: 1.1, letterSpacing: 0 },
		base: { fontSize: 4, weight: 'min', lineHeight: 1, letterSpacing: -0.01 },
		max: { fontSize: 8, weight: 'max', lineHeight: 0.9, letterSpacing: -0.025 },
	},
	derived: {
		s: { between: ['min', 'base'] },
		l: { between: ['base', 'max'], weight: 'max' },
	},
});

const labelRange = deriveTypographyRange({
	scale,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.3, letterSpacing: 0.02 },
		base: { fontSize: 2, weight: 'min', lineHeight: 1.2, letterSpacing: 0.01 },
		max: { fontSize: 4, weight: 'min', lineHeight: 1.15, letterSpacing: 0 },
	},
	derived: {
		s: { between: ['min', 'base'] },
		l: { between: ['base', 'max'] },
	},
});

/**
 * Every default-theme opinion is inspectable here. Core knows none of these role
 * names, variant names, curves, font assignments, or weight selections.
 */
export const TYPOGRAPHY_ROLES: Record<string, TypographyRole> = {
	prose: {
		font: 'sans',
		textTransform: 'none',
		...proseRange,
		weights: { min: 400, max: 700 },
	},
	heading: {
		font: 'sans',
		textTransform: 'none',
		...headingRange,
		weights: { min: 700, max: 800 },
	},
	label: {
		font: 'mono',
		textTransform: 'uppercase',
		...labelRange,
		weights: { min: 400, max: 700 },
	},
};

export const typography = {
	modes: Object.entries(TYPOGRAPHY_MODES).map(([name, mode]) => ({ name, ...mode })),
	fonts: TYPOGRAPHY_FONTS,
	roles: TYPOGRAPHY_ROLES,
} satisfies DesignSystem['typography'];
