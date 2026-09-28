import type { FontsDraft } from './review-types.js';

export const fonts = {
	supreme: {
		files: ['./supreme/Supreme-Variable.ttf', './supreme/Supreme-VariableItalic.ttf'],
		category: 'sans',
	},
	'jetbrains-mono': {
		files: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
	},
	system: {
		name: 'system-ui',
		fallbacks: ['sans-serif'],
	},
} as const satisfies FontsDraft;
