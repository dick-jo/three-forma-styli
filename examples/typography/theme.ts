import {
	defineTypography,
	deriveTypographyRange,
	fontFromManifest,
	type FontSizeSystem,
	type PartialDesignSystem,
} from '../../packages/core/src/index.js';
import preparedFonts from './fonts.manifest.example.json';

const supreme = fontFromManifest(preparedFonts, 'supreme', {
	category: 'sans',
});

const jetbrains = fontFromManifest(preparedFonts, 'jetbrains', {
	category: 'mono',
});

/** The shared twelve-step atomic --fs-* scale. fs-2 is 14px at a 16px root. */
export const TYPE_SCALE: FontSizeSystem = {
	unit: 'rem',
	base: 0.75,
	min: 0.625,
	increment: 0.125,
	range: 12,
};

const proseRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
		base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
		max: { fontSize: 4, weight: 'lo', lineHeight: 1.2, letterSpacing: -0.005 },
	},
	derived: {
		s: { between: ['min', 'base'], weight: 'lo' },
		l: { between: ['base', 'max'] },
	},
});

const headingRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 1, weight: 'lo', lineHeight: 1.12, letterSpacing: 0 },
		base: { fontSize: 5, weight: 'max', lineHeight: 1, letterSpacing: -0.012 },
		max: { fontSize: 10, weight: 'max', lineHeight: 0.92, letterSpacing: -0.025 },
	},
	derived: {
		s: { between: ['min', 'base'], weight: 'hi' },
		l: { between: ['base', 'max'] },
	},
});

const labelRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.3, letterSpacing: 0.02 },
		base: { fontSize: 2, weight: 'lo', lineHeight: 1.2, letterSpacing: 0.01 },
		max: { fontSize: 4, weight: 'hi', lineHeight: 1.15, letterSpacing: 0 },
	},
	derived: {
		s: { between: ['min', 'base'], weight: 'lo' },
		l: { between: ['base', 'max'], weight: 'hi' },
	},
});

/**
 * A fully explicit, project-calibrated example. Core knows none of these role
 * names, ranges, weight aliases, or font assignments.
 */
export const typography = defineTypography({
	modes: [{ name: 'default', isDefault: true, tokens: TYPE_SCALE }],
	fonts: { supreme, jetbrains },
	roles: {
		prose: {
			font: 'supreme',
			...proseRange,
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
			styles: {
				normal: { weights: ['min', 'lo', 'hi', 'max'] },
				italic: { weights: ['min', 'lo', 'hi', 'max'] },
			},
		},
		heading: {
			font: 'supreme',
			...headingRange,
			weights: { min: 500, lo: 600, hi: 700, max: 800 },
			styles: {
				normal: { weights: ['min', 'lo', 'hi', 'max'] },
				italic: { weights: ['min', 'lo', 'hi', 'max'] },
			},
		},
		label: {
			font: 'jetbrains',
			...labelRange,
			weights: { min: 400, lo: 500, hi: 600, max: 700 },
			styles: {
				normal: { weights: ['min', 'lo', 'hi', 'max'] },
				italic: { weights: ['min', 'lo', 'hi', 'max'] },
			},
		},
	},
});

const designSystem = { typography } satisfies PartialDesignSystem;

export default designSystem;
