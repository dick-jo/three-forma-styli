import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const builtDirectory = path.join(repositoryRoot, 'apps/workbench/dist');
const compilerDirectory = path.join(repositoryRoot, 'packages/compiler/workbench-assets');
const expectedFiles = ['index.html', 'workbench.css', 'workbench.js'];
const write = process.argv.includes('--write');

const builtFiles = (await readdir(builtDirectory)).sort();
assert.deepEqual(
	builtFiles,
	expectedFiles,
	`Workbench build inventory changed. Expected only: ${expectedFiles.join(', ')}`
);

if (write) {
	await mkdir(compilerDirectory, { recursive: true });
	for (const existing of await readdir(compilerDirectory)) {
		if (!expectedFiles.includes(existing)) {
			await rm(path.join(compilerDirectory, existing), { recursive: true, force: true });
		}
	}
	await Promise.all(
		expectedFiles.map((file) =>
			copyFile(path.join(builtDirectory, file), path.join(compilerDirectory, file))
		)
	);
	console.log('Synced dependency-free Workbench assets into the compiler package.');
} else {
	const compilerFiles = (await readdir(compilerDirectory)).sort();
	assert.deepEqual(
		compilerFiles,
		expectedFiles,
		`Compiler Workbench inventory drifted. Run "pnpm workbench:sync".`
	);
	for (const file of expectedFiles) {
		assert.deepEqual(
			await readFile(path.join(compilerDirectory, file)),
			await readFile(path.join(builtDirectory, file)),
			`${file} is stale. Run "pnpm workbench:sync".`
		);
	}
	console.log('Compiler Workbench assets exactly match the canonical Svelte source build.');
}
