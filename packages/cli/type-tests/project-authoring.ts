import { defineTfsProject } from '../src/api.js';

const fonts = {
	supreme: {
		family: 'Supreme',
		category: 'sans' as const,
		sources: ['./Supreme.woff2'],
		license: {
			id: 'example',
			file: './license.txt',
			allowWebEmbedding: true,
			webEmbeddingBasis: 'Test fixture only.',
		},
	},
};

const mode = {
	name: 'default',
	isDefault: true as const,
	tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 12 },
};

defineTfsProject({
	fonts,
	system: {
		typography: {
			modes: [mode],
			roles: {
				heading: {
					font: 'supreme',
					base: { fontSize: 6, weight: 'strong', lineHeight: 1, letterSpacing: -0.01 },
					weights: { strong: 700, max: 800 },
				},
			},
		},
	},
	output: {
		directory: './dist',
		fontAssets: { directory: 'assets/fonts', urls: { mode: 'public', prefix: '/fonts' } },
		css: {
			selectors: {
				root: ':root',
				colorMode: '[data-theme="{mode}"]',
				sizeMode: '[data-density="{mode}"]',
			},
		},
		typographyCss: { classPrefix: 'text', specificity: 'zero', fontFaces: 'include' },
		systemTypescript: true,
	},
});

defineTfsProject({
	fonts,
	system: {
		// @ts-expect-error project font IDs remain literal and typo-safe
		typography: {
			modes: [mode],
			roles: {
				heading: {
					font: 'suprme',
					base: { fontSize: 6, weight: 'strong', lineHeight: 1, letterSpacing: -0.01 },
					weights: { strong: 700 },
				},
			},
		},
	},
	output: { directory: './dist' },
});

// @ts-expect-error semantic roles without project fonts must bring a self-contained font registry
defineTfsProject({
	system: {
		typography: {
			modes: [mode],
			roles: {
				heading: {
					font: 'supreme',
					base: { fontSize: 6, weight: 'strong', lineHeight: 1, letterSpacing: 0 },
					weights: { strong: 700 },
				},
			},
		},
	},
	output: { directory: './dist' },
});
