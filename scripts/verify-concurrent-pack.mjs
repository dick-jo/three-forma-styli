import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageNames = ['core', 'themes', 'compiler', 'cli'];
const outputDirectory = await mkdtemp(path.join(tmpdir(), 'tfs-concurrent-pack-'));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

async function snapshot(directory, relative = '') {
	const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
	const result = [];
	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
		const child = path.join(relative, entry.name);
		if (entry.isDirectory()) result.push(...(await snapshot(directory, child)));
		else if (entry.isFile()) {
			const content = await readFile(path.join(directory, child));
			result.push([child, createHash('sha256').update(content).digest('hex')]);
		}
	}
	return result;
}

function pack(packageName) {
	return new Promise((resolve, reject) => {
		const child = spawn(pnpm, ['pack', '--pack-destination', outputDirectory], {
			cwd: path.join(repositoryRoot, 'packages', packageName),
			shell: process.platform === 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve();
			else {
				reject(
					new Error(
						`${packageName} concurrent pack failed (${code ?? 'signal'}):\n${stdout}\n${stderr}`
					)
				);
			}
		});
	});
}

try {
	const before = Object.fromEntries(
		await Promise.all(
			packageNames.map(async (packageName) => [
				packageName,
				await snapshot(path.join(repositoryRoot, 'packages', packageName, 'dist')),
			])
		)
	);
	await Promise.all(packageNames.map(pack));
	const tarballs = await readdir(outputDirectory);
	for (const packageName of packageNames) {
		assert.ok(
			tarballs.some(
				(file) => file.includes(`-${packageName}-`) || file.includes(`styli-${packageName}-`)
			),
			`Concurrent pack omitted ${packageName}: ${tarballs.join(', ')}`
		);
	}
	const after = Object.fromEntries(
		await Promise.all(
			packageNames.map(async (packageName) => [
				packageName,
				await snapshot(path.join(repositoryRoot, 'packages', packageName, 'dist')),
			])
		)
	);
	assert.deepEqual(after, before, 'Concurrent packing mutated prebuilt package output');
	console.log('All public packages pack concurrently without mutating shared build output.');
} finally {
	await rm(outputDirectory, { recursive: true, force: true });
}
