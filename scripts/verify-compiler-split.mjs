import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);

async function json(relativePath) {
	return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function sourceFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const target = path.join(directory, entry.name);
			return entry.isDirectory() ? sourceFiles(target) : [target];
		})
	);
	return files.flat();
}

const compiler = await json('packages/compiler/package.json');
const cli = await json('packages/cli/package.json');
const core = await json('packages/core/package.json');
const themes = await json('packages/themes/package.json');
const workbench = await json('apps/workbench/package.json');

assert.deepEqual(Object.keys(compiler.dependencies).sort(), [
	'@three-forma-styli/core',
	'fontkit',
	'fs-extra',
]);
for (const forbidden of [
	'@inquirer/prompts',
	'@three-forma-styli/themes',
	'chalk',
	'commander',
	'esbuild',
]) {
	assert.equal(
		compiler.dependencies[forbidden],
		undefined,
		`Compiler must not depend on ${forbidden}`
	);
}
assert.equal(cli.dependencies['@three-forma-styli/compiler'], 'workspace:^');
assert.equal(cli.dependencies.fontkit, undefined, 'CLI must receive fontkit only through compiler');
assert.equal(core.dependencies['@three-forma-styli/compiler'], undefined);
assert.equal(themes.dependencies['@three-forma-styli/compiler'], undefined);
assert.deepEqual(Object.keys(workbench.dependencies).sort(), ['@three-forma-styli/core']);
assert.equal(
	compiler.dependencies['@three-forma-styli/workbench-source'],
	undefined,
	'The Svelte workbench source must never enter the published compiler graph'
);
assert.equal(
	compiler.devDependencies['@three-forma-styli/workbench-source'],
	undefined,
	'The compiler must consume only checked-in dependency-free workbench assets'
);

const compilerSources = (await sourceFiles(path.join(root, 'packages/compiler/src'))).filter(
	(file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
);
for (const file of compilerSources) {
	const source = await readFile(file, 'utf8');
	for (const forbidden of [
		'@inquirer/prompts',
		"from 'chalk'",
		"from 'commander'",
		"from 'esbuild'",
	]) {
		assert.equal(
			source.includes(forbidden),
			false,
			`${path.relative(root, file)} imports ${forbidden}`
		);
	}
	assert.doesNotMatch(
		source,
		/from ['"]@three-forma-styli\/(?:cli|themes)['"]/,
		`${path.relative(root, file)} crosses the compiler package boundary`
	);
}

for (const directory of ['packages/core/src', 'packages/themes/src', 'apps/workbench/src']) {
	for (const file of await sourceFiles(path.join(root, directory))) {
		if (!/\.(?:ts|svelte)$/.test(file)) continue;
		const source = await readFile(file, 'utf8');
		assert.doesNotMatch(
			source,
			/@three-forma-styli\/(?:compiler|cli)/,
			`${path.relative(root, file)} crosses the browser/compiler boundary`
		);
	}
}

const compilerApi = path.join(root, 'packages/compiler/dist/api.js');
await import(`${pathToFileURL(compilerApi).href}?import-safety=${Date.now()}`);
const unsafeLoadedModules = Object.keys(require.cache).filter((file) =>
	/[\\/](?:fontkit|fs-extra)[\\/]/.test(file)
);
assert.deepEqual(
	unsafeLoadedModules,
	[],
	'Importing @three-forma-styli/compiler must not eagerly load fontkit or fs-extra'
);

async function artifactHashes(directory) {
	const result = {};
	for (const file of await sourceFiles(directory)) {
		const relative = path.relative(directory, file).split(path.sep).join('/');
		result[relative] = createHash('sha256')
			.update(await readFile(file))
			.digest('hex');
	}
	return result;
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'tfs-compiler-parity-'));
try {
	const configPath = path.join(temporaryDirectory, 'tfs.config.js');
	const project = {
		kind: 'three-forma-styli/project',
		schemaVersion: 1,
		system: {
			spacing: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'rem', base: 1, min: 0.5, increment: 0.25, range: 2 },
					},
				],
			},
		},
		output: { directory: './dist', css: true, systemTypescript: true },
	};
	await writeFile(configPath, `export default ${JSON.stringify(project, null, 2)};\n`);

	const { buildProject } = await import(
		`${pathToFileURL(path.join(root, 'packages/compiler/dist/build.js')).href}?parity=${Date.now()}`
	);
	const direct = await buildProject(project, configPath);
	const expected = await artifactHashes(direct.outputDirectory);

	execFileSync(
		process.execPath,
		[path.join(root, 'packages/cli/dist/index.js'), 'build', configPath],
		{ cwd: temporaryDirectory, stdio: ['ignore', 'pipe', 'pipe'] }
	);
	const actual = await artifactHashes(direct.outputDirectory);
	assert.deepEqual(
		actual,
		expected,
		'CLI delegation must preserve compiler artifacts byte-for-byte'
	);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log('Compiler boundary, import safety and CLI artifact parity verified.');
