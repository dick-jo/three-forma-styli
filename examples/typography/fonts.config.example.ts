import type { FontsPreparationConfig } from '@three-forma-styli/cli/fonts';

/** Replace the source and license paths with files you are licensed to ship. */
export default {
	output: {
		directory: './generated/fonts',
		// URLs stay relative to fonts.css, which keeps standalone specimens portable.
		publicPath: '.',
	},
	fonts: {
		supreme: {
			family: 'Supreme',
			strategy: 'copy',
			license: {
				id: 'ITF-FFL',
				file: './source-fonts/supreme/FFL.txt',
				// Keep false until Fontshare/ITF confirms self-hosting in writing.
				allowWebEmbedding: false,
				webEmbeddingBasis: 'PENDING written Fontshare/ITF self-hosting permission.',
				allowTransformations: false,
			},
			sources: [
				'./source-fonts/supreme/Supreme-Variable.woff2',
				'./source-fonts/supreme/Supreme-VariableItalic.woff2',
			],
		},
		jetbrains: {
			family: 'JetBrains Mono',
			strategy: 'woff2',
			license: {
				id: 'OFL-1.1',
				file: './source-fonts/jetbrains/OFL.txt',
				allowWebEmbedding: true,
				webEmbeddingBasis: 'SIL Open Font License 1.1 permits web redistribution.',
				allowTransformations: true,
			},
			sources: [
				{
					path: './source-fonts/jetbrains/JetBrainsMono[wght].ttf',
					output: 'JetBrainsMono-Variable.woff2',
				},
				{
					path: './source-fonts/jetbrains/JetBrainsMono-Italic[wght].ttf',
					output: 'JetBrainsMono-VariableItalic.woff2',
				},
			],
		},
	},
} satisfies FontsPreparationConfig;
