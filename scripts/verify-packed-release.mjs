import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const typescriptBin = require.resolve('typescript/bin/tsc');
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'tfs-packed-release-'));
const tarballDirectory = path.join(temporaryRoot, 'tarballs');
const consumerDirectory = path.join(temporaryRoot, 'consumer');
const packageDirectory = path.join(temporaryRoot, 'packages');

const run = (command, args, options = {}) =>
	execFileSync(command, args, {
		cwd: repositoryRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		...options,
	}).trim();

try {
	await mkdir(tarballDirectory, { recursive: true });
	await mkdir(consumerDirectory, { recursive: true });
	await mkdir(packageDirectory, { recursive: true });

	const packageDirectories = ['core', 'themes', 'cli'];
	const tarballs = [];
	const packedManifests = {};

	for (const packageDirectory of packageDirectories) {
		const output = run('pnpm', ['pack', '--pack-destination', tarballDirectory], {
			cwd: path.join(repositoryRoot, 'packages', packageDirectory),
		});
		const tarballName = output.split('\n').at(-1);
		assert.ok(tarballName?.endsWith('.tgz'), `Could not find tarball in pnpm output:\n${output}`);
		const tarballPath = path.resolve(tarballDirectory, tarballName);
		tarballs.push(tarballPath);
		packedManifests[packageDirectory] = JSON.parse(
			run('tar', ['-xOf', tarballPath, 'package/package.json'])
		);

		const extractedDirectory = path.join(temporaryRoot, 'packages', packageDirectory);
		await mkdir(extractedDirectory, { recursive: true });
		run('tar', ['-xf', tarballPath, '--strip-components=1', '-C', extractedDirectory]);
	}

	for (const [packageDirectory, manifest] of Object.entries(packedManifests)) {
		const serializedManifest = JSON.stringify(manifest);
		assert.doesNotMatch(
			serializedManifest,
			/workspace:/,
			`${packageDirectory} tarball leaked a workspace protocol`
		);
		assert.equal(manifest.version, packedManifests.core.version);

		const installManifest = structuredClone(manifest);
		for (const dependencyName of Object.keys(installManifest.dependencies ?? {})) {
			if (dependencyName.startsWith('@three-forma-styli/')) {
				installManifest.dependencies[dependencyName] = 'workspace:*';
			}
		}
		await writeFile(
			path.join(temporaryRoot, 'packages', packageDirectory, 'package.json'),
			`${JSON.stringify(installManifest, null, 2)}\n`
		);
	}

	await writeFile(
		path.join(consumerDirectory, 'package.json'),
		`${JSON.stringify(
			{
				name: 'tfs-packed-release-smoke',
				private: true,
				type: 'module',
				devDependencies: { typescript: '^5.9.3' },
				dependencies: Object.fromEntries(
					Object.values(packedManifests).map((manifest) => [manifest.name, 'workspace:*'])
				),
			},
			null,
			2
		)}\n`
	);

	await writeFile(
		path.join(temporaryRoot, 'pnpm-workspace.yaml'),
		`packages:\n  - 'packages/*'\n  - 'consumer'\n\nlinkWorkspacePackages: true\n`
	);

	run('pnpm', ['install', '--ignore-scripts'], { cwd: temporaryRoot });

	const smokeTest = `
    import assert from 'node:assert/strict';
    import * as core from '@three-forma-styli/core';
    import { defineTfsProject } from '@three-forma-styli/cli';
    import * as themes from '@three-forma-styli/themes';

    assert.equal(typeof core.fontFromManifest, 'function');
    assert.equal(typeof defineTfsProject, 'function');
    assert.ok(Object.keys(themes).length > 0);
  `;

	run('node', ['--input-type=module', '--eval', smokeTest], { cwd: consumerDirectory });

	await writeFile(
		path.join(consumerDirectory, 'index.ts'),
		`import { generate } from '@three-forma-styli/core';
import { defineTfsProject } from '@three-forma-styli/cli';
import { designSystem } from '@three-forma-styli/themes/default';

const project = defineTfsProject({
  system: designSystem,
  output: { directory: './dist', css: true },
});

generate(project.system);
`
	);
	await writeFile(
		path.join(consumerDirectory, 'tsconfig.json'),
		`${JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'NodeNext',
					moduleResolution: 'NodeNext',
					strict: true,
					noEmit: true,
					skipLibCheck: false,
				},
				include: ['index.ts'],
			},
			null,
			2
		)}\n`
	);
	run(process.execPath, [typescriptBin, '--project', 'tsconfig.json'], { cwd: consumerDirectory });

	const help = run(path.join(consumerDirectory, 'node_modules', '.bin', 'tfs'), ['--help'], {
		cwd: consumerDirectory,
	});
	assert.match(help, /Usage: tfs/);

	console.log(
		'Packed core, themes and CLI import and type-check together in an isolated consumer.'
	);
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}
