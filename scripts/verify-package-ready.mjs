import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const packageRoot = process.cwd();
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));

function collectExportTargets(value, targets = []) {
	if (typeof value === 'string') {
		if (value.startsWith('./')) targets.push(value);
		return targets;
	}
	if (!value || typeof value !== 'object') return targets;
	for (const nested of Object.values(value)) collectExportTargets(nested, targets);
	return targets;
}

const binTargets = Object.values(manifest.bin ?? {}).map((target) =>
	target.startsWith('./') ? target : `./${target}`
);
const targets = [...collectExportTargets(manifest.exports), ...binTargets];

assert.ok(targets.length > 0, `${manifest.name} declares no publishable entrypoints`);

const missing = [];
for (const target of new Set(targets)) {
	try {
		await access(path.resolve(packageRoot, target));
	} catch {
		missing.push(target);
	}
}

assert.deepEqual(
	missing,
	[],
	`${manifest.name}@${manifest.version} is not built; missing publish targets:\n${missing.join('\n')}\nRun the root release gate before packing or publishing.`
);

console.log(`Verified ${manifest.name}@${manifest.version} publish targets.`);
