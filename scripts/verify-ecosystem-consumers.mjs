import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'tfs-ecosystem-consumers-'));
const tarballDirectory = path.join(temporaryRoot, 'tarballs');
const toolchainDirectory = path.join(temporaryRoot, 'toolchain');
const projectsDirectory = path.join(toolchainDirectory, 'projects');
const releaseVersion = JSON.parse(
	await readFile(path.join(repositoryRoot, 'packages/core/package.json'), 'utf8')
).version;

function run(command, args, options = {}) {
	return execFileSync(command, args, {
		cwd: repositoryRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		...options,
	}).trim();
}

async function writeJson(file, value) {
	await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function packTfsPackages() {
	await mkdir(tarballDirectory, { recursive: true });
	const tarballs = {};

	for (const packageDirectory of ['core', 'themes', 'compiler', 'cli']) {
		const output = run('pnpm', ['pack', '--pack-destination', tarballDirectory], {
			cwd: path.join(repositoryRoot, 'packages', packageDirectory),
		});
		const tarballName = output.split('\n').at(-1);
		assert.ok(tarballName?.endsWith('.tgz'), `Could not identify ${packageDirectory} tarball`);
		tarballs[packageDirectory] = path.resolve(tarballDirectory, tarballName);
	}

	return tarballs;
}

async function installPackedToolchain(tarballs) {
	await mkdir(projectsDirectory, { recursive: true });
	await writeJson(path.join(toolchainDirectory, 'package.json'), {
		name: 'tfs-real-tarball-toolchain',
		private: true,
		type: 'module',
		dependencies: Object.fromEntries(
			Object.entries(tarballs).map(([name, tarball]) => [
				`@three-forma-styli/${name}`,
				pathToFileURL(tarball).href,
			])
		),
		devDependencies: {
			typescript: '5.9.3',
		},
	});

	// Unlike verify-packed-release.mjs, this is an ordinary package-manager
	// install of the real tarballs. No TFS package is extracted into or linked
	// from a workspace, so published dependency and binary resolution are tested.
	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
		cwd: toolchainDirectory,
	});

	const npmTree = JSON.parse(run('npm', ['ls', '--json', '--all'], { cwd: toolchainDirectory }));
	for (const packageName of Object.keys(tarballs)) {
		assert.equal(
			npmTree.dependencies[`@three-forma-styli/${packageName}`]?.version,
			releaseVersion,
			`${packageName} did not resolve to the packed release`
		);
	}
}

function tfs(projectDirectory, args) {
	const cliEntry = path.join(
		toolchainDirectory,
		'node_modules/@three-forma-styli/cli/dist/index.js'
	);
	return run(process.execPath, [cliEntry, ...args], {
		cwd: projectDirectory,
	});
}

async function exerciseScaffolds() {
	const standaloneRoot = path.join(projectsDirectory, 'standalone');
	const workspaceRoot = path.join(projectsDirectory, 'workspace-system');

	tfs(projectsDirectory, ['init', 'standalone', '--theme', 'default', '--skip-install']);
	tfs(projectsDirectory, [
		'init',
		'workspace-system',
		'--theme',
		'default',
		'--workspace-package',
		'--skip-install',
	]);

	for (const projectRoot of [standaloneRoot, workspaceRoot]) {
		run(
			process.execPath,
			[path.join(toolchainDirectory, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', '.'],
			{
				cwd: projectRoot,
			}
		);
		tfs(projectRoot, ['build', '.']);
		tfs(projectRoot, ['validate', '.']);
		tfs(projectRoot, ['check', '.']);
	}

	assert.match(await readFile(path.join(standaloneRoot, 'dist/tokens.css'), 'utf8'), /--clr-/);
	assert.match(
		await readFile(path.join(workspaceRoot, 'generated/runtime/styles/typography.css'), 'utf8'),
		/\.text--prose/
	);

	return workspaceRoot;
}

async function packGeneratedDesignSystem(workspaceRoot) {
	const output = run('npm', ['pack', '--pack-destination', tarballDirectory], {
		cwd: workspaceRoot,
	});
	const tarballName = output.split('\n').at(-1);
	assert.ok(tarballName?.endsWith('.tgz'), 'Could not identify generated design-system tarball');
	const tarball = path.resolve(tarballDirectory, tarballName);
	const inventory = run('tar', ['-tzf', tarball]).split('\n');

	assert.ok(inventory.includes('package/generated/runtime/index.js'));
	assert.ok(inventory.includes('package/generated/runtime/styles/index.css'));
	assert.ok(inventory.includes('package/generated/runtime/styles/typography.module.css.d.ts'));
	assert.ok(inventory.every((file) => !file.includes('/review/')));
	assert.ok(inventory.every((file) => !file.includes('/design/')));

	return tarball;
}

async function buildBrowserConsumer(designSystemTarball, coreTarball) {
	const browserRoot = path.join(temporaryRoot, 'browser-app');
	await mkdir(path.join(browserRoot, 'src'), { recursive: true });
	await writeJson(path.join(browserRoot, 'package.json'), {
		name: 'tfs-browser-runtime-consumer',
		private: true,
		type: 'module',
		scripts: { build: 'vite build' },
		dependencies: {
			'@three-forma-styli/core': pathToFileURL(coreTarball).href,
			'workspace-system': pathToFileURL(designSystemTarball).href,
		},
		devDependencies: {
			typescript: '5.9.3',
			vite: '6.4.3',
		},
	});
	await writeFile(
		path.join(browserRoot, 'index.html'),
		'<main id="app"></main><script type="module" src="/src/main.ts"></script>\n'
	);
	await writeFile(
		path.join(browserRoot, 'src/main.ts'),
		`import 'workspace-system/styles.css';
import typographyClasses from 'workspace-system/typography.module.css';
import { nativeColorModes } from 'workspace-system/native-color-modes';
import { generateRuntimeColorTheme } from '@three-forma-styli/core/runtime';

const storedTheme = JSON.parse(JSON.stringify({
  polarity: 'negative',
  colors: {
    canvas: { l: 0.12, c: 0.02, h: 260 },
    ink: { l: 0.94, c: 0.25, h: 145 },
  },
}));
const generated = generateRuntimeColorTheme(storedTheme, {
  colorNames: ['canvas', 'ink'],
  alphaSchedule: { lo: 0.125 },
  luminance: {
    minDelta: 0.6,
    backgroundColors: ['canvas'],
    foregroundColors: ['ink'],
  },
});

const root = document.documentElement;
for (const [property, value] of Object.entries(generated.customProperties)) {
  root.style.setProperty(property, value);
}
root.dataset.runtimeValid = String(generated.luminance.deltaValid);
root.dataset.nativeModeCount = String(nativeColorModes.modes.length);
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app root');
app.className = typographyClasses.prose;
app.textContent = 'TFS browser consumer ready';
`
	);
	await writeJson(path.join(browserRoot, 'tsconfig.json'), {
		compilerOptions: {
			target: 'ES2022',
			module: 'ESNext',
			moduleResolution: 'Bundler',
			strict: true,
			noEmit: true,
			lib: ['ES2022', 'DOM'],
		},
		include: ['src'],
	});

	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: browserRoot });
	run(
		process.execPath,
		[path.join(browserRoot, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
		{
			cwd: browserRoot,
		}
	);
	run('npm', ['run', 'build'], { cwd: browserRoot });
	const html = await readFile(path.join(browserRoot, 'dist/index.html'), 'utf8');
	assert.match(html, /assets\/index-[^"']+\.js/);
	assert.match(html, /assets\/index-[^"']+\.css/);
	const builtFiles = (await readdir(path.join(browserRoot, 'dist'), { recursive: true })).map(
		(file) => path.join('dist', file)
	);
	const javascript = builtFiles.find((file) => file.endsWith('.js'));
	assert.ok(javascript, 'Vite did not emit a browser bundle');
	const bundle = await readFile(path.join(browserRoot, javascript), 'utf8');
	assert.match(bundle, /TFS browser consumer ready/);
	assert.doesNotMatch(bundle, /node:fs|fontkit|@inquirer|process\.cwd/);
}

try {
	const tarballs = await packTfsPackages();
	await installPackedToolchain(tarballs);
	const workspaceRoot = await exerciseScaffolds();
	const designSystemTarball = await packGeneratedDesignSystem(workspaceRoot);
	await buildBrowserConsumer(designSystemTarball, tarballs.core);

	console.log(
		'Real tarball installs, standalone/workspace scaffolds, generated-package packing and a production browser bundle all passed.'
	);
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}
