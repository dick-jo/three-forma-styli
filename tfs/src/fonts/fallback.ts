import type { Font } from 'fontkit';

/**
 * Metric-adjusted fallback faces: a local system font (Arial, Courier New) scaled and
 * offset to match the real font, so text does not jump when the real font loads.
 * Same formula and reference constants as 0.4.0, which took them from Fontpie
 * (https://github.com/pixel-point/fontpie, packages/calc/util.js).
 */

type Profile = { readonly local: string; readonly averageAdvance: number };

const UNITS_PER_EM = 2048;

const PROFILES: Record<
	'sans' | 'mono',
	Record<'normal' | 'italic', Record<'regular' | 'bold', Profile>>
> = {
	sans: {
		normal: {
			regular: { local: 'Arial', averageAdvance: 934.5116279069767 },
			bold: { local: 'Arial Bold', averageAdvance: 1011.046511627907 },
		},
		italic: {
			regular: { local: 'Arial Italic', averageAdvance: 934.5116279069767 },
			bold: { local: 'Arial Bold Italic', averageAdvance: 1011.046511627907 },
		},
	},
	mono: {
		normal: {
			regular: { local: 'Courier New', averageAdvance: 1229 },
			bold: { local: 'Courier New Bold', averageAdvance: 1229 },
		},
		italic: {
			regular: { local: 'Courier New Italic', averageAdvance: 1229 },
			bold: { local: 'Courier New Bold Italic', averageAdvance: 1229 },
		},
	},
};

/** Frequency-weighted lowercase Latin sample with spaces (Fontpie / Next.js). */
const SAMPLE = 'aaabcdeeeefghiijklmnnoopqrrssttuvwxyz      ';

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

/** The face at one weight: variable fonts are instanced at that weight. */
function instance(font: Font, weight: number): Font {
	if (!font.variationAxes.wght) return font;
	// fontkit copies decoded tables into the instance; read them first so they are populated.
	void [font.unitsPerEm, font.ascent, font.descent, font.lineGap, font.familyName];
	font.glyphsForString(SAMPLE);
	return font.getVariation({ wght: weight });
}

/** Measure one fallback face for a font at a style and weight. */
export function measureFallback(
	font: Font,
	category: 'sans' | 'mono',
	style: 'normal' | 'italic',
	weight: number
): FallbackFace {
	const face = instance(font, weight);
	const missing = [...new Set(SAMPLE)].filter(
		(char) => !face.hasGlyphForCodePoint(char.codePointAt(0)!)
	);
	if (missing.length > 0)
		throw new Error(`${face.fullName} lacks glyphs for the fallback sample: ${missing.join('')}`);
	const glyphs = face.glyphsForString(SAMPLE);
	const average = glyphs.reduce((total, glyph) => total + glyph.advanceWidth, 0) / glyphs.length;

	const profile = PROFILES[category][style][weight > 500 ? 'bold' : 'regular'];
	const sizeAdjust = average / face.unitsPerEm / (profile.averageAdvance / UNITS_PER_EM);
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
