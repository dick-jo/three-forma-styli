import type { Font } from 'fontkit';

/**
 * Metric-adjusted fallback faces: a local system font (Arial, Courier New) scaled and
 * offset to match the real font, so text does not jump when the real font loads.
 * Same formula as 0.4.0, which took it from Fontpie
 * (https://github.com/pixel-point/fontpie, packages/calc/util.js), with one change:
 * the sample is measured as laid out, kerning included, because browsers kern and
 * kerning narrows some fonts' text by 2–3% (Geist). Each face is measured against
 * the text its role renders: lowercase or capitals, at the role's weight and, for
 * fonts with an optical size axis, at the role's base size.
 */

type Case = 'lowercase' | 'uppercase';
type Profile = { readonly local: string; readonly averageAdvance: Readonly<Record<Case, number>> };

const UNITS_PER_EM = 2048;

// Average advance of SAMPLE laid out in each local font, in its 2048 units per em.
// Lowercase: Fontpie's constants. Uppercase: SAMPLE.toUpperCase() laid out with fontkit
// in macOS /System/Library/Fonts/Supplemental/Arial*.ttf (version 5.01), 2026-10-28.
// Arial kerns no pair in either sample, its italics share their upright advances,
// and Courier New is monospaced.
const ARIAL = { lowercase: 934.5116279069767, uppercase: 1257.0232558139535 };
const ARIAL_BOLD = { lowercase: 1011.046511627907, uppercase: 1275.4418604651162 };
const COURIER_NEW = { lowercase: 1229, uppercase: 1229 };

const PROFILES: Record<
	'sans' | 'mono',
	Record<'normal' | 'italic', Record<'regular' | 'bold', Profile>>
> = {
	sans: {
		normal: {
			regular: { local: 'Arial', averageAdvance: ARIAL },
			bold: { local: 'Arial Bold', averageAdvance: ARIAL_BOLD },
		},
		italic: {
			regular: { local: 'Arial Italic', averageAdvance: ARIAL },
			bold: { local: 'Arial Bold Italic', averageAdvance: ARIAL_BOLD },
		},
	},
	mono: {
		normal: {
			regular: { local: 'Courier New', averageAdvance: COURIER_NEW },
			bold: { local: 'Courier New Bold', averageAdvance: COURIER_NEW },
		},
		italic: {
			regular: { local: 'Courier New Italic', averageAdvance: COURIER_NEW },
			bold: { local: 'Courier New Bold Italic', averageAdvance: COURIER_NEW },
		},
	},
};

/** Frequency-weighted lowercase Latin sample with spaces (Fontpie / Next.js). */
const SAMPLE = 'aaabcdeeeefghiijklmnnoopqrrssttuvwxyz      ';
const SAMPLES: Record<Case, string> = { lowercase: SAMPLE, uppercase: SAMPLE.toUpperCase() };

/** What a fallback face is measured against, besides style and weight. */
export type Calibration = {
	readonly case: Case;
	/** Optical size to instance at; only for fonts with an `opsz` axis. */
	readonly opsz?: number;
};

export type FallbackFace = {
	readonly local: string;
	readonly style: 'normal' | 'italic';
	readonly weight: number;
	readonly sizeAdjust: string;
	readonly ascentOverride: string;
	readonly descentOverride: string;
	readonly lineGapOverride: string;
};

function percent(ratio: number): string {
	return `${Number((ratio * 100).toFixed(2))}%`;
}

/** The face at one weight and optical size: variable fonts are instanced there. */
function instance(font: Font, weight: number, opsz: number | undefined): Font {
	const coordinates = {
		...(font.variationAxes.wght ? { wght: weight } : {}),
		...(font.variationAxes.opsz && opsz !== undefined ? { opsz } : {}),
	};
	if (Object.keys(coordinates).length === 0) return font;
	// fontkit copies decoded tables into the instance; read them first so they are populated.
	void [font.unitsPerEm, font.ascent, font.descent, font.lineGap, font.familyName];
	font.glyphsForString(SAMPLES.lowercase + SAMPLES.uppercase);
	return font.getVariation(coordinates);
}

/** Measure one fallback face for a font at a style, weight and calibration. */
export function measureFallback(
	font: Font,
	category: 'sans' | 'mono',
	style: 'normal' | 'italic',
	weight: number,
	calibration: Calibration
): FallbackFace {
	const face = instance(font, weight, calibration.opsz);
	const sample = SAMPLES[calibration.case];
	const missing = [...new Set(sample)].filter(
		(char) => !face.hasGlyphForCodePoint(char.codePointAt(0)!)
	);
	if (missing.length > 0)
		throw new Error(`${face.fullName} lacks glyphs for the fallback sample: ${missing.join('')}`);
	const { positions } = face.layout(sample);
	const average =
		positions.reduce((total, position) => total + position.xAdvance, 0) / sample.length;

	const profile = PROFILES[category][style][weight > 500 ? 'bold' : 'regular'];
	const reference = profile.averageAdvance[calibration.case];
	const sizeAdjust = average / face.unitsPerEm / (reference / UNITS_PER_EM);
	const scaled = face.unitsPerEm * sizeAdjust;
	return {
		local: profile.local,
		style,
		weight,
		sizeAdjust: percent(sizeAdjust),
		ascentOverride: percent(face.ascent / scaled),
		descentOverride: percent(Math.abs(face.descent) / scaled),
		lineGapOverride: percent(face.lineGap / scaled),
	};
}
