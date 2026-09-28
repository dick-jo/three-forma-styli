import type { ProjectFont } from '@three-forma-styli/compiler';

export const fonts = {
	mono: {
		sources: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
		license: {
			id: 'OFL-1.1',
			file: './jetbrains-mono/OFL.txt',
			allowWebEmbedding: true,
			webEmbeddingBasis: 'SIL Open Font License 1.1 permits embedding and redistribution.',
			allowTransformations: true,
		},
	},
} as const satisfies Record<string, ProjectFont>;
