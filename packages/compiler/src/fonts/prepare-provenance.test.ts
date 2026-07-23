import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareFonts, type FontPreparationStrategy } from './prepare.js';

const fontTools = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('./fonttools.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('./fonttools.js')>()),
	createFontToolsConverter: fontTools.create,
}));

vi.mock('./inspect.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./inspect.js')>();
	return {
		...actual,
		inspectFontFiles(files: string[], relativeTo: string) {
			return files.map((file) => {
				const bytes = fs.readFileSync(file);
				return {
					source: {
						path: path.relative(relativeTo, file),
						format: path.extname(file).slice(1).toLowerCase(),
						bytes: bytes.length,
						sha256: createHash('sha256').update(bytes).digest('hex'),
					},
					names: {
						family: 'Fixture Sans',
						subfamily: 'Regular',
						full: 'Fixture Sans Regular',
						postscript: 'FixtureSans-Regular',
					},
					metadata: { version: 'Version 1.000', copyright: 'Fixture only' },
					style: {
						weight: 400,
						width: 5,
						italic: false,
						oblique: false,
						italicAngle: 0,
					},
					axes: {},
					namedInstances: {},
					metrics: {
						unitsPerEm: 1000,
						hhea: { ascent: 800, descent: -200, lineGap: 0 },
						win: { ascent: 800, descent: 200 },
						useTypoMetrics: true,
						ascent: 800,
						descent: -200,
						lineGap: 0,
						capHeight: 700,
						xHeight: 500,
						naturalLineHeight: 1,
						capHeightRatio: 0.7,
						xHeightRatio: 0.5,
						typo: { ascent: 800, descent: -200, lineGap: 0, naturalLineHeight: 1 },
					},
					coverage: { glyphs: 128, codePoints: 96 },
					features: ['kern'],
					embedding: {
						noEmbedding: false,
						viewOnly: false,
						editable: true,
						noSubsetting: false,
						bitmapOnly: false,
					},
					warnings: [],
				};
			});
		},
	};
});

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => fs.remove(root)));
	fontTools.create.mockReset();
});

const provenance = {
	executable: 'fonttools',
	fontToolsVersion: '4.60.1',
	python: { implementation: 'CPython', version: '3.14.0' },
} as const;

async function runPreparation(strategy: FontPreparationStrategy) {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-font-provenance-'));
	roots.push(root);
	const extension = strategy === 'woff2' ? '.ttf' : '.woff2';
	await fs.writeFile(path.join(root, `fixture${extension}`), 'deterministic-font-fixture');
	await fs.writeFile(path.join(root, 'LICENSE.txt'), 'Fixture permission');
	return prepareFonts(
		{
			output: { directory: './generated/fonts' },
			fonts: {
				fixture: {
					sources: [`./fixture${extension}`],
					strategy,
					license: {
						id: 'fixture',
						file: './LICENSE.txt',
						allowWebEmbedding: true,
						webEmbeddingBasis: 'Test fixture permission.',
						allowTransformations: strategy === 'woff2',
					},
				},
			},
		},
		root
	);
}

describe('font conversion provenance', () => {
	it('keeps copy-only preparation independent of FontTools and makes no conversion claim', async () => {
		const previousPath = process.env.PATH;
		process.env.PATH = '';
		try {
			const result = await runPreparation('copy');
			expect(fontTools.create).not.toHaveBeenCalled();
			expect(result.manifest).not.toHaveProperty('conversion');
			expect(JSON.parse(await fs.readFile(result.manifestPath, 'utf8'))).not.toHaveProperty(
				'conversion'
			);
		} finally {
			process.env.PATH = previousPath;
		}
	});

	it('records an exact, portable toolchain only after WOFF2 byte conversion', async () => {
		const convert = vi.fn((source: string, destination: string) => fs.copy(source, destination));
		fontTools.create.mockResolvedValue({ provenance, convert });
		const first = await runPreparation('woff2');
		const second = await runPreparation('woff2');

		expect(convert).toHaveBeenCalledTimes(2);
		expect(fontTools.create).toHaveBeenCalledTimes(2);
		expect(first.manifest.conversion).toEqual({ woff2: provenance });
		expect(first.manifest).toEqual(second.manifest);
		const serialized = JSON.stringify(first.manifest);
		expect(serialized).not.toContain(first.outputDirectory);
		expect(serialized).not.toContain(second.outputDirectory);
		expect(JSON.parse(await fs.readFile(first.manifestPath, 'utf8'))).toEqual(first.manifest);
	});
});
