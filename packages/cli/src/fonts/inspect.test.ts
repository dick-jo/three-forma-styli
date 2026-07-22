import { describe, expect, it } from 'vitest';
import type { Font } from 'fontkit';
import { classifyFontStyle, createFontInspection, detectFontContainerFormat } from './inspect.js';

function createFont(overrides: Partial<Font> = {}): Font {
	return {
		type: 'WOFF2',
		postscriptName: 'Example-Regular',
		fullName: 'Example Regular',
		familyName: 'Example',
		subfamilyName: 'Regular',
		copyright: '',
		version: 1,
		unitsPerEm: 1000,
		ascent: 900,
		descent: -250,
		lineGap: 0,
		underlinePosition: -100,
		underlineThickness: 50,
		italicAngle: 0,
		capHeight: 700,
		xHeight: 500,
		bbox: {} as Font['bbox'],
		'OS/2': {
			usWeightClass: 400,
			usWidthClass: 5,
			typoAscender: 800,
			typoDescender: -200,
			typoLineGap: 100,
			fsSelection: {
				italic: false,
				oblique: false,
				useTypoMetrics: true,
			},
			winAscent: 800,
			winDescent: 200,
			fsType: {
				noEmbedding: false,
				viewOnly: false,
				editable: false,
				noSubsetting: false,
				bitmapOnly: false,
			},
		} as Font['OS/2'],
		hhea: { ascent: 900, descent: -250, lineGap: 0 } as Font['hhea'],
		numGlyphs: 500,
		characterSet: [32, 65, 66],
		availableFeatures: ['liga', 'kern'],
		variationAxes: {},
		stringsForGlyph: () => [],
		glyphForCodePoint: () => ({}) as ReturnType<Font['glyphForCodePoint']>,
		hasGlyphForCodePoint: () => false,
		glyphsForString: () => [],
		widthOfGlyph: () => 0,
		layout: () => ({}) as ReturnType<Font['layout']>,
		getGlyph: () => ({}) as ReturnType<Font['getGlyph']>,
		getAvailableFeatures: () => [],
		createSubset: () => ({}) as ReturnType<Font['createSubset']>,
		getVariation: () => ({}) as Font,
		getFont: () => ({}) as Font,
		getName: () => null,
		setDefaultLanguage: () => undefined,
		...overrides,
	};
}

describe('createFontInspection', () => {
	const source = {
		path: 'fonts/example.woff2',
		format: 'woff2',
		bytes: 1234,
		sha256: 'abc123',
	};

	it('normalizes weight, metrics, coverage, and embedding permissions', () => {
		const inspection = createFontInspection(createFont(), source);

		expect(inspection.style.weight).toBe(400);
		expect(inspection.metrics.naturalLineHeight).toBe(1.15);
		expect(inspection.metrics.typo.naturalLineHeight).toBe(1.1);
		expect(inspection.metrics.hhea).toEqual({ ascent: 900, descent: -250, lineGap: 0 });
		expect(inspection.metrics.win).toEqual({ ascent: 800, descent: 200 });
		expect(inspection.metrics.useTypoMetrics).toBe(true);
		expect(inspection.metrics.capHeightRatio).toBe(0.7);
		expect(inspection.metrics.xHeightRatio).toBe(0.5);
		expect(inspection.coverage).toEqual({ glyphs: 500, codePoints: 3 });
		expect(inspection.features).toEqual(['kern', 'liga']);
		expect(inspection.embedding.noEmbedding).toBe(false);
	});

	it('normalizes variable axes and named instances deterministically', () => {
		const font = createFont({
			variationAxes: {
				wght: { name: 'Weight', min: 100, default: 400, max: 900 },
				wdth: { name: 'Width', min: 75, default: 100, max: 125 },
			},
		}) as Font & { namedVariations: Record<string, Record<string, number>> };
		font.namedVariations = {
			Regular: { wght: 400, wdth: 100 },
			Bold: { wght: 700, wdth: 100 },
		};

		const inspection = createFontInspection(font, source);

		expect(Object.keys(inspection.axes)).toEqual(['wdth', 'wght']);
		expect(Object.keys(inspection.namedInstances)).toEqual(['Bold', 'Regular']);
		expect(inspection.axes.wght).toEqual({
			name: 'Weight',
			min: 100,
			default: 400,
			max: 900,
		});
	});

	it('warns when a variable axis defaults to a range boundary', () => {
		const font = createFont({
			variationAxes: {
				wght: { name: 'Weight', min: 100, default: 800, max: 800 },
			},
		});

		const inspection = createFontInspection(font, source);

		expect(inspection.warnings).toContain(
			'Variable axis "wght" defaults to its maximum boundary (800).'
		);
	});

	it('uses the same evidence-based style classification as preparation', () => {
		const angled = createFontInspection(createFont({ italicAngle: -12 }), source);
		expect(classifyFontStyle(angled)).toBe('oblique');
		expect(angled.warnings).toContain(
			'A non-zero italic angle is classified as oblique despite normal OS/2 flags.'
		);

		const conflicting = createFont();
		conflicting['OS/2'].fsSelection.italic = true;
		conflicting['OS/2'].fsSelection.oblique = true;
		const inspection = createFontInspection(conflicting, source);
		expect(classifyFontStyle(inspection)).toBe('italic');
		expect(inspection.warnings).toContain(
			'OS/2 marks the face as both italic and oblique; italic takes precedence.'
		);
	});
});

describe('font container detection', () => {
	it('uses actual wrapper and sfnt signatures rather than filename assumptions', () => {
		expect(detectFontContainerFormat(createFont({ type: 'WOFF2' }))).toBe('woff2');
		expect(detectFontContainerFormat(createFont({ type: 'WOFF' }))).toBe('woff');
		expect(
			detectFontContainerFormat(
				createFont({ type: 'TTF', directory: { tag: 'OTTO' } } as Partial<Font>)
			)
		).toBe('opentype');
		expect(
			detectFontContainerFormat(
				createFont({ type: 'TTF', directory: { tag: '\u0000\u0001\u0000\u0000' } } as Partial<Font>)
			)
		).toBe('truetype');
	});
});
