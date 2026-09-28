import type { FontsDraft } from './review-types.js';

export const fonts = {
	sans: {
		sources: ['./inter/Inter[opsz,wght].ttf', './inter/Inter-Italic[opsz,wght].ttf'],
		category: 'sans',
	},
	mono: {
		sources: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
	},
} as const satisfies FontsDraft;
