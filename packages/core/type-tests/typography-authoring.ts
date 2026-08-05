import { defineTypography, deriveTypographySizes } from '../src/index.js';

const mode = {
	name: 'default',
	isDefault: true as const,
	tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 12 },
};

const displayMode = {
	name: 'display',
	tokens: { unit: 'rem', base: 1.5, min: 1, increment: 0.5, range: 12 },
};

defineTypography({ modes: [mode] });

const explicit = defineTypography({
	modes: [mode, displayMode],
	fonts: {
		editorial: {
			family: 'Editorial Sans',
			fallbacks: ['sans-serif'],
			verification: 'unavailable',
		},
		mono: {
			family: 'Interface Mono',
			fallbacks: ['monospace'],
			verification: 'unavailable',
		},
	},
	roles: {
		reading: {
			font: 'editorial',
			weight: 'min',
			weights: { min: 400, max: 700 },
			sizes: {
				base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0 },
				min: { fontSize: 1, lineHeight: 1.2, letterSpacing: 0.01 },
			},
			variants: { emphatic: { weight: 'max' } },
			modeOverrides: {
				display: {
					sizes: {
						base: { fontSize: 4, weight: 'max', lineHeight: 0.85 },
						min: { letterSpacing: -0.01 },
					},
				},
			},
		},
	},
});

explicit.roles.reading.sizes.min;
explicit.roles.reading.variants!.emphatic;

// @ts-expect-error configured font IDs remain literal and typo-safe
defineTypography({
	modes: [mode],
	fonts: { editorial: { family: 'Editorial Sans', verification: 'unavailable' } },
	roles: {
		reading: {
			font: 'editoriall',
			weights: 400,
			sizes: { base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0 } },
		},
	},
});

const range = deriveTypographySizes({
	scale: mode.tokens,
	anchors: {
		base: { fontSize: 2, weight: 'min', lineHeight: 1.25, letterSpacing: 0 },
		max: { fontSize: 4, weight: 'min', lineHeight: 1.1, letterSpacing: -0.01 },
	},
	derived: { l: { between: ['base', 'max'], at: 0.25 } },
});

range.l;
range.max;
// @ts-expect-error TFS owns the fixed size vocabulary
range.medium;
