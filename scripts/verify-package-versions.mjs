import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packagePaths = {
	core: new URL('../packages/core/package.json', import.meta.url),
	compiler: new URL('../packages/compiler/package.json', import.meta.url),
	cli: new URL('../packages/cli/package.json', import.meta.url),
	themes: new URL('../packages/themes/package.json', import.meta.url),
};

const manifests = Object.fromEntries(
	await Promise.all(
		Object.entries(packagePaths).map(async ([name, path]) => [
			name,
			JSON.parse(await readFile(path, 'utf8')),
		])
	)
);

const versions = new Set(Object.values(manifests).map(({ version }) => version));

assert.equal(
	versions.size,
	1,
	`Public packages must share one release version. Found: ${Object.entries(manifests)
		.map(([name, manifest]) => `${name}@${manifest.version}`)
		.join(', ')}`
);

assert.equal(manifests.cli.dependencies['@three-forma-styli/core'], 'workspace:^');
assert.equal(manifests.cli.dependencies['@three-forma-styli/compiler'], 'workspace:^');
assert.equal(manifests.cli.dependencies['@three-forma-styli/themes'], 'workspace:^');
assert.equal(manifests.compiler.dependencies['@three-forma-styli/core'], 'workspace:^');
assert.equal(manifests.themes.dependencies['@three-forma-styli/core'], 'workspace:^');

console.log(`Package versions are coordinated at ${manifests.core.version}.`);
