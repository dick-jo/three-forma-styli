import { describe, expect, it, vi } from 'vitest';
import type { Font, Glyph } from 'fontkit';
import {
	BUILT_IN_FALLBACK_PROFILES,
	LATIN_UI_CALIBRATION_CORPUS,
	calculateAdjustedFallback,
	type AdjustedFallbackInput,
} from './fallback-metrics.js';

const source = {
	file: 'fonts/example.woff2',
	sha256: 'a'.repeat(64),
};

function glyph(width: number): Glyph {
	return { advanceWidth: width } as Glyph;
}

function createFont(
	overrides: {
		name?: string;
		weight?: number;
		style?: 'normal' | 'italic' | 'oblique';
		unitsPerEm?: number;
		ascent?: number;
		descent?: number;
		lineGap?: number;
		averageAdvance?: number;
		axes?: Font['variationAxes'];
		getVariation?: Font['getVariation'];
		hasGlyphForCodePoint?: Font['hasGlyphForCodePoint'];
		glyphsForString?: Font['glyphsForString'];
	} = {}
): Font {
	const style = overrides.style ?? 'normal';
	const name = overrides.name ?? 'Example Regular';
	const averageAdvance = overrides.averageAdvance ?? 500;
	return {
		type: 'WOFF2',
		familyName: 'Example',
		fullName: name,
		postscriptName: name.replaceAll(' ', '-'),
		unitsPerEm: overrides.unitsPerEm ?? 1000,
		ascent: overrides.ascent ?? 800,
		descent: overrides.descent ?? -200,
		lineGap: overrides.lineGap ?? 100,
		italicAngle: style === 'oblique' ? -12 : 0,
		variationAxes: overrides.axes ?? {},
		'OS/2': {
			usWeightClass: overrides.weight ?? 400,
			fsSelection: {
				italic: style === 'italic',
				oblique: style === 'oblique',
			},
		} as Font['OS/2'],
		hasGlyphForCodePoint: overrides.hasGlyphForCodePoint ?? (() => true),
		glyphsForString:
			overrides.glyphsForString ?? ((text) => [...text].map(() => glyph(averageAdvance))),
		getVariation:
			overrides.getVariation ??
			(() => {
				throw new Error('Unexpected variation request.');
			}),
	} as Font;
}

function input(font: Font, overrides: Partial<AdjustedFallbackInput> = {}): AdjustedFallbackInput {
	return {
		role: 'label',
		style: 'normal',
		weight: 400,
		profile: 'fontpie-courier-new-regular-v1',
		primary: { font, source },
		...overrides,
	};
}

describe('calculateAdjustedFallback', () => {
	it('reproduces the Fontpie JetBrains Mono measurement from raw metrics', () => {
		const font = createFont({
			name: 'JetBrains Mono Regular',
			unitsPerEm: 1000,
			averageAdvance: 600,
			ascent: 1020,
			descent: -300,
			lineGap: 0,
		});

		const measurement = calculateAdjustedFallback(input(font));

		expect(measurement.schemaVersion).toBe(2);
		expect(measurement).not.toHaveProperty('status');
		expect(measurement.calibration.css).toEqual({
			sizeAdjust: '99.98%',
			ascentOverride: '102.02%',
			descentOverride: '30.00%',
			lineGapOverride: '0.00%',
		});
		expect(measurement.calibration.raw.primaryAverageAdvance).toBe(600);
		expect(measurement.calibration.raw.fallbackAverageAdvance).toBe(1229);
		expect(measurement.calibration.corpus.id).toBe('tfs-latin-ui-v1');
		expect(measurement.calibration.corpus.sha256).toMatch(/^[a-f\d]{64}$/);
		expect(measurement.fallback.provenance.source).toBe('fontpie-calc@0.2.0');
		expect(measurement.provenance).not.toHaveProperty('verification');
	});

	it('instantiates the requested variable weight before sampling glyphs and metrics', () => {
		const instance = createFont({
			name: 'Example Variable 700',
			weight: 700,
			averageAdvance: 700,
			ascent: 900,
			descent: -250,
			lineGap: 0,
		});
		const getVariation = vi.fn(() => instance);
		const variable = createFont({
			name: 'Example Variable',
			axes: {
				wdth: { name: 'Width', min: 75, default: 100, max: 125 },
				wght: { name: 'Weight', min: 100, default: 400, max: 900 },
			},
			getVariation,
		});

		const measurement = calculateAdjustedFallback(
			input(variable, {
				role: 'heading',
				weight: 700,
				profile: 'fontpie-arial-bold-v1',
				primary: { font: variable, source, coordinates: { wdth: 110 } },
			})
		);

		expect(getVariation).toHaveBeenCalledOnce();
		expect(getVariation).toHaveBeenCalledWith({ wdth: 110, wght: 700 });
		expect(measurement.primary.coordinates).toEqual({ wdth: 110, wght: 700 });
		expect(measurement.primary.variable).toBe(true);
		expect(measurement.primary.metrics).toEqual({ ascent: 900, descent: -250, lineGap: 0 });
		expect(measurement.calibration.raw.primaryAverageAdvance).toBe(700);
		expect(measurement.fallback.id).toBe('fontpie-arial-bold-v1');
	});

	it('measures physical italic faces against matching regular and bold italic profiles', () => {
		const regular = calculateAdjustedFallback(
			input(createFont({ style: 'italic', name: 'Example Italic', weight: 400 }), {
				style: 'italic',
				profile: 'fontpie-arial-regular-italic-v1',
			})
		);
		const bold = calculateAdjustedFallback(
			input(createFont({ style: 'italic', name: 'Example Bold Italic', weight: 700 }), {
				style: 'italic',
				weight: 700,
				profile: 'fontpie-courier-new-bold-italic-v1',
			})
		);

		expect(regular.role.style).toBe('italic');
		expect(regular.fallback).toMatchObject({
			family: 'Arial Italic',
			style: 'italic',
			weightClass: 'regular',
			averageAdvance: 934.5116279069767,
		});
		expect(bold.fallback).toMatchObject({
			family: 'Courier New Bold Italic',
			style: 'italic',
			weightClass: 'bold',
			averageAdvance: 1229,
		});
	});

	it('keeps all built-in profile constants explicit and versioned', () => {
		expect(BUILT_IN_FALLBACK_PROFILES).toMatchObject({
			'fontpie-arial-regular-v1': {
				family: 'Arial',
				averageAdvance: 934.5116279069767,
				unitsPerEm: 2048,
				version: 1,
			},
			'fontpie-arial-bold-v1': {
				family: 'Arial Bold',
				averageAdvance: 1011.046511627907,
			},
			'fontpie-arial-regular-italic-v1': {
				family: 'Arial Italic',
				style: 'italic',
				averageAdvance: 934.5116279069767,
			},
			'fontpie-arial-bold-italic-v1': {
				family: 'Arial Bold Italic',
				style: 'italic',
				averageAdvance: 1011.046511627907,
			},
			'fontpie-courier-new-regular-v1': {
				family: 'Courier New',
				averageAdvance: 1229,
			},
			'fontpie-courier-new-bold-v1': {
				family: 'Courier New Bold',
				averageAdvance: 1229,
			},
			'fontpie-courier-new-regular-italic-v1': {
				family: 'Courier New Italic',
				style: 'italic',
				averageAdvance: 1229,
			},
			'fontpie-courier-new-bold-italic-v1': {
				family: 'Courier New Bold Italic',
				style: 'italic',
				averageAdvance: 1229,
			},
		});
		expect(LATIN_UI_CALIBRATION_CORPUS.text.endsWith('      ')).toBe(true);
	});

	it('rejects unsupported profiles and style/face mismatches clearly', () => {
		const normal = createFont();
		expect(() => calculateAdjustedFallback(input(normal, { profile: 'unknown-profile' }))).toThrow(
			'Unsupported fallback profile "unknown-profile"'
		);
		expect(() =>
			calculateAdjustedFallback(input(normal, { role: 'text', style: 'italic' }))
		).toThrow('primary face "Example Regular" is normal');

		const italic = createFont({ style: 'italic', name: 'Example Italic' });
		expect(() =>
			calculateAdjustedFallback(
				input(italic, {
					role: 'text',
					style: 'italic',
					profile: 'fontpie-arial-regular-v1',
				})
			)
		).toThrow('is normal and cannot calibrate role "text" style italic');
	});

	it('rejects unavailable static and variable weights rather than substituting', () => {
		expect(() =>
			calculateAdjustedFallback(input(createFont(), { role: 'heading', weight: 700 }))
		).toThrow('static face "Example Regular" is weight 400');

		const variable = createFont({
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 800 } },
			getVariation: vi.fn(),
		});
		expect(() =>
			calculateAdjustedFallback(input(variable, { role: 'heading', weight: 900 }))
		).toThrow('axis wght=900 is outside 100-800');
	});

	it('rejects unsupported style axes, unknown axes, and missing corpus glyphs', () => {
		const italicAxis = createFont({
			axes: { ital: { name: 'Italic', min: 0, default: 0, max: 1 } },
		});
		expect(() => calculateAdjustedFallback(input(italicAxis))).toThrow('variable ital/slnt axis');

		const weighted = createFont({
			axes: { wght: { name: 'Weight', min: 100, default: 400, max: 900 } },
		});
		expect(() =>
			calculateAdjustedFallback(
				input(weighted, {
					primary: { font: weighted, source, coordinates: { opsz: 14 } },
				})
			)
		).toThrow('unknown variation axis "opsz"');

		const incomplete = createFont({
			hasGlyphForCodePoint: (codePoint) => codePoint !== 122,
		});
		expect(() => calculateAdjustedFallback(input(incomplete))).toThrow('U+007A');
	});

	it('retains raw precision independently of two-decimal CSS values', () => {
		const measurement = calculateAdjustedFallback(
			input(createFont({ averageAdvance: 503, ascent: 811, descent: -211, lineGap: 17 }), {
				profile: 'fontpie-arial-regular-v1',
			})
		);
		expect(measurement.calibration.raw.sizeAdjust).not.toBe(
			measurement.calibration.rounded.sizeAdjustPercent / 100
		);
		expect(measurement.calibration.css.sizeAdjust).toMatch(/^\d+\.\d{2}%$/);
	});
});
