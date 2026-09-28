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

/** TTF/OTF → WOFF2. */
export function compressToWoff2(source: string, destination: string): Promise<void> {
	return fonttools(['ttLib.woff2', 'compress', source, '-o', destination]);
}

/** WOFF2 → TTF, for measuring variable WOFF2 faces (fontkit cannot instance them). */
export function decompressWoff2(source: string, destination: string): Promise<void> {
	return fonttools(['ttLib.woff2', 'decompress', source, '-o', destination]);
}
