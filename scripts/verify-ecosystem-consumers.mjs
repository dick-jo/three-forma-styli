import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { buildNextConsumer } from './ecosystem/next-consumer.mjs';
import { run as runCommand } from './ecosystem/process.mjs';
import { buildSvelteConsumer } from './ecosystem/svelte-consumer.mjs';
import { buildTurborepoConsumer } from './ecosystem/turborepo-consumer.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'tfs-ecosystem-consumers-'));
const tarballDirectory = path.join(temporaryRoot, 'tarballs');
const toolchainDirectory = path.join(temporaryRoot, 'toolchain');
const projectsDirectory = path.join(toolchainDirectory, 'projects');
const releaseVersion = JSON.parse(
	await readFile(path.join(repositoryRoot, 'packages/core/package.json'), 'utf8')
).version;
const browserProofRequested = process.argv.includes('--browser');
const frameworkProofRequested = process.argv.includes('--frameworks');
const nextProofRequested = process.argv.includes('--next') || frameworkProofRequested;
const svelteProofRequested = process.argv.includes('--svelte') || frameworkProofRequested;
const monorepoProofRequested = process.argv.includes('--monorepo');

function run(command, args, options = {}) {
	return runCommand(command, args, {
		cwd: repositoryRoot,
		...options,
	});
}

async function writeJson(file, value) {
	await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fileDependency(file) {
	return `file:${file.replaceAll('\\', '/')}`;
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
				fileDependency(tarball),
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

function cliEntry() {
	return path.join(toolchainDirectory, 'node_modules/@three-forma-styli/cli/dist/index.js');
}

function tfs(projectDirectory, args) {
	return run(process.execPath, [cliEntry(), ...args], {
		cwd: projectDirectory,
	});
}

async function exerciseMachineCli(workspaceRoot) {
	const manifestPath = path.join(workspaceRoot, 'generated/build.manifest.json');
	const manifestBefore = await readFile(manifestPath);
	const dryRun = JSON.parse(tfs(workspaceRoot, ['build', '.', '--dry-run', '--json']));
	assert.deepEqual(
		{
			command: dryRun.command,
			status: dryRun.status,
			mode: dryRun.result?.mode,
			layout: dryRun.result?.plan?.output?.layout,
		},
		{ command: 'build', status: 'ok', mode: 'dry-run', layout: 'workspace-package' }
	);
	assert.ok(
		dryRun.result.plan.artifacts.some(
			(artifact) => artifact.path === 'runtime/styles/design-system.typography.module.css.d.ts'
		)
	);
	assert.deepEqual(
		await readFile(manifestPath),
		manifestBefore,
		'dry-run changed generated output'
	);

	for (const [args, expected] of [
		[['build', '.', '--unknown', '--json'], { exitCode: 2, id: 'TFS_CLI_USAGE' }],
		[['validate', './missing-project', '--json'], { exitCode: 1, id: 'TFS_VALIDATE_FAILED' }],
	]) {
		const result = spawnSync(process.execPath, [cliEntry(), ...args], {
			cwd: workspaceRoot,
			encoding: 'utf8',
		});
		assert.equal(result.status, expected.exitCode);
		assert.equal(result.stderr, '');
		const envelope = JSON.parse(result.stdout);
		assert.equal(envelope.exitCode, expected.exitCode);
		assert.equal(envelope.diagnostic.id, expected.id);
	}
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
		await readFile(
			path.join(workspaceRoot, 'generated/runtime/styles/design-system.typography.css'),
			'utf8'
		),
		/\.text--prose/
	);
	const workbench = JSON.parse(
		await readFile(path.join(workspaceRoot, 'generated/review/workbench.json'), 'utf8')
	);
	assert.equal(workbench.kind, 'three-forma-styli/workbench');
	assert.equal(workbench.schemaVersion, 2);
	assert.ok(workbench.labs.some((lab) => lab.kind === 'color' && lab.cases.length > 0));
	assert.ok(workbench.labs.some((lab) => lab.kind === 'typography' && lab.cases.length > 0));
	assert.ok(workbench.labs.some((lab) => lab.kind === 'shadows' && lab.cases.length > 0));
	assert.ok(workbench.labs.some((lab) => lab.kind === 'motion' && lab.cases.length > 0));
	const captures = JSON.parse(
		await readFile(path.join(workspaceRoot, 'generated/review/captures.json'), 'utf8')
	);
	assert.equal(captures.kind, 'three-forma-styli/review-captures');
	assert.equal(captures.systemFingerprint, workbench.systemFingerprint);
	assert.ok(captures.states.length > 0);
	assert.ok(
		captures.states.every(
			(state) =>
				typeof state.url === 'string' &&
				state.url.startsWith('./index.html?') &&
				state.viewport.width > 0 &&
				state.viewport.height > 0
		)
	);
	assert.match(
		await readFile(path.join(workspaceRoot, 'generated/review/index.html'), 'utf8'),
		/workbench\.js/
	);

	return workspaceRoot;
}

async function exerciseAuthoredShapeFixtures() {
	const sourceRoot = path.join(repositoryRoot, 'scripts/ecosystem/fixtures');
	const entries = await readdir(sourceRoot, { withFileTypes: true });
	const names = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(names, ['display', 'editorial', 'minimal']);

	for (const name of names) {
		const projectRoot = path.join(projectsDirectory, `authored-${name}`);
		await cp(path.join(sourceRoot, name), projectRoot, { recursive: true });
		tfs(projectRoot, ['build', '.']);
		tfs(projectRoot, ['validate', '.']);
		tfs(projectRoot, ['check', '.']);
	}

	assert.match(
		await readFile(path.join(projectsDirectory, 'authored-minimal/generated/tokens.css'), 'utf8'),
		/--clr-canvas/
	);
	assert.match(
		await readFile(
			path.join(projectsDirectory, 'authored-editorial/generated/typography.css'),
			'utf8'
		),
		/\.text--article/
	);
	assert.match(
		await readFile(
			path.join(projectsDirectory, 'authored-editorial/generated/typography.generated.ts'),
			'utf8'
		),
		/"article"/
	);
	const displayCss = await readFile(
		path.join(projectsDirectory, 'authored-display/generated/tokens.css'),
		'utf8'
	);
	assert.match(displayCss, /\[data-size-mode="stage"\]/);
	assert.match(displayCss, /--shadow-box-float/);
	assert.match(displayCss, /--motion-respond/);
}

async function packGeneratedDesignSystem(workspaceRoot) {
	const output = run('npm', ['pack', '--pack-destination', tarballDirectory], {
		cwd: workspaceRoot,
	});
	const tarballName = output.split('\n').at(-1);
	assert.ok(tarballName?.endsWith('.tgz'), 'Could not identify generated design-system tarball');
	const tarball = path.resolve(tarballDirectory, tarballName);
	const inventory = run('tar', ['-tzf', tarball])
		.split('\n')
		.map((file) => file.replaceAll('\\', '/'));

	assert.ok(inventory.includes('package/generated/runtime/index.js'));
	assert.ok(inventory.includes('package/generated/runtime/runtime-color-theme.js'));
	assert.ok(inventory.includes('package/generated/runtime/runtime-color-theme.d.ts'));
	assert.ok(inventory.includes('package/generated/runtime/styles/design-system.css'));
	assert.ok(
		inventory.includes('package/generated/runtime/styles/design-system.typography.module.css.d.ts')
	);
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
			'@three-forma-styli/core': fileDependency(coreTarball),
			'workspace-system': fileDependency(designSystemTarball),
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
import { typographyClassName } from 'workspace-system/typography';
import { nativeColorModes } from 'workspace-system/native-color-modes';
import { runtimeColorThemeConfig } from 'workspace-system/runtime-color-theme';
import {
  enforceRuntimeColorTheme,
  generateRuntimeColorTheme,
} from '@three-forma-styli/core/runtime';

const storedTheme = JSON.parse(JSON.stringify({
  polarity: 'negative',
  colors: nativeColorModes.modes.find((mode) => mode.isDefault)?.source.colors,
}));
const generated = enforceRuntimeColorTheme(storedTheme, runtimeColorThemeConfig);

let hostilePayloadRejected = false;
try {
  generateRuntimeColorTheme({
    polarity: 'negative',
    colors: { ...storedTheme.colors, extra: {} },
  }, runtimeColorThemeConfig);
} catch {
  hostilePayloadRejected = true;
}

const invalidLuminance = JSON.parse(JSON.stringify(storedTheme));
for (const color of Object.values(invalidLuminance.colors) as Array<{ l: number }>) color.l = 0.5;
let luminanceConstraintRejected = false;
try {
  enforceRuntimeColorTheme(invalidLuminance, runtimeColorThemeConfig);
} catch {
  luminanceConstraintRejected = true;
}
const measuredInvalid = generateRuntimeColorTheme(invalidLuminance, runtimeColorThemeConfig);

const root = document.documentElement;
for (const [property, value] of Object.entries(generated.customProperties)) {
  root.style.setProperty(property, value);
}
root.dataset.runtimeValid = String(generated.luminance.deltaValid);
root.dataset.nativeModeCount = String(nativeColorModes.modes.length);
root.dataset.hostilePayloadRejected = String(hostilePayloadRejected);
root.dataset.luminanceConstraintRejected = String(luminanceConstraintRejected);
root.dataset.measuredInvalidLuminance = String(measuredInvalid.luminance.deltaValid);
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app root');
app.className = typographyClassName({ role: 'prose' }, typographyClasses);
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
	const compressedBytes = gzipSync(bundle).byteLength;
	assert.ok(
		compressedBytes < 20_000,
		`Browser consumer JavaScript unexpectedly grew to ${compressedBytes} gzip bytes`
	);

	if (browserProofRequested) {
		await runBrowserProof(browserRoot);
	}
}

const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.woff2': 'font/woff2',
};

async function startStaticServer(rootDirectory) {
	const server = createServer(async (request, response) => {
		try {
			const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
			const relativePath =
				requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
			const filePath = path.resolve(rootDirectory, relativePath);
			if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
				response.writeHead(403).end('Forbidden');
				return;
			}
			const body = await readFile(filePath);
			response.writeHead(200, {
				'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
			});
			response.end(body);
		} catch {
			response.writeHead(404).end('Not found');
		}
	});

	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	assert.ok(address && typeof address === 'object');
	return {
		url: `http://127.0.0.1:${address.port}`,
		close: () =>
			new Promise((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve()))
			),
	};
}

async function runBrowserProof(browserRoot) {
	const { chromium } = await import('@playwright/test');
	const server = await startStaticServer(path.join(browserRoot, 'dist'));
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const failures = [];
		page.on('console', (message) => {
			if (message.type() === 'error' || message.type() === 'warning') {
				failures.push(`console.${message.type()}: ${message.text()}`);
			}
		});
		page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
		await page.goto(server.url, { waitUntil: 'networkidle' });

		const evidence = await page.evaluate(() => {
			const app = document.querySelector('#app');
			if (!(app instanceof HTMLElement)) throw new Error('Missing rendered app');
			const style = getComputedStyle(app);
			return {
				text: app.textContent,
				fontSize: style.fontSize,
				fontFamily: style.fontFamily,
				fontWeight: style.fontWeight,
				typographyClassCount: app.classList.length,
				runtimeValid: document.documentElement.dataset.runtimeValid,
				nativeModeCount: document.documentElement.dataset.nativeModeCount,
				hostilePayloadRejected: document.documentElement.dataset.hostilePayloadRejected,
				luminanceConstraintRejected: document.documentElement.dataset.luminanceConstraintRejected,
				measuredInvalidLuminance: document.documentElement.dataset.measuredInvalidLuminance,
				canvas: document.documentElement.style.getPropertyValue('--clr-bg'),
				oklchSupported: CSS.supports('color', 'oklch(0.8 0.2 145)'),
			};
		});

		assert.deepEqual(failures, []);
		assert.equal(evidence.text, 'TFS browser consumer ready');
		assert.equal(evidence.runtimeValid, 'true');
		assert.equal(evidence.nativeModeCount, '1');
		assert.equal(evidence.hostilePayloadRejected, 'true');
		assert.equal(evidence.luminanceConstraintRejected, 'true');
		assert.equal(evidence.measuredInvalidLuminance, 'false');
		assert.equal(evidence.canvas, 'oklch(0.2603 0.0000 129.63)');
		assert.equal(evidence.oklchSupported, true);
		assert.notEqual(evidence.fontSize, '16px');
		assert.ok(evidence.fontFamily.length > 0);
		assert.equal(evidence.fontWeight, '400');
		assert.equal(evidence.typographyClassCount, 2);
	} finally {
		await browser.close();
		await server.close();
	}
}

async function runWorkbenchBrowserProof(workspaceRoot) {
	const { chromium } = await import('@playwright/test');
	const workbenchPath = path.join(workspaceRoot, 'generated/review/workbench.json');
	const workbench = JSON.parse(await readFile(workbenchPath, 'utf8'));
	const typographyLab = workbench.labs.find((lab) => lab.kind === 'typography');
	const typographyCase = typographyLab?.cases.find(
		(reviewCase) => reviewCase.role === 'prose' && reviewCase.variant === null
	);
	const motionCase = workbench.labs.find((lab) => lab.kind === 'motion')?.cases[0];
	assert.ok(typographyCase, 'Generated Workbench omitted the prose base typography case');
	assert.ok(motionCase, 'Generated Workbench omitted a motion case');
	typographyCase.font.family = '__tfs-missing-primary';
	typographyCase.font.adjustedFallback = '__tfs-missing-adjusted';
	await writeJson(workbenchPath, workbench);

	const server = await startStaticServer(path.join(workspaceRoot, 'generated'));
	const capturePlan = JSON.parse(
		await readFile(path.join(workspaceRoot, 'generated/review/captures.json'), 'utf8')
	);
	const motionCapturePreferences = capturePlan.states
		.filter((state) => state.lab === 'motion')
		.map((state) => state.motionPreference);
	assert.ok(motionCapturePreferences.includes('no-preference'));
	assert.ok(motionCapturePreferences.includes('reduce'));
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		const failures = [];
		page.on('console', (message) => {
			if (message.type() === 'error' || message.type() === 'warning') {
				failures.push(`console.${message.type()}: ${message.text()}`);
			}
		});
		page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
		await page.goto(`${server.url}/review/index.html`, { waitUntil: 'networkidle' });
		await page.locator('html[data-tfs-workbench-ready="true"]').waitFor();

		const systemOverview = page.locator('.system-overview');
		await systemOverview.waitFor();
		assert.equal(await systemOverview.locator('.overview-section').count(), 5);
		assert.ok((await systemOverview.locator('.matrix-card').count()) > 5);
		const labNavigation = page.locator('.navigation > nav');

		await labNavigation.getByRole('button', { name: /color/i }).click();
		const colorMatrix = page.locator('.case-matrix[data-lab="color"]');
		await colorMatrix.waitFor();
		assert.ok((await colorMatrix.locator('.matrix-card').count()) > 1);
		assert.equal(new URL(page.url()).searchParams.get('view'), 'matrix');
		await colorMatrix.locator('.matrix-card').first().click();
		await page.getByRole('spinbutton', { name: 'luminance value' }).fill('0.31');
		await page.getByText('1 edits', { exact: true }).waitFor();
		assert.match(await page.locator('.color-hero').getAttribute('style'), /oklch\(0\.31 /);
		await page.getByRole('button', { name: 'discard all edits' }).click();

		await labNavigation.getByRole('button', { name: /typography/i }).click();
		const typographyMatrix = page.locator('.case-matrix[data-lab="typography"]');
		await typographyMatrix.waitFor();
		assert.ok((await typographyMatrix.locator('.matrix-card').count()) > 1);
		await typographyMatrix.locator('.matrix-card').filter({ hasText: 'prose / base' }).click();
		const fallbackEvidence = page.locator('.type-tools output');
		await fallbackEvidence
			.filter({ hasText: /primary face unavailable: __tfs-missing-primary/ })
			.waitFor();
		assert.doesNotMatch((await fallbackEvidence.textContent()) ?? '', /(?:width|lines) Δ/);
		const lineHeight = page.getByRole('spinbutton').first();
		await lineHeight.fill('1.3');
		await page.getByText('1 edits', { exact: true }).waitFor();
		await page.getByRole('button', { name: 'compare', exact: true }).click();
		const comparison = page.getByTestId('baseline-draft-comparison');
		await comparison.waitFor();
		assert.equal(await comparison.locator('.comparison-frame').count(), 2);
		const comparisonSamples = comparison.locator('.type-short');
		assert.equal(await comparisonSamples.count(), 2);
		assert.notEqual(
			await comparisonSamples.nth(0).evaluate((element) => getComputedStyle(element).lineHeight),
			await comparisonSamples.nth(1).evaluate((element) => getComputedStyle(element).lineHeight)
		);
		assert.equal(new URL(page.url()).searchParams.get('view'), 'compare');
		await page.getByRole('button', { name: 'reset case' }).click();
		await page.getByRole('button', { name: 'case', exact: true }).waitFor();
		await page.getByText('0 edits', { exact: true }).waitFor();
		await page.getByRole('button', { name: 'Undo draft' }).click();
		await page.getByText('1 edits', { exact: true }).waitFor();
		await page.getByRole('button', { name: 'discard all edits' }).click();
		await page.getByLabel('size mode', { exact: true }).selectOption('large');
		await page.getByRole('spinbutton', { name: 'line height value' }).fill('1.31');
		await page.getByText('1 edits', { exact: true }).waitFor();
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'export', exact: true }).click();
		const download = await downloadPromise;
		const patch = JSON.parse(await readFile(await download.path(), 'utf8'));
		assert.equal(patch.operations.length, 1);
		assert.equal(
			patch.operations[0].path,
			'/typography/roles/prose/modeOverrides/large/base/lineHeight'
		);
		await page.getByRole('button', { name: 'discard all edits' }).click();
		await page.getByText('0 edits', { exact: true }).waitFor();
		await page.getByTestId('patch-input').setInputFiles({
			name: 'tfs.review.patch.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(patch)),
		});
		await page.getByText('Imported 1 reviewed edit', { exact: true }).waitFor();
		await page.getByText('1 edits', { exact: true }).waitFor();
		assert.equal(
			await page.getByRole('spinbutton', { name: 'line height value' }).inputValue(),
			'1.31'
		);
		await page.getByRole('button', { name: 'discard all edits' }).click();
		const foreignPatch = { ...patch, systemFingerprint: 'foreign-system' };
		await page.getByTestId('patch-input').setInputFiles({
			name: 'foreign.review.patch.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(foreignPatch)),
		});
		await page
			.getByText('Review patch belongs to a different generated design system', { exact: true })
			.waitFor();
		await page.getByText('0 edits', { exact: true }).waitFor();

		await labNavigation.getByRole('button', { name: /motion/i }).click();
		const motionMatrix = page.locator('.case-matrix[data-lab="motion"]');
		await motionMatrix.waitFor();
		assert.ok((await motionMatrix.locator('.matrix-card').count()) > 1);
		await motionMatrix.locator('.matrix-card').first().click();
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		assert.equal(
			await page.evaluate(
				(token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
				`--${motionCase.token}-duration`
			),
			`${motionCase.duration.milliseconds}ms`
		);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		assert.equal(
			await page.evaluate(
				(token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
				`--${motionCase.token}-duration`
			),
			`${motionCase.reducedMotion.duration.milliseconds}ms`
		);
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const motionObject = page.locator('.motion-object');
		assert.equal(
			await motionObject.evaluate((element) => getComputedStyle(element).transform),
			'none'
		);
		await page.getByRole('button', { name: 'play once' }).click();
		await page.waitForTimeout(80);
		assert.notEqual(
			await page
				.locator('.motion-object')
				.evaluate((element) => getComputedStyle(element).transform),
			'none'
		);
		await page.getByRole('button', { name: 'reduced', exact: true }).click();
		assert.equal(new URL(page.url()).searchParams.get('motion'), 'reduce');
		assert.equal(
			await page.locator('.motion-preference span').textContent(),
			motionCase.reducedMotion.behavior
		);
		assert.equal(
			await page.locator('.motion-meta strong').first().textContent(),
			`${motionCase.reducedMotion.duration.milliseconds}ms`
		);
		await labNavigation.getByRole('button', { name: /typography/i }).click();
		await page
			.locator('.case-matrix[data-lab="typography"] .matrix-card')
			.filter({ hasText: 'prose / base' })
			.click();

		const evidence = await page.evaluate(() => {
			const canvas = document.querySelector('[data-testid="review-canvas"]');
			const sample = document.querySelector('.type-short');
			if (!(canvas instanceof HTMLElement) || !(sample instanceof HTMLElement)) {
				throw new Error('Missing Workbench canvas or typography sample');
			}
			return {
				title: document.title,
				lab: new URL(location.href).searchParams.get('lab'),
				caseId: new URL(location.href).searchParams.get('case'),
				sizeMode: new URL(location.href).searchParams.get('size'),
				lineHeight: getComputedStyle(sample).lineHeight,
				fontSizeToken: canvas.style.getPropertyValue('--fs-2'),
			};
		});

		assert.deepEqual(failures, []);
		assert.equal(evidence.title, 'TFS workbench');
		assert.equal(evidence.lab, 'typography');
		assert.equal(evidence.caseId, 'typography--large--prose--base');
		assert.equal(evidence.sizeMode, 'large');
		assert.ok(Number.parseFloat(evidence.lineHeight) > 0);
		assert.ok(evidence.fontSizeToken.length > 0);

		const capture = capturePlan.states.find(
			(state) => state.lab === 'typography' && state.sizeMode === 'large'
		);
		assert.ok(capture, 'Generated capture plan omitted the large typography state');
		await page.setViewportSize({
			width: capture.viewport.width,
			height: capture.viewport.height,
		});
		await page.goto(`${server.url}/review/${capture.url.slice(2)}`, {
			waitUntil: 'networkidle',
		});
		await page.locator('html[data-tfs-workbench-ready="true"]').waitFor();
		assert.equal(new URL(page.url()).searchParams.get('case'), capture.caseId);
		assert.equal(new URL(page.url()).searchParams.get('size'), capture.sizeMode);
		assert.deepEqual(await page.viewportSize(), {
			width: capture.viewport.width,
			height: capture.viewport.height,
		});
	} finally {
		await browser.close();
		await server.close();
	}
}

try {
	const tarballs = await packTfsPackages();
	await installPackedToolchain(tarballs);
	const workspaceRoot = await exerciseScaffolds();
	await exerciseAuthoredShapeFixtures();
	await exerciseMachineCli(workspaceRoot);
	const designSystemTarball = await packGeneratedDesignSystem(workspaceRoot);
	await buildBrowserConsumer(designSystemTarball, tarballs.core);
	if (nextProofRequested) {
		await buildNextConsumer({ temporaryRoot, designSystemTarball });
	}
	if (svelteProofRequested) {
		await buildSvelteConsumer({ temporaryRoot, designSystemTarball });
	}
	if (monorepoProofRequested) {
		await buildTurborepoConsumer({ temporaryRoot, workspaceRoot, tarballs });
	}
	if (browserProofRequested) {
		await runWorkbenchBrowserProof(workspaceRoot);
	}

	console.log(
		[
			'Real tarball installs, standalone/workspace scaffolds, generated-package packing',
			'a production browser bundle',
			nextProofRequested ? 'a production Next 16 build' : undefined,
			svelteProofRequested ? 'a production Svelte 5 build' : undefined,
			monorepoProofRequested ? 'a pnpm/Turborepo workspace build and check graph' : undefined,
			browserProofRequested ? 'Chromium runtime and Workbench interactions' : undefined,
			'all passed.',
		]
			.filter(Boolean)
			.join(', ')
	);
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}
