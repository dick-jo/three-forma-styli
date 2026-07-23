import { defineTfsProject } from '../src/api.js';
import type {
	LegacyTfsProjectOutput,
	ProjectFont,
	ProjectSystem,
	TfsProjectOutput,
} from '../src/api.js';

const fonts = {
	editorial: {
		family: 'Editorial Sans',
		category: 'sans' as const,
		sources: ['./EditorialSans.woff2'],
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

const splitFonts = {
	prose: {
		family: 'Work Sans',
		sources: ['./WorkSans.woff2'],
		license: {
			id: 'example',
			file: './license.txt',
			allowWebEmbedding: true,
			webEmbeddingBasis: 'Test fixture only.',
		},
	},
} as const satisfies Record<string, ProjectFont>;

const splitSystem = {
	typography: {
		modes: [mode],
		roles: {
			prose: {
				font: 'prose',
				base: { fontSize: 2, weight: 'base', lineHeight: 1.4, letterSpacing: 0 },
				weights: { base: 400 },
			},
		},
	},
} satisfies ProjectSystem<typeof splitFonts>;

defineTfsProject({
	fonts: splitFonts,
	system: splitSystem,
	output: { directory: './generated' },
});

defineTfsProject({
	fonts,
	generator: {
		prefixes: { color: 'palette', typographyRole: 'copy' },
		colorFormat: { alphaModifier: 'opacity' },
	},
	system: {
		typography: {
			modes: [mode],
			roles: {
				heading: {
					font: 'editorial',
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

const legacyOutput: LegacyTfsProjectOutput = {
	directory: './dist',
	css: true,
};
const publicOutput: TfsProjectOutput = legacyOutput;
void publicOutput;

defineTfsProject({
	fonts,
	system: {
		typography: {
			modes: [mode],
			roles: {
				heading: {
					font: 'editorial',
					base: { fontSize: 6, weight: 'max', lineHeight: 1, letterSpacing: -0.01 },
					weights: { max: 800 },
				},
			},
		},
	},
	output: {
		layout: 'workspace-package',
		directory: './generated',
		hostPackage: { rootExport: true, verifyPublishedFiles: 'if-publishable' },
		assets: { fonts: { directory: 'assets/fonts' } },
		targets: {
			runtime: {
				css: {
					entry: true,
					tokens: { selectors: { root: ':host' } },
					typography: { classPrefix: 'text', specificity: 'class' },
					module: true,
					fontUrls: { mode: 'public', prefix: '/fonts' },
				},
				contracts: { system: true, typography: true, nativeColorModes: false },
			},
			review: { specimen: { title: 'Review', fonts: 'prepared' } },
			design: { dtcg: { colorSpace: 'display-p3' } },
		},
	},
});

defineTfsProject({
	system: {},
	// @ts-expect-error workspace-package cannot mix legacy flat output keys
	output: {
		layout: 'workspace-package',
		directory: './generated',
		targets: {},
		css: true,
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
					font: 'editoriall',
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
					font: 'editorial',
					base: { fontSize: 6, weight: 'strong', lineHeight: 1, letterSpacing: 0 },
					weights: { strong: 700 },
				},
			},
		},
	},
	output: { directory: './dist' },
});
