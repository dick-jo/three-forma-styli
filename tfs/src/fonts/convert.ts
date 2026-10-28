import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const INSTALL = 'Install FontTools with Brotli support: pip install fonttools brotli';

async function fonttools(args: readonly string[]): Promise<void> {
	try {
		await run('fonttools', [...args]);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`FontTools failed (${detail.split('\n')[0]}). ${INSTALL}`);
	}
}

/**
 * The characters in `unicodes` (a CSS unicode-range value) as WOFF2, from any font
 * format. Variable axes and every OpenType layout feature are kept.
 */
export function subsetToWoff2(
	source: string,
	destination: string,
	unicodes: string
): Promise<void> {
	return fonttools([
		'subset',
		source,
		`--unicodes=${unicodes}`,
		'--layout-features=*',
		'--flavor=woff2',
		`--output-file=${destination}`,
	]);
}

/** WOFF2 → TTF, for measuring variable WOFF2 faces (fontkit cannot instance them). */
export function decompressWoff2(source: string, destination: string): Promise<void> {
	return fonttools(['ttLib.woff2', 'decompress', source, '-o', destination]);
}
