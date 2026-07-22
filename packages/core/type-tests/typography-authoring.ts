import { defineTypography, deriveTypographyRange } from '../src/index.js';

const mode = {
	name: 'default',
	isDefault: true as const,
	tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 12 },
};

defineTypography({ modes: [mode] });

const explicit = defineTypography({
	modes: [mode],
	fonts: {
		supreme: {
			family: 'Supreme',
			fallbacks: ['sans-serif'],
			verification: 'unavailable',
		},
		mono: {
			family: 'JetBrains Mono',
			fallbacks: ['monospace'],
			verification: 'unavailable',
		},
	},
	roles: {
		reading: {
			font: 'supreme',
			base: { fontSize: 2, weight: 'regular', lineHeight: 1.25, letterSpacing: 0 },
			variants: {
				compact: { fontSize: 1, weight: 'regular', lineHeight: 1.2, letterSpacing: 0.01 },
			},
			weights: { regular: 400, strong: 700 },
		},
	},
});

explicit.roles.reading.variants.compact;

// @ts-expect-error configured font IDs remain literal and typo-safe
defineTypography({
	modes: [mode],
	fonts: { supreme: { family: 'Supreme', verification: 'unavailable' } },
	roles: {
		reading: {
			font: 'suprme',
			base: { fontSize: 2, weight: 'regular', lineHeight: 1.25, letterSpacing: 0 },
			weights: { regular: 400 },
		},
	},
});

const range = deriveTypographyRange({
	scale: mode.tokens,
	order: ['small', 'base', 'large'],
	anchors: {
		base: { fontSize: 2, weight: 'regular', lineHeight: 1.25, letterSpacing: 0 },
		large: { fontSize: 4, weight: 'regular', lineHeight: 1.1, letterSpacing: -0.01 },
	},
	derived: { small: { between: ['base', 'large'], at: 0.25 } },
});

range.variants.small;
range.variants.large;
// @ts-expect-error arbitrary caller vocabulary remains literal
range.variants.medium;
