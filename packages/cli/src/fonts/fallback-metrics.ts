import { createHash } from 'node:crypto';
import type { Font, Glyph } from 'fontkit';

export type FallbackFontStyle = 'normal' | 'italic' | 'oblique';

export type BuiltInFallbackProfileId =
	| 'fontpie-arial-regular-v1'
	| 'fontpie-arial-bold-v1'
	| 'fontpie-arial-regular-italic-v1'
	| 'fontpie-arial-bold-italic-v1'
	| 'fontpie-courier-new-regular-v1'
	| 'fontpie-courier-new-bold-v1'
	| 'fontpie-courier-new-regular-italic-v1'
	| 'fontpie-courier-new-bold-italic-v1';

export interface BuiltInFallbackProfile {
	id: BuiltInFallbackProfileId;
	version: 1;
	family:
		| 'Arial'
		| 'Arial Bold'
		| 'Arial Italic'
		| 'Arial Bold Italic'
		| 'Courier New'
		| 'Courier New Bold'
		| 'Courier New Italic'
		| 'Courier New Bold Italic';
	category: 'sans' | 'mono';
	style: 'normal' | 'italic';
	weightClass: 'regular' | 'bold';
	unitsPerEm: 2048;
	averageAdvance: number;
	provenance: {
		source: 'fontpie-calc@0.2.0';
		url: 'https://github.com/pixel-point/fontpie/blob/master/packages/calc/util.js';
		note: string;
	};
}

const profileProvenance = {
	source: 'fontpie-calc@0.2.0',
	url: 'https://github.com/pixel-point/fontpie/blob/master/packages/calc/util.js',
	note: 'Published Fontpie compatibility constant; the originating local font file and version were not recorded.',
} as const;

/**
 * Versioned compatibility targets copied from Fontpie, not measurements of the
 * font installed on the machine running TFS.
 */
export const BUILT_IN_FALLBACK_PROFILES: Readonly<
	Record<BuiltInFallbackProfileId, BuiltInFallbackProfile>
> = {
	'fontpie-arial-regular-v1': {
		id: 'fontpie-arial-regular-v1',
		version: 1,
		family: 'Arial',
		category: 'sans',
		style: 'normal',
		weightClass: 'regular',
		unitsPerEm: 2048,
		averageAdvance: 934.5116279069767,
		provenance: profileProvenance,
	},
	'fontpie-arial-bold-v1': {
		id: 'fontpie-arial-bold-v1',
		version: 1,
		family: 'Arial Bold',
		category: 'sans',
		style: 'normal',
		weightClass: 'bold',
		unitsPerEm: 2048,
		averageAdvance: 1011.046511627907,
		provenance: profileProvenance,
	},
	'fontpie-arial-regular-italic-v1': {
		id: 'fontpie-arial-regular-italic-v1',
		version: 1,
		family: 'Arial Italic',
		category: 'sans',
		style: 'italic',
		weightClass: 'regular',
		unitsPerEm: 2048,
		averageAdvance: 934.5116279069767,
		provenance: profileProvenance,
	},
	'fontpie-arial-bold-italic-v1': {
		id: 'fontpie-arial-bold-italic-v1',
		version: 1,
		family: 'Arial Bold Italic',
		category: 'sans',
		style: 'italic',
		weightClass: 'bold',
		unitsPerEm: 2048,
		averageAdvance: 1011.046511627907,
		provenance: profileProvenance,
	},
	'fontpie-courier-new-regular-v1': {
		id: 'fontpie-courier-new-regular-v1',
		version: 1,
		family: 'Courier New',
		category: 'mono',
		style: 'normal',
		weightClass: 'regular',
		unitsPerEm: 2048,
		averageAdvance: 1229,
		provenance: profileProvenance,
	},
	'fontpie-courier-new-bold-v1': {
		id: 'fontpie-courier-new-bold-v1',
		version: 1,
		family: 'Courier New Bold',
		category: 'mono',
		style: 'normal',
		weightClass: 'bold',
		unitsPerEm: 2048,
		averageAdvance: 1229,
		provenance: profileProvenance,
	},
	'fontpie-courier-new-regular-italic-v1': {
		id: 'fontpie-courier-new-regular-italic-v1',
		version: 1,
		family: 'Courier New Italic',
		category: 'mono',
		style: 'italic',
		weightClass: 'regular',
		unitsPerEm: 2048,
		averageAdvance: 1229,
		provenance: profileProvenance,
	},
	'fontpie-courier-new-bold-italic-v1': {
		id: 'fontpie-courier-new-bold-italic-v1',
		version: 1,
		family: 'Courier New Bold Italic',
		category: 'mono',
		style: 'italic',
		weightClass: 'bold',
		unitsPerEm: 2048,
		averageAdvance: 1229,
		provenance: profileProvenance,
	},
};

const calibrationText = 'aaabcdeeeefghiijklmnnoopqrrssttuvwxyz      ';

export const LATIN_UI_CALIBRATION_CORPUS = {
	id: 'tfs-latin-ui-v1',
	version: 1,
	text: calibrationText,
	sha256: createHash('sha256').update(calibrationText).digest('hex'),
	description:
		'Fontpie/Next.js frequency-weighted lowercase Latin sample with six spaces; not representative of every language or UI string.',
} as const;

export interface AdjustedFallbackInput {
	role: string;
	style: FallbackFontStyle;
	weight: number;
	profile: BuiltInFallbackProfileId | (string & {});
	primary: {
		font: Font;
		source: {
			file: string;
			sha256: string;
		};
		/** Optional non-weight variation coordinates. Unspecified axes use their font defaults. */
		coordinates?: Record<string, number>;
	};
}

export interface AdjustedFallbackMeasurement {
	schemaVersion: 2;
	role: {
		id: string;
		style: FallbackFontStyle;
		weight: number;
	};
	primary: {
		source: AdjustedFallbackInput['primary']['source'];
		names: {
			family: string;
			full: string;
			postscript: string;
		};
		variable: boolean;
		coordinates: Record<string, number>;
		unitsPerEm: number;
		metrics: {
			ascent: number;
			descent: number;
			lineGap: number;
		};
	};
	fallback: BuiltInFallbackProfile;
	calibration: {
		corpus: typeof LATIN_UI_CALIBRATION_CORPUS;
		formula: {
			id: 'tfs-adjusted-fallback-v1';
			version: 1;
		};
		raw: {
			primaryAverageAdvance: number;
			primaryAverageAdvancePerEm: number;
			fallbackAverageAdvance: number;
			fallbackAverageAdvancePerEm: number;
			sizeAdjust: number;
			ascentOverride: number;
			descentOverride: number;
			lineGapOverride: number;
		};
		rounded: {
			sizeAdjustPercent: number;
			ascentOverridePercent: number;
			descentOverridePercent: number;
			lineGapOverridePercent: number;
		};
		css: {
			sizeAdjust: string;
			ascentOverride: string;
			descentOverride: string;
			lineGapOverride: string;
		};
	};
	provenance: {
		generator: '@three-forma-styli/cli';
		calculation: 'tfs-adjusted-fallback-v1';
		primarySampler: 'fontkit.getVariation+glyphsForString';
	};
	warnings: string[];
}

type VariableAxis = NonNullable<Font['variationAxes'][string]>;

function faceStyle(font: Font): FallbackFontStyle {
	if (font['OS/2'].fsSelection.italic) return 'italic';
	if (font['OS/2'].fsSelection.oblique || font.italicAngle !== 0) return 'oblique';
	return 'normal';
}

function finitePositive(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number.`);
}

function validateInput(input: AdjustedFallbackInput, profile: BuiltInFallbackProfile): void {
	if (!input.role.trim()) throw new Error('Fallback calibration requires a non-empty role id.');
	if (!Number.isInteger(input.weight) || input.weight < 1 || input.weight > 1000) {
		throw new Error(
			`Role "${input.role}" has invalid font weight ${input.weight}; expected 1-1000.`
		);
	}
	if (!['normal', 'italic', 'oblique'].includes(input.style)) {
		throw new Error(`Role "${input.role}" uses unsupported style "${input.style}".`);
	}
	const actualStyle = faceStyle(input.primary.font);
	if (actualStyle !== input.style) {
		throw new Error(
			`Role "${input.role}" requests ${input.style}, but primary face "${input.primary.font.fullName}" is ${actualStyle}.`
		);
	}
	if (profile.style !== input.style) {
		throw new Error(
			`Fallback profile "${profile.id}" is ${profile.style} and cannot calibrate role "${input.role}" style ${input.style}.`
		);
	}
	if (!input.primary.source.file.trim()) {
		throw new Error(`Role "${input.role}" requires primary source.file provenance.`);
	}
	if (!/^[a-f\d]{64}$/i.test(input.primary.source.sha256)) {
		throw new Error(`Role "${input.role}" requires a 64-character primary source SHA-256.`);
	}
}

function normalizedAxes(font: Font): Record<string, VariableAxis> {
	return Object.fromEntries(
		Object.entries(font.variationAxes)
			.filter((entry): entry is [string, VariableAxis] => Boolean(entry[1]))
			.sort(([left], [right]) => left.localeCompare(right))
	);
}

/**
 * Fontkit 2 copies the source font's decoded-table cache into a variation. If
 * required tables have not been decoded first, getters on the returned font can
 * observe an empty cache. Read the exact tables used below before instantiation.
 */
function warmVariationTables(font: Font): void {
	void font.unitsPerEm;
	void font.ascent;
	void font.descent;
	void font.lineGap;
	void font.familyName;
	void font.fullName;
	void font.postscriptName;
	font.glyphsForString(LATIN_UI_CALIBRATION_CORPUS.text);
}

function instantiatePrimary(input: AdjustedFallbackInput): {
	font: Font;
	coordinates: Record<string, number>;
} {
	const font = input.primary.font;
	const axes = normalizedAxes(font);
	const requested = input.primary.coordinates ?? {};
	for (const tag of Object.keys(requested)) {
		if (!axes[tag]) {
			throw new Error(
				`Role "${input.role}" requests unknown variation axis "${tag}" on face "${font.fullName}".`
			);
		}
	}
	if (axes.ital || axes.slnt) {
		throw new Error(
			`Primary face "${font.fullName}" uses a variable ital/slnt axis; exact style-axis calibration is not supported yet.`
		);
	}

	const coordinates = Object.fromEntries(
		Object.entries(axes).map(([tag, axis]) => [tag, requested[tag] ?? axis.default])
	);
	if (axes.wght) {
		if (requested.wght !== undefined && requested.wght !== input.weight) {
			throw new Error(
				`Role "${input.role}" weight ${input.weight} conflicts with primary.coordinates.wght ${requested.wght}.`
			);
		}
		coordinates.wght = input.weight;
	} else {
		const staticWeight = font['OS/2'].usWeightClass;
		if (staticWeight !== input.weight) {
			throw new Error(
				`Role "${input.role}" requests weight ${input.weight}, but static face "${font.fullName}" is weight ${staticWeight}.`
			);
		}
	}

	for (const [tag, value] of Object.entries(coordinates)) {
		const axis = axes[tag];
		if (!Number.isFinite(value) || value < axis.min || value > axis.max) {
			throw new Error(
				`Role "${input.role}" axis ${tag}=${value} is outside ${axis.min}-${axis.max} for face "${font.fullName}".`
			);
		}
	}
	if (Object.keys(axes).length === 0) return { font, coordinates };
	warmVariationTables(font);
	let instance: Font;
	try {
		instance = font.getVariation(coordinates);
		// Force Fontkit's lazy sfnt table access while the error still has role context.
		void instance.unitsPerEm;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Role "${input.role}" could not instantiate variable face "${font.fullName}" at ${JSON.stringify(coordinates)}. ${detail}`
		);
	}
	return {
		font: instance,
		coordinates,
	};
}

function averageAdvance(font: Font): number {
	const codePoints = [
		...new Set([...LATIN_UI_CALIBRATION_CORPUS.text].map((value) => value.codePointAt(0)!)),
	];
	const missing = codePoints.filter((codePoint) => !font.hasGlyphForCodePoint(codePoint));
	if (missing.length > 0) {
		throw new Error(
			`Primary face "${font.fullName}" does not cover calibration corpus code points: ${missing.map((value) => `U+${value.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')}.`
		);
	}
	const glyphs = font.glyphsForString(LATIN_UI_CALIBRATION_CORPUS.text);
	if (glyphs.length !== LATIN_UI_CALIBRATION_CORPUS.text.length) {
		throw new Error(
			`Primary face "${font.fullName}" returned ${glyphs.length} glyphs for a ${LATIN_UI_CALIBRATION_CORPUS.text.length}-character calibration corpus.`
		);
	}
	const widths = glyphs.map((glyph: Glyph) => glyph.advanceWidth);
	if (widths.some((width) => !Number.isFinite(width) || width < 0)) {
		throw new Error(`Primary face "${font.fullName}" returned an invalid glyph advance.`);
	}
	return widths.reduce((total, width) => total + width, 0) / widths.length;
}

function roundedPercent(ratio: number): number {
	return Number((ratio * 100).toFixed(2));
}

function cssPercent(value: number): string {
	return `${value.toFixed(2)}%`;
}

/**
 * Calculate metric overrides for an exact primary face and a versioned local
 * fallback profile. This function performs no filesystem or CSS emission.
 */
export function calculateAdjustedFallback(
	input: AdjustedFallbackInput
): AdjustedFallbackMeasurement {
	const profile = BUILT_IN_FALLBACK_PROFILES[input.profile as BuiltInFallbackProfileId];
	if (!profile) throw new Error(`Unsupported fallback profile "${input.profile}".`);
	validateInput(input, profile);

	const primary = instantiatePrimary(input);
	finitePositive(primary.font.unitsPerEm, `Primary face "${primary.font.fullName}" unitsPerEm`);
	finitePositive(primary.font.ascent, `Primary face "${primary.font.fullName}" ascent`);
	if (!Number.isFinite(primary.font.descent) || primary.font.descent > 0) {
		throw new Error(`Primary face "${primary.font.fullName}" descent must be zero or negative.`);
	}
	if (!Number.isFinite(primary.font.lineGap) || primary.font.lineGap < 0) {
		throw new Error(`Primary face "${primary.font.fullName}" lineGap must be zero or positive.`);
	}

	const primaryAverageAdvance = averageAdvance(primary.font);
	const primaryAverageAdvancePerEm = primaryAverageAdvance / primary.font.unitsPerEm;
	const fallbackAverageAdvancePerEm = profile.averageAdvance / profile.unitsPerEm;
	const sizeAdjust = primaryAverageAdvancePerEm / fallbackAverageAdvancePerEm;
	finitePositive(sizeAdjust, 'Calculated sizeAdjust');
	const ascentOverride = primary.font.ascent / (primary.font.unitsPerEm * sizeAdjust);
	const descentOverride = Math.abs(primary.font.descent) / (primary.font.unitsPerEm * sizeAdjust);
	const lineGapOverride = primary.font.lineGap / (primary.font.unitsPerEm * sizeAdjust);
	const rounded = {
		sizeAdjustPercent: roundedPercent(sizeAdjust),
		ascentOverridePercent: roundedPercent(ascentOverride),
		descentOverridePercent: roundedPercent(descentOverride),
		lineGapOverridePercent: roundedPercent(lineGapOverride),
	};

	return {
		schemaVersion: 2,
		role: { id: input.role, style: input.style, weight: input.weight },
		primary: {
			source: { ...input.primary.source },
			names: {
				family: primary.font.familyName,
				full: primary.font.fullName,
				postscript: primary.font.postscriptName,
			},
			variable: Object.keys(primary.coordinates).length > 0,
			coordinates: primary.coordinates,
			unitsPerEm: primary.font.unitsPerEm,
			metrics: {
				ascent: primary.font.ascent,
				descent: primary.font.descent,
				lineGap: primary.font.lineGap,
			},
		},
		fallback: profile,
		calibration: {
			corpus: LATIN_UI_CALIBRATION_CORPUS,
			formula: { id: 'tfs-adjusted-fallback-v1', version: 1 },
			raw: {
				primaryAverageAdvance,
				primaryAverageAdvancePerEm,
				fallbackAverageAdvance: profile.averageAdvance,
				fallbackAverageAdvancePerEm,
				sizeAdjust,
				ascentOverride,
				descentOverride,
				lineGapOverride,
			},
			rounded,
			css: {
				sizeAdjust: cssPercent(rounded.sizeAdjustPercent),
				ascentOverride: cssPercent(rounded.ascentOverridePercent),
				descentOverride: cssPercent(rounded.descentOverridePercent),
				lineGapOverride: cssPercent(rounded.lineGapOverridePercent),
			},
		},
		provenance: {
			generator: '@three-forma-styli/cli',
			calculation: 'tfs-adjusted-fallback-v1',
			primarySampler: 'fontkit.getVariation+glyphsForString',
		},
		warnings: [
			`The ${profile.family} profile is a published Fontpie compatibility constant without originating font-file provenance.`,
			`local(${JSON.stringify(profile.family)}) availability and installed metrics vary by platform; browsers use the remaining fallback stack when the named face is unavailable.`,
		],
	};
}
