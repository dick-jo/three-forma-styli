import { defineFonts, defineFontSize, defineTypography } from 'three-forma-styli';

export const fontSize = defineFontSize({
	unit: 'rem',
	min: 0.625, // --fs-min
	start: 0.75, // --fs-1
	step: 0.125, // --fs-n = start + step × (n − 1)
	count: 12,
	modes: {
		size: {
			s: { start: 0.6875 },
			l: { min: 0.6875, start: 0.8125 },
		},
	},
});

export const fonts = defineFonts({
	// The platform's own interface font: nothing to load.
	sans: { name: 'system-ui', fallbacks: ['sans-serif'] },
	// JetBrains Mono, SIL Open Font License (fonts/OFL.txt).
	mono: {
		files: ['./fonts/JetBrainsMono[wght].ttf', './fonts/JetBrainsMono-Italic[wght].ttf'],
		category: 'mono',
	},
});

export const typography = defineTypography({
	fonts,
	roles: {
		prose: {
			font: 'sans',
			weights: { min: 400, max: 700 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', weight: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
				s: { fontSize: 1, weight: 'min', lineHeight: 1.3, letterSpacing: 0.005 },
				base: { fontSize: 2, weight: 'min', lineHeight: 1.25, letterSpacing: 0 },
				l: { fontSize: 3, weight: 'min', lineHeight: 1.225, letterSpacing: -0.0025 },
				max: { fontSize: 4, weight: 'min', lineHeight: 1.2, letterSpacing: -0.005 },
			},
		},
		heading: {
			font: 'sans',
			weights: { min: 700, max: 800 },
			sizes: {
				min: { fontSize: 1, weight: 'min', lineHeight: 1.1, letterSpacing: 0 },
				s: { fontSize: 2, weight: 'min', lineHeight: 1.05, letterSpacing: -0.005 },
				base: { fontSize: 4, weight: 'min', lineHeight: 1, letterSpacing: -0.01 },
				l: { fontSize: 6, weight: 'max', lineHeight: 0.95, letterSpacing: -0.0175 },
				max: { fontSize: 8, weight: 'max', lineHeight: 0.9, letterSpacing: -0.025 },
			},
		},
		label: {
			font: 'mono',
			textTransform: 'uppercase',
			weights: { min: 400, max: 700 },
			styles: ['normal', 'italic'],
			sizes: {
				min: { fontSize: 'min', weight: 'min', lineHeight: 1.3, letterSpacing: 0.02 },
				s: { fontSize: 1, weight: 'min', lineHeight: 1.25, letterSpacing: 0.015 },
				base: { fontSize: 2, weight: 'min', lineHeight: 1.2, letterSpacing: 0.01 },
				l: { fontSize: 3, weight: 'min', lineHeight: 1.175, letterSpacing: 0.005 },
				max: { fontSize: 4, weight: 'min', lineHeight: 1.15, letterSpacing: 0 },
			},
		},
	},
});
