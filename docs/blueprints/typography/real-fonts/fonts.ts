import type { FontDraft } from './review-types.js';

export const fonts = {
	mono: {
		sources: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
	},
} as const satisfies Record<string, FontDraft>;
