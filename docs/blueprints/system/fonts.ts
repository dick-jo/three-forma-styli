import type { FontsDraft } from './support/types.js';

export const fonts = {
	sans: {
		files: ['./fonts/Supreme-Variable.woff2', './fonts/Supreme-VariableItalic.woff2'],
		category: 'sans',
	},
	mono: {
		files: ['./fonts/JetBrainsMono[wght].ttf', './fonts/JetBrainsMono-Italic[wght].ttf'],
		category: 'mono',
	},
} as const satisfies FontsDraft;
