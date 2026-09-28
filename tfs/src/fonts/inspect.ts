import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import * as fontkit from 'fontkit';
import type { Font } from 'fontkit';

export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontFormat = 'woff2' | 'woff' | 'truetype' | 'opentype';

/** What one font file actually offers. */
export type FontFace = {
	readonly file: string;
	readonly format: FontFormat;
	readonly family: string;
	readonly style: FontStyle;
	/** A static face has min === max. */
	readonly weight: { readonly min: number; readonly max: number };
	readonly axes: readonly string[];
	readonly font: Font;
};

const EXTENSION_FORMAT: Record<string, FontFormat> = {
	'.woff2': 'woff2',
	'.woff': 'woff',
	'.ttf': 'truetype',
	'.otf': 'opentype',
};

function containerFormat(font: Font): FontFormat | 'collection' {
	const type = (font as unknown as { type: string }).type;
	if (type === 'WOFF2') return 'woff2';
	if (type === 'WOFF') return 'woff';
	if (type === 'TTC' || type === 'DFont') return 'collection';
	return (font as unknown as { directory?: { tag?: string } }).directory?.tag === 'OTTO'
		? 'opentype'
		: 'truetype';
}

function styleOf(font: Font): FontStyle {
	const flags = font['OS/2'].fsSelection;
	if (flags.italic) return 'italic';
	if (flags.oblique || font.italicAngle !== 0) return 'oblique';
	return 'normal';
}

/** Reads a font file's family, style and weight range. Throws a plain message on failure. */
export function inspectFontFile(file: string): FontFace {
	let font: Font;
	try {
		font = fontkit.create(readFileSync(file)) as Font;
	} catch (error) {
		throw new Error(
			`cannot read "${file}" as a font (${error instanceof Error ? error.message : String(error)})`
		);
	}
	const format = containerFormat(font);
	if (format === 'collection')
		throw new Error(`"${file}" is a font collection; supply individual font files`);
	const expected = EXTENSION_FORMAT[extname(file).toLowerCase()];
	if (expected !== format)
		throw new Error(`"${file}" has a ${extname(file)} extension but contains ${format} data`);

	const wght = font.variationAxes.wght;
	return {
		file,
		format,
		family: font.familyName,
		style: styleOf(font),
		weight: wght
			? { min: wght.min, max: wght.max }
			: { min: font['OS/2'].usWeightClass, max: font['OS/2'].usWeightClass },
		axes: Object.keys(font.variationAxes).sort(),
		font,
	};
}
