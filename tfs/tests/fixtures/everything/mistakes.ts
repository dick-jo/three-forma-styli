// Each @ts-expect-error proves TypeScript rejects the mistake while typing.
// An unused directive fails typecheck, so every case must keep failing.
import {
	defineColors,
	defineFontSize,
	defineGap,
	defineShadows,
	defineSpacing,
	defineTime,
	defineTypography,
	oklch,
} from 'three-forma-styli';
import { fonts } from './typography.js';

const c = oklch(0.5, 0, 0);
const m = { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 } as const;

// ---- Modes ----

defineSpacing({
	unit: 'px',
	min: 4,
	step: 8,
	count: 12,
	// @ts-expect-error `xl` is not a registered size mode.
	modes: { size: { xl: { step: 12 } } },
});

// @ts-expect-error `density` is not a registered axis.
defineGap({ min: 'min', s: 1, l: 2, max: 3, modes: { density: { s: { max: 2 } } } });

defineFontSize({
	unit: 'rem',
	min: 0.625,
	start: 0.75,
	step: 0.125,
	count: 12,
	// @ts-expect-error `huge` is not a registered size mode.
	modes: { size: { huge: { start: 1 } } },
});

// ---- Colours ----

// @ts-expect-error The group lists a colour the palette does not have.
defineColors({ tokens: { bg: c, pri: c }, groups: { accents: { identities: ['pri', 'tri'] } } });

defineColors({
	tokens: { bg: c, ink: c },
	constraints: {
		// @ts-expect-error The rule names a colour the palette does not have.
		luminance: { minimumLuminanceDelta: 0.3, backgroundColors: ['bgg'], foregroundColors: ['ink'] },
	},
});

// @ts-expect-error A mode cannot introduce a colour missing from the ordinary palette.
defineColors({ tokens: { bg: c }, modes: { theme: { light: { tokens: { fg: c } } } } });

// ---- Shadow ----

defineShadows({
	unit: 'px',
	// @ts-expect-error `nope` is not a registered colour.
	min: [{ x: 0, y: 1, blur: 2, color: { color: 'nope' } }],
});

defineShadows({
	unit: 'px',
	// @ts-expect-error `half` is not an Alpha position.
	min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'half' } }],
});

// ---- Time ----

// @ts-expect-error Time needs all four values.
defineTime({ unit: 'ms', values: { min: 50, lo: 100, hi: 200 } });

// ---- Typography ----

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error `serif` is not a declared font.
		quote: { font: 'serif', weights: 400, sizes: { base: m } },
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error A one-weight role's sizes cannot name a weight.
		caption: { font: 'sans', weights: 400, sizes: { base: { ...m, weight: 'lo' } } },
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error A several-weight role's size must state its weight.
		label: { font: 'mono', weights: { min: 400, max: 700 }, sizes: { base: m } },
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'mono',
			weights: { min: 500, max: 700 },
			// @ts-expect-error `hi` is not offered; only min and max.
			sizes: { base: { ...m, weight: 'hi' } },
		},
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'mono',
			weights: { min: 500, max: 700 },
			sizes: { base: { ...m, weight: 'min' } },
			// @ts-expect-error A mode cannot add a size the role does not have.
			modes: { size: { l: { sizes: { l: { lineHeight: 1 } } } } },
		},
	},
});

defineTypography({
	fonts,
	roles: {
		badge: {
			font: 'mono',
			weights: { min: 500, max: 700 },
			sizes: { base: { ...m, weight: 'min' } },
			// @ts-expect-error A mode cannot change which weights exist.
			modes: { size: { s: { weights: { min: 400, max: 700 } } } },
		},
	},
});

defineTypography({
	fonts,
	roles: {
		// @ts-expect-error Unknown physical style.
		code: { font: 'mono', weights: 400, styles: ['oblique'], sizes: { base: m } },
	},
});
