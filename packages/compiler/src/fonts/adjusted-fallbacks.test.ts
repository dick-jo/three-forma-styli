import { describe, expect, it, vi } from 'vitest';
import type { TypographySystem } from '@three-forma-styli/core';
import type { Font, Glyph } from 'fontkit';
import type { ProjectFont } from '../project.js';
import { buildAdjustedFallbacks } from './adjusted-fallbacks.js';
import type { PreparedFontFace, PreparedFontsManifest } from './prepare.js';

function createFont(
	options: {
		style?: 'normal' | 'italic';
		weight?: number;
		averageAdvance?: number;
		axes?: Font['variationAxes'];
		getVariation?: Font['getVariation'];
	} = {}
): Font {
	const style = options.style ?? 'normal';
	const averageAdvance = options.averageAdvance ?? 500;
	return {
		type: 'TTF',
		familyName: 'Example',
		fullName: `Example ${style} ${options.weight ?? 400}`,
		postscriptName: 'Example',
		unitsPerEm: 1000,
		ascent: 800,
		descent: -200,
		lineGap: 0,
		italicAngle: style === 'italic' ? -12 : 0,
		variationAxes: options.axes ?? {},
		'OS/2': {
			usWeightClass: options.weight ?? 400,
			fsSelection: { italic: style === 'italic', oblique: false },
		} as Font['OS/2'],
		hasGlyphForCodePoint: () => true,
		glyphsForString: (text) => [...text].map(() => ({ advanceWidth: averageAdvance }) as Glyph),
		getVariation:
			options.getVariation ??
			(() => {
				throw new Error('Unexpected variation request.');
			}),
	} as Font;
}

function preparedFace(overrides: Partial<PreparedFontFace> = {}): PreparedFontFace {
	return {
		file: 'example.woff2',
		url: './example.woff2',
		format: 'woff2',
		style: 'normal',
		weight: { min: 100, max: 800 },
		sha256: 'b'.repeat(64),
		axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
		...overrides,
	} as PreparedFontFace;
}

function manifest(faces: PreparedFontFace[] = [preparedFace()]): PreparedFontsManifest {
	return {
		schemaVersion: 2,
		families: {
			example: {
				family: 'Example',
				display: 'swap',
				faces,
			} as PreparedFontsManifest['families'][string],
		},
	};
}

function projectFont(overrides: Partial<ProjectFont> = {}): ProjectFont {
	return {
		category: 'sans',
		sources: ['./example.woff2'],
		license: {
			id: 'TEST',
			file: './LICENSE',
			allowWebEmbedding: true,
			webEmbeddingBasis: 'test',
		},
		...overrides,
	};
}

function typography(overrides: Partial<TypographySystem['roles'][string]> = {}): TypographySystem {
	return {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 4 },
			},
		],
		fonts: {
			example: {
				family: 'Example',
				fallbacks: ['system-ui', 'sans-serif'],
				verification: 'prepared',
				capabilities: {
					faces: [{ style: 'normal', weights: { min: 100, max: 800 } }],
				},
			},
		},
		roles: {
			text: {
				font: 'example',
				base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
				weights: { lo: 400, hi: 700 },
				...overrides,
			},
		},
	};
}

describe('buildAdjustedFallbacks', () => {
	it('derives exact role weights, private faces, stacks, and measurement provenance', async () => {
		const getVariation = vi.fn((coordinates: Record<string, number>) =>
			createFont({ weight: coordinates.wght, averageAdvance: coordinates.wght })
		);
		const font = createFont({
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
			getVariation,
		});

		const result = await buildAdjustedFallbacks(
			typography(),
			manifest(),
			{ example: projectFont() },
			{ preparedDirectory: '/unused', openFont: () => font }
		);

		expect(result).toBeDefined();
		expect(getVariation).toHaveBeenCalledWith({ wght: 400 });
		expect(getVariation).toHaveBeenCalledWith({ wght: 700 });
		expect(result!.measurementCount).toBe(2);
		expect(result!.typography.fonts!.example.fallbacks).toEqual([
			'__tfs-example-adjusted-fallback',
			'system-ui',
			'sans-serif',
		]);
		expect(result!.css).toContain('src: local("Arial");');
		expect(result!.css).toContain('src: local("Arial Bold");');
		expect(result!.css).toContain('font-weight: 400;');
		expect(result!.css).toContain('font-weight: 700;');
		expect(result!.manifest.roles.text.instances).toHaveLength(2);
		const heavy = result!.manifest.roles.text.instances.find(
			(measurement) => measurement.role.weight === 700
		)!;
		expect(heavy.primary.coordinates).toEqual({ wght: 700 });
		expect(heavy).not.toHaveProperty('status');
		expect(heavy.provenance).not.toHaveProperty('verification');
		expect(result!.manifest).not.toHaveProperty('status');
		expect(result!.manifest.calibration.supportedStyles).toEqual(['normal', 'italic']);
		expect(result!.css).toContain('Measured metric-adjusted fallback faces');
		expect(result!.css).not.toMatch(/candidate|verification required|approved|pending/i);
		expect(JSON.stringify(result!.manifest)).not.toMatch(
			/"(?:status|verification|approved|pending)"/i
		);
	});

	it('uses the identified FontTools boundary for variable WOFF2 sampling and records it', async () => {
		const variable = createFont({
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
			getVariation: ({ wght }: { wght: number }) =>
				createFont({ weight: wght, averageAdvance: wght }),
		});
		const compressed = { ...variable, type: 'WOFF2' } as Font;
		const provenance = {
			executable: 'fonttools',
			fontToolsVersion: '4.60.1',
			python: { implementation: 'CPython', version: '3.14.0' },
		};
		const decompress = vi.fn(async () => undefined);
		const result = await buildAdjustedFallbacks(
			typography(),
			manifest(),
			{ example: projectFont() },
			{
				preparedDirectory: '/prepared',
				openFont: (file) => (file.endsWith('.woff2') ? compressed : variable),
				fontToolsConverter: {
					provenance,
					convert: vi.fn(async () => undefined),
					decompress,
				},
			}
		);

		expect(decompress).toHaveBeenCalledTimes(1);
		expect(decompress).toHaveBeenCalledWith(
			'/prepared/example.woff2',
			expect.stringMatching(/font\.ttf$/)
		);
		expect(result!.manifest).toMatchObject({
			schemaVersion: 3,
			tools: { fontTools: provenance },
		});
	});

	it('deduplicates CSS faces while retaining each role measurement', async () => {
		const font = createFont({
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
			getVariation: ({ wght }: { wght: number }) =>
				createFont({ weight: wght, averageAdvance: wght }),
		});
		const system = typography();
		system.roles!.label = { ...system.roles!.text };
		const result = await buildAdjustedFallbacks(
			system,
			manifest(),
			{ example: projectFont() },
			{ preparedDirectory: '/unused', openFont: () => font }
		);

		expect(result!.measurementCount).toBe(4);
		expect(result!.css.match(/font-weight: 400;/g)).toHaveLength(1);
		expect(result!.css.match(/font-weight: 700;/g)).toHaveLength(1);
		expect(Object.keys(result!.manifest.roles)).toEqual(['label', 'text']);
	});

	it('automatically measures genuine italic regular and bold faces', async () => {
		const italicSystem = typography({
			styles: { italic: { weights: ['lo', 'hi'] } },
			defaultStyle: 'italic',
		});
		italicSystem.fonts!.example.capabilities.faces = [
			{ style: 'italic', weights: { min: 100, max: 800 } },
		];
		const italicVariable = createFont({
			style: 'italic',
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
			getVariation: ({ wght }: { wght: number }) =>
				createFont({ style: 'italic', weight: wght, averageAdvance: wght }),
		});
		const result = await buildAdjustedFallbacks(
			italicSystem,
			manifest([preparedFace({ style: 'italic' })]),
			{ example: projectFont() },
			{ preparedDirectory: '/unused', openFont: () => italicVariable }
		);

		expect(result!.measurementCount).toBe(2);
		expect(result!.css).toContain('src: local("Arial Italic");');
		expect(result!.css).toContain('src: local("Arial Bold Italic");');
		expect(result!.css.match(/font-style: italic;/g)).toHaveLength(2);
		expect(result!.manifest.roles.text.instances.map((instance) => instance.fallback.id)).toEqual([
			'fontpie-arial-bold-italic-v1',
			'fontpie-arial-regular-italic-v1',
		]);

		const monoResult = await buildAdjustedFallbacks(
			italicSystem,
			manifest([preparedFace({ style: 'italic' })]),
			{ example: projectFont({ category: 'mono' }) },
			{ preparedDirectory: '/unused', openFont: () => italicVariable }
		);
		expect(monoResult!.css).toContain('src: local("Courier New Italic");');
		expect(monoResult!.css).toContain('src: local("Courier New Bold Italic");');
	});

	it('fails rather than adapting unsupported styles, weights, or dynamic axes', async () => {
		const obliqueSystem = typography({
			styles: { oblique: { weights: ['lo'] } },
			defaultStyle: 'oblique',
		});
		obliqueSystem.fonts!.example.capabilities.faces = [
			{ style: 'oblique', obliqueAngle: 12, weights: [400] },
		];
		await expect(
			buildAdjustedFallbacks(
				obliqueSystem,
				manifest([preparedFace({ style: 'oblique', obliqueAngle: 12, weight: 400, axes: {} })]),
				{ example: projectFont() },
				{
					preparedDirectory: '/unused',
					openFont: () => createFont({ weight: 400 }),
				}
			)
		).rejects.toThrow('oblique roles require an explicit fallback stack');

		await expect(
			buildAdjustedFallbacks(
				typography(),
				manifest([preparedFace({ weight: 400, axes: {} })]),
				{ example: projectFont() },
				{ preparedDirectory: '/unused', openFont: () => createFont() }
			)
		).rejects.toThrow('requires exactly one normal weight 700 face');

		await expect(
			buildAdjustedFallbacks(
				typography({ variations: { wdth: 90 } }),
				manifest(),
				{ example: projectFont() },
				{ preparedDirectory: '/unused', openFont: () => createFont() }
			)
		).rejects.toThrow('custom variation coordinates');

		await expect(
			buildAdjustedFallbacks(
				typography(),
				manifest([
					preparedFace({
						axes: {
							wght: { name: 'Weight', min: 100, default: 400, max: 800 },
							opsz: { name: 'Optical Size', min: 8, default: 14, max: 72 },
						},
					}),
				]),
				{ example: projectFont() },
				{ preparedDirectory: '/unused', openFont: () => createFont() }
			)
		).rejects.toThrow('with an opsz axis');
	});

	it('treats explicit stacks and unsupported categories as opt-outs', async () => {
		expect(
			await buildAdjustedFallbacks(
				typography(),
				manifest(),
				{ example: projectFont({ fallbacks: ['Helvetica', 'sans-serif'] }) },
				{ preparedDirectory: '/unused', openFont: () => createFont() }
			)
		).toBeUndefined();
		expect(
			await buildAdjustedFallbacks(
				typography(),
				manifest(),
				{ example: projectFont({ category: 'serif' }) },
				{ preparedDirectory: '/unused', openFont: () => createFont() }
			)
		).toBeUndefined();
	});
});
