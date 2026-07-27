import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFontToolsConverter } from '../packages/compiler/dist/fonts/fonttools.js';
import { inspectFontFiles } from '../packages/compiler/dist/fonts/inspect.js';

const candidates = [
	process.env.TFS_FONT_PROOF_SOURCE,
	'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
	'/System/Library/Fonts/Supplemental/Arial.ttf',
].filter(Boolean);

let source;
for (const candidate of candidates) {
	try {
		if ((await stat(candidate)).isFile()) {
			source = candidate;
			break;
		}
	} catch {
		// Continue to the next well-known CI/local proof font.
	}
}
if (!source) {
	throw new Error(
		'Set TFS_FONT_PROOF_SOURCE to a disposable TTF/OTF file for the real FontTools proof.'
	);
}

const temporary = await mkdtemp(path.join(tmpdir(), 'tfs-fonttools-proof-'));
const output = path.join(temporary, 'proof.woff2');
try {
	const converter = await createFontToolsConverter();
	const [before] = inspectFontFiles([source], path.dirname(source));
	await converter.convert(source, output);
	const [after] = inspectFontFiles([output], temporary);
	for (const key of ['style', 'axes', 'features', 'coverage', 'metrics', 'embedding']) {
		assert.deepEqual(after[key], before[key], `FontTools conversion changed ${key}`);
	}
	assert.equal(after.source.format, 'woff2');
	assert.ok(after.source.bytes > 0);
	process.stdout.write(
		`${JSON.stringify(
			{
				status: 'passed',
				source: path.basename(source),
				outputBytes: after.source.bytes,
				provenance: converter.provenance,
			},
			null,
			2
		)}\n`
	);
} finally {
	await rm(temporary, { recursive: true, force: true });
}
