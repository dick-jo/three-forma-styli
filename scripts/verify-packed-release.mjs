import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as runCommand } from './ecosystem/process.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const typescriptBin = require.resolve('typescript/bin/tsc');
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'tfs-packed-release-'));
const tarballDirectory = path.join(temporaryRoot, 'tarballs');
const consumerDirectory = path.join(temporaryRoot, 'consumer');
const packageDirectory = path.join(temporaryRoot, 'packages');

const run = (command, args, options = {}) =>
	runCommand(command, args, {
		cwd: repositoryRoot,
		...options,
	});

try {
	await mkdir(tarballDirectory, { recursive: true });
	await mkdir(consumerDirectory, { recursive: true });
	await mkdir(packageDirectory, { recursive: true });

	const packageDirectories = ['core', 'themes', 'compiler', 'cli'];
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
		if (packageDirectory === 'compiler') {
			const inventory = run('tar', ['-tzf', tarballPath])
				.split('\n')
				.map((file) => file.replaceAll('\\', '/'));
			for (const file of ['index.html', 'workbench.css', 'workbench.js']) {
				assert.ok(
					inventory.includes(`package/workbench-assets/${file}`),
					`Packed compiler omitted Workbench asset: ${file}`
				);
			}
		}
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
		for (const section of [
			'dependencies',
			'devDependencies',
			'optionalDependencies',
			'peerDependencies',
		]) {
			for (const dependencyName of Object.keys(installManifest[section] ?? {})) {
				if (dependencyName.startsWith('@three-forma-styli/')) {
					installManifest[section][dependencyName] = 'workspace:*';
				}
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
    import * as runtime from '@three-forma-styli/core/runtime';
	import { defineTfsProject as defineWithCompiler } from '@three-forma-styli/compiler';
	import { buildProject } from '@three-forma-styli/compiler/build';
	import * as fontCompiler from '@three-forma-styli/compiler/fonts';
	import { defineTfsProject as defineWithCli } from '@three-forma-styli/cli';
    import * as themes from '@three-forma-styli/themes';

    assert.equal(typeof core.fontFromManifest, 'function');
    assert.equal(typeof runtime.generateRuntimeColorTheme, 'function');
	assert.equal(typeof defineWithCompiler, 'function');
	assert.equal(defineWithCli, defineWithCompiler);
	assert.equal(typeof buildProject, 'function');
	assert.equal(typeof fontCompiler.prepareFonts, 'function');
    assert.ok(Object.keys(themes).length > 0);
  `;

	run('node', ['--input-type=module', '--eval', smokeTest], { cwd: consumerDirectory });

	await writeFile(
		path.join(consumerDirectory, 'index.ts'),
		`import { generate } from '@three-forma-styli/core';
import { generateRuntimeColorTheme } from '@three-forma-styli/core/runtime';
import { defineTfsProject } from '@three-forma-styli/compiler';
import { defineTfsProject as defineTfsProjectWithCli } from '@three-forma-styli/cli';
import { designSystem } from '@three-forma-styli/themes/default';

const project = defineTfsProject({
  system: designSystem,
  output: { directory: './dist', css: true },
});

generate(project.system);
defineTfsProjectWithCli({ system: {}, output: { directory: './compat-dist' } });
generateRuntimeColorTheme(
  {
    polarity: 'negative',
    colors: { canvas: { l: 0.1, c: 0, h: 0 }, ink: { l: 0.9, c: 0, h: 0 } },
  },
  {
    colorNames: ['canvas', 'ink'],
    luminance: {
      minimumLuminanceDelta: 0.5,
      backgroundColors: ['canvas'],
      foregroundColors: ['ink'],
    },
  },
);
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

	await writeFile(
		path.join(consumerDirectory, 'tfs.config.js'),
		`import { defineTfsProject } from '@three-forma-styli/compiler';

export default defineTfsProject({
  system: {
    spacing: {
      modes: [{
        name: 'default',
        isDefault: true,
        tokens: { unit: 'rem', base: 1, min: 0.5, increment: 0.25, range: 2 },
      }],
    },
  },
  output: { directory: './dist', css: true },
});
`
	);

	const cliEntry = path.join(
		consumerDirectory,
		'node_modules/@three-forma-styli/cli/dist/index.js'
	);
	const help = run(process.execPath, [cliEntry, '--help'], {
		cwd: consumerDirectory,
	});
	assert.match(help, /Usage: tfs/);
	run(process.execPath, [cliEntry, 'build', '.'], {
		cwd: consumerDirectory,
	});
	assert.match(await readFile(path.join(consumerDirectory, 'dist/tokens.css'), 'utf8'), /--sp-1/);

	console.log(
		'Packed core, themes, compiler and CLI import, type-check and build together in an isolated consumer.'
	);
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}
