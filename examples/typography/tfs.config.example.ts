import { defineTfsProject } from '@three-forma-styli/cli';
import { deriveTypographyRange, type FontSizeSystem } from '@three-forma-styli/core';

/**
 * Complete font + typography + output handoff. Rename to tfs.config.ts after
 * supplying licensed files and reviewing every license attestation.
 */

const TYPE_SCALE: FontSizeSystem = {
	unit: 'rem',
	base: 0.75,
	min: 0.625,
	increment: 0.125,
	range: 12,
};

const proseRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
		base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
		max: { fontSize: 4, weight: 'lo', lineHeight: 1.2, letterSpacing: -0.005 },
	},
	derived: { s: { between: ['min', 'base'], weight: 'lo' }, l: { between: ['base', 'max'] } },
});

const headingRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 1, weight: 'lo', lineHeight: 1.12, letterSpacing: 0 },
		base: { fontSize: 5, weight: 'max', lineHeight: 1, letterSpacing: -0.012 },
		max: { fontSize: 10, weight: 'max', lineHeight: 0.92, letterSpacing: -0.025 },
	},
	derived: { s: { between: ['min', 'base'], weight: 'hi' }, l: { between: ['base', 'max'] } },
});

const labelRange = deriveTypographyRange({
	scale: TYPE_SCALE,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.3, letterSpacing: 0.02 },
		base: { fontSize: 2, weight: 'lo', lineHeight: 1.2, letterSpacing: 0.01 },
		max: { fontSize: 4, weight: 'hi', lineHeight: 1.15, letterSpacing: 0 },
	},
	derived: {
		s: { between: ['min', 'base'], weight: 'lo' },
		l: { between: ['base', 'max'], weight: 'hi' },
	},
});

export default defineTfsProject({
	fonts: {
		supreme: {
			family: 'Supreme',
			category: 'sans',
			sources: [
				'./source-fonts/supreme/Supreme-Variable.woff2',
				'./source-fonts/supreme/Supreme-VariableItalic.woff2',
			],
			license: {
				id: 'ITF-FFL',
				file: './source-fonts/supreme/FFL.txt',
				// Intentionally blocked until written self-hosting permission exists.
				allowWebEmbedding: false,
				webEmbeddingBasis: 'PENDING written Fontshare/ITF self-hosting permission.',
				allowTransformations: false,
			},
		},
		jetbrains: {
			family: 'JetBrains Mono',
			category: 'mono',
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
			license: {
				id: 'OFL-1.1',
				file: './source-fonts/jetbrains/OFL.txt',
				allowWebEmbedding: true,
				webEmbeddingBasis: 'SIL Open Font License 1.1.',
				allowTransformations: true,
			},
		},
	},
	system: {
		typography: {
			modes: [{ name: 'default', isDefault: true, tokens: TYPE_SCALE }],
			roles: {
				prose: {
					font: 'supreme',
					...proseRange,
					weights: { min: 300, lo: 400, hi: 500, max: 700 },
					styles: {
						normal: { weights: ['min', 'lo', 'hi', 'max'] },
						italic: { weights: ['min', 'lo', 'hi', 'max'] },
					},
				},
				heading: {
					font: 'supreme',
					...headingRange,
					weights: { min: 500, lo: 600, hi: 700, max: 800 },
					styles: {
						normal: { weights: ['min', 'lo', 'hi', 'max'] },
						italic: { weights: ['min', 'lo', 'hi', 'max'] },
					},
				},
				label: {
					font: 'jetbrains',
					...labelRange,
					weights: { min: 400, lo: 500, hi: 600, max: 700 },
					styles: {
						normal: { weights: ['min', 'lo', 'hi', 'max'] },
						italic: { weights: ['min', 'lo', 'hi', 'max'] },
					},
				},
			},
		},
	},
	output: {
		directory: './generated',
		fontAssets: {
			directory: 'fonts',
			// Use { mode: 'public', prefix: '/fonts' } for a host-owned public path,
			// or { mode: 'absolute', prefix: 'https://cdn.example/fonts' } for a CDN.
			urls: { mode: 'relative' },
		},
		css: true,
		indexCss: true,
		typographyCss: {
			classPrefix: 'text',
			specificity: 'class',
			// Re-render prepared faces here with URLs relative to this stylesheet.
			fontFaces: 'include',
		},
		typographyModule: true,
		typescript: true,
		specimen: true,
	},
});
