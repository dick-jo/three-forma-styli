import { GENERATED_HEADER } from '../const.js';
import type { FontFiles } from '../fonts/prepare.js';

const DOC = '/** URL of every font file, by font, face and Unicode slice: for preloading. */\n';

type Tree = { readonly [key: string]: string | Tree | undefined };

/** How each entry is written: as a value in fonts.js, as a type in fonts.d.ts. */
const FORMS = {
	js: { prefix: '', end: ',' },
	types: { prefix: 'readonly ', end: ';' },
} as const;

/** `tree` as a nested object literal, each file name written by `leaf`. */
function literal(
	tree: Tree,
	leaf: (output: string) => string,
	form: (typeof FORMS)[keyof typeof FORMS],
	depth = 0
): string {
	const indent = '\t'.repeat(depth + 1);
	const entries = Object.entries(tree).map(([key, value]) => {
		const written =
			typeof value === 'string' ? leaf(value) : literal(value!, leaf, form, depth + 1);
		return `${indent}${form.prefix}${JSON.stringify(key)}: ${written}${form.end}`;
	});
	return `{\n${entries.join('\n')}\n${'\t'.repeat(depth)}}`;
}

/**
 * ./fonts runtime values. `new URL(…, import.meta.url)` is the standard way to
 * reference a file from a module; bundlers emit it as an asset with the same URL
 * fonts.css's `url()` gets, so a preload is the very download the CSS uses.
 * Verified in production builds: Next.js (Turbopack and webpack) and Vite in the
 * browser. Vite's server-side rendering gives `file:` URLs instead (a documented Vite
 * limitation); SvelteKit apps preload through SvelteKit's own `preload` option.
 */
export function emitFontsJs(files: FontFiles): string {
	const url = (output: string) =>
		`new URL(${JSON.stringify(`./fonts/${output}`)}, import.meta.url).href`;
	return `${GENERATED_HEADER}${DOC}export const fontFiles = ${literal(files, url, FORMS.js)};\n`;
}

/** ./fonts types: the exact fonts, faces and slices. */
export function emitFontsTypes(files: FontFiles): string {
	return `${GENERATED_HEADER}${DOC}export declare const fontFiles: ${literal(files, () => 'string', FORMS.types)};\n`;
}
