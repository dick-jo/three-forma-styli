import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import type { Font, FontCollection } from 'fontkit';

export interface FontAxisInspection {
	name: string;
	min: number;
	default: number;
	max: number;
}

export interface FontInspection {
	source: {
		path: string;
		format: string;
		bytes: number;
		sha256: string;
	};
	names: {
		family: string;
		subfamily: string;
		full: string;
		postscript: string;
	};
	metadata: {
		version: string;
		copyright: string;
	};
	style: {
		weight: number;
		width: number;
		italic: boolean;
		oblique: boolean;
		italicAngle: number;
	};
	axes: Record<string, FontAxisInspection>;
	namedInstances: Record<string, Record<string, number>>;
	metrics: {
		unitsPerEm: number;
		hhea: {
			ascent: number;
			descent: number;
			lineGap: number;
		};
		win: {
			ascent: number;
			descent: number;
		};
		useTypoMetrics: boolean;
		/** Legacy convenience aliases for the hhea metrics exposed by fontkit. */
		ascent: number;
		descent: number;
		lineGap: number;
		capHeight: number;
		xHeight: number;
		naturalLineHeight: number;
		capHeightRatio: number;
		xHeightRatio: number;
		typo: {
			ascent: number;
			descent: number;
			lineGap: number;
			naturalLineHeight: number;
		};
	};
	coverage: {
		glyphs: number;
		codePoints: number;
	};
	features: string[];
	embedding: {
		noEmbedding: boolean;
		viewOnly: boolean;
		editable: boolean;
		noSubsetting: boolean;
		bitmapOnly: boolean;
	};
	warnings: string[];
}

/** One authoritative style classification shared by inspect and prepare output. */
export function classifyFontStyle(
	inspection: Pick<FontInspection, 'style'>
): 'normal' | 'italic' | 'oblique' {
	if (inspection.style.italic) return 'italic';
	if (inspection.style.oblique || inspection.style.italicAngle !== 0) return 'oblique';
	return 'normal';
}

export interface FontInspectionManifest {
	schemaVersion: 1;
	fonts: FontInspection[];
}

type FontWithNamedInstances = Font & {
	namedVariations?: Record<string, Record<string, number>>;
};

function formatRatio(value: number): number {
	return Number(value.toFixed(4));
}

function normalizeAxes(font: Font): Record<string, FontAxisInspection> {
	return Object.fromEntries(
		Object.entries(font.variationAxes)
			.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([tag, axis]) => [
				tag,
				{
					name: axis.name,
					min: axis.min,
					default: axis.default,
					max: axis.max,
				},
			])
	);
}

function normalizeNamedInstances(
	font: FontWithNamedInstances
): Record<string, Record<string, number>> {
	return Object.fromEntries(
		Object.entries(font.namedVariations ?? {})
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([name, coordinates]) => [
				name,
				Object.fromEntries(
					Object.entries(coordinates).sort(([left], [right]) => left.localeCompare(right))
				),
			])
	);
}

function collectWarnings(font: FontWithNamedInstances): string[] {
	const warnings: string[] = [];
	const styleName = `${font.subfamilyName} ${font.fullName} ${font.postscriptName}`;
	if (font['OS/2'].fsSelection.italic && font['OS/2'].fsSelection.oblique) {
		warnings.push('OS/2 marks the face as both italic and oblique; italic takes precedence.');
	}
	if (
		!font['OS/2'].fsSelection.italic &&
		!font['OS/2'].fsSelection.oblique &&
		/italic/i.test(styleName)
	) {
		warnings.push('Font naming says italic but OS/2 style flags do not.');
	}
	if (
		font.italicAngle !== 0 &&
		!font['OS/2'].fsSelection.italic &&
		!font['OS/2'].fsSelection.oblique
	) {
		warnings.push('A non-zero italic angle is classified as oblique despite normal OS/2 flags.');
	}

	for (const [tag, axis] of Object.entries(font.variationAxes)) {
		if (!axis) continue;
		if (axis.default === axis.min || axis.default === axis.max) {
			warnings.push(
				`Variable axis "${tag}" defaults to its ${axis.default === axis.min ? 'minimum' : 'maximum'} boundary (${axis.default}).`
			);
		}
	}

	const embedding = font['OS/2'].fsType;
	if (embedding.noEmbedding) warnings.push('OS/2 metadata prohibits embedding.');
	if (embedding.viewOnly) warnings.push('OS/2 metadata permits preview-and-print embedding only.');
	if (embedding.noSubsetting) warnings.push('OS/2 metadata prohibits subsetting.');
	if (embedding.bitmapOnly) warnings.push('OS/2 metadata permits bitmap embedding only.');

	const os2 = font['OS/2'];
	const windowsMetrics = os2.fsSelection.useTypoMetrics
		? { ascent: os2.typoAscender, descent: os2.typoDescender, lineGap: os2.typoLineGap }
		: { ascent: os2.winAscent, descent: -os2.winDescent, lineGap: 0 };
	if (
		font.hhea.ascent !== windowsMetrics.ascent ||
		font.hhea.descent !== windowsMetrics.descent ||
		font.hhea.lineGap !== windowsMetrics.lineGap
	) {
		warnings.push(
			'Platform line-metric conventions differ; universal fallback metric overrides require explicit calibration.'
		);
	}

	return warnings;
}

export function createFontInspection(
	font: FontWithNamedInstances,
	source: FontInspection['source']
): FontInspection {
	const unitsPerEm = font.unitsPerEm;
	const os2 = font['OS/2'];
	const naturalLineHeight = (font.ascent - font.descent + font.lineGap) / unitsPerEm;
	const typoNaturalLineHeight =
		(os2.typoAscender - os2.typoDescender + os2.typoLineGap) / unitsPerEm;

	return {
		source,
		names: {
			family: font.familyName,
			subfamily: font.subfamilyName,
			full: font.fullName,
			postscript: font.postscriptName,
		},
		metadata: {
			version: String(font.version),
			copyright: font.copyright,
		},
		style: {
			weight: os2.usWeightClass,
			width: os2.usWidthClass,
			italic: os2.fsSelection.italic,
			oblique: os2.fsSelection.oblique,
			italicAngle: font.italicAngle,
		},
		axes: normalizeAxes(font),
		namedInstances: normalizeNamedInstances(font),
		metrics: {
			unitsPerEm,
			hhea: {
				ascent: font.hhea.ascent,
				descent: font.hhea.descent,
				lineGap: font.hhea.lineGap,
			},
			win: {
				ascent: os2.winAscent,
				descent: os2.winDescent,
			},
			useTypoMetrics: os2.fsSelection.useTypoMetrics,
			ascent: font.ascent,
			descent: font.descent,
			lineGap: font.lineGap,
			capHeight: font.capHeight,
			xHeight: font.xHeight,
			naturalLineHeight: formatRatio(naturalLineHeight),
			capHeightRatio: formatRatio(font.capHeight / unitsPerEm),
			xHeightRatio: formatRatio(font.xHeight / unitsPerEm),
			typo: {
				ascent: os2.typoAscender,
				descent: os2.typoDescender,
				lineGap: os2.typoLineGap,
				naturalLineHeight: formatRatio(typoNaturalLineHeight),
			},
		},
		coverage: {
			glyphs: font.numGlyphs,
			codePoints: font.characterSet.length,
		},
		features: [...font.availableFeatures].sort(),
		embedding: {
			noEmbedding: os2.fsType.noEmbedding,
			viewOnly: os2.fsType.viewOnly,
			editable: os2.fsType.editable,
			noSubsetting: os2.fsType.noSubsetting,
			bitmapOnly: os2.fsType.bitmapOnly,
		},
		warnings: collectWarnings(font),
	};
}

function isFontCollection(value: Font | FontCollection): value is FontCollection {
	return value.type === 'TTC' || value.type === 'DFont';
}

/** Detect the actual wrapper/container instead of trusting a filename extension. */
export function detectFontContainerFormat(value: Font | FontCollection): string {
	if (value.type === 'WOFF2') return 'woff2';
	if (value.type === 'WOFF') return 'woff';
	if (value.type === 'TTC' || value.type === 'DFont') return 'collection';
	const tag = (value as Font & { directory?: { tag?: unknown } }).directory?.tag;
	return tag === 'OTTO' ? 'opentype' : 'truetype';
}

function expectedExtensionFormat(extension: string): string | undefined {
	switch (extension.toLowerCase()) {
		case '.woff2':
			return 'woff2';
		case '.woff':
			return 'woff';
		case '.ttf':
			return 'truetype';
		case '.otf':
			return 'opentype';
		case '.ttc':
		case '.dfont':
			return 'collection';
		default:
			return undefined;
	}
}

function inspectSource(filePath: string, cwd: string): FontInspection[] {
	const absolutePath = path.resolve(cwd, filePath);
	const buffer = fs.readFileSync(absolutePath);
	const opened = fontkit.create(buffer);
	const detectedFormat = detectFontContainerFormat(opened);
	const expectedFormat = expectedExtensionFormat(path.extname(absolutePath));
	if (expectedFormat && expectedFormat !== detectedFormat) {
		throw new Error(
			`Font file ${filePath} uses extension ${path.extname(absolutePath)} but contains ${detectedFormat} data.`
		);
	}
	const source = {
		path: path.relative(cwd, absolutePath) || path.basename(absolutePath),
		format: detectedFormat,
		bytes: buffer.byteLength,
		sha256: createHash('sha256').update(buffer).digest('hex'),
	};

	const fonts = isFontCollection(opened) ? opened.fonts : [opened];
	return fonts.map((font) => createFontInspection(font, source));
}

export function inspectFontFiles(filePaths: string[], cwd = process.cwd()): FontInspection[] {
	if (filePaths.length === 0) {
		throw new Error('Provide at least one font file to inspect.');
	}

	return filePaths.flatMap((filePath) => inspectSource(filePath, cwd));
}
