import { resolve } from 'node:path';
import { inspectFontFile, type FontFace } from '../fonts/inspect.js';
import { TfsError } from '../resolve/issues.js';

/** A human-readable problem list for the terminal. */
export function describeError(error: unknown): string {
	if (error instanceof TfsError) return error.message;
	return error instanceof Error ? error.message : String(error);
}

function range(face: FontFace): string {
	return face.weight.min === face.weight.max
		? `${face.weight.min}`
		: `${face.weight.min}–${face.weight.max}`;
}

/** One line per face: what each font file offers, shown even before roles are valid. */
export function describeFontFiles(files: readonly string[], projectDir = process.cwd()): string[] {
	return files.map((file) => {
		try {
			const face = inspectFontFile(resolve(projectDir, file));
			return `${file}\n    ${face.family} · ${face.style} · weight ${range(face)}${face.axes.length ? ` · axes ${face.axes.join(', ')}` : ''}`;
		} catch (error) {
			return `${file}\n    ${describeError(error)}`;
		}
	});
}
