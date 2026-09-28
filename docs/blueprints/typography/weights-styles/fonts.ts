import type { FontsDraft } from './review-types.js';

export const fonts = {
	supreme: {
		sources: ['./supreme/Supreme-Variable.ttf', './supreme/Supreme-VariableItalic.ttf'],
		category: 'sans',
	},
	'jetbrains-mono': {
		sources: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
	},
} as const satisfies FontsDraft;
