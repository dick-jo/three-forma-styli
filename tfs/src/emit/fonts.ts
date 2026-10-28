import { GENERATED_HEADER } from '../const.js';
import type { FontFiles } from '../fonts/prepare.js';
import { SLICES } from '../fonts/slices.js';

const json = (value: string) => JSON.stringify(value);
const DOC = '/** URL of every font file, by font, face and Unicode slice: for preloading. */\n';

function nest(
	files: FontFiles,
	leaf: (output: string) => string,
	[readonly, end]: readonly [string, string]
): string {
	const block = (entries: string[], depth: number) =>
		`{\n${entries.map((entry) => `${'\t'.repeat(depth + 1)}${entry}`).join('\n')}\n${'\t'.repeat(depth)}}`;
	return block(
		Object.entries(files).map(
			([id, faces]) =>
				`${readonly}${json(id)}: ${block(
					Object.entries(faces).map(
						([face, slices]) =>
							`${readonly}${json(face)}: ${block(
								SLICES.filter((slice) => slices[slice]).map(
									(slice) => `${readonly}${json(slice)}: ${leaf(slices[slice]!)}${end}`
								),
								2
							)}${end}`
					),
					1
				)}${end}`
		),
		0
	);
}

/**
 * ./fonts runtime values. `new URL(…, import.meta.url)` is the standard way to
 * reference a file from a module; bundlers (Vite, webpack 5, Turbopack) emit it as an
 * asset with the same URL fonts.css's `url()` gets, so a preload is the very download
 * the CSS uses.
 */
export function emitFontsJs(files: FontFiles): string {
	return `${GENERATED_HEADER}${DOC}export const fontFiles = ${nest(
		files,
		(output) => `new URL(${json(`./fonts/${output}`)}, import.meta.url).href`,
		['', ',']
	)};\n`;
}

/** ./fonts types: the exact fonts, faces and slices. */
export function emitFontsTypes(files: FontFiles): string {
	return `${GENERATED_HEADER}${DOC}export declare const fontFiles: ${nest(files, () => 'string', ['readonly ', ';'])};\n`;
}
