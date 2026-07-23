import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { typography as defaultTypography } from '@three-forma-styli/themes/default';
import { defineTfsProject } from '../project.js';
import { buildProject, checkProject, planProject } from '../project-build.js';
import { buildWorkspacePackageProject } from './build.js';
import { validateProjectOutput } from '../validate-output.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

// Tiny synthetic regular TTF covering the compiler's versioned calibration corpus.
const TEST_FONT_BASE64 = [
	'AAEAAAAKAIAAAwAgT1MvMke8RmIAAAEoAAAAYGNtYXAAzQA8AAABxAAAADxnbHlm16fXiwAAAjwAAAKkaGVhZC4Uo9oAAACsAAAA',
	'NmhoZWEEsgJaAAAA5AAAACRobXR4AlgAAAAAAYgAAAA6bG9jYQk+CJUAAAIAAAAAOm1heHAAHgAGAAABCAAAACBuYW1lkilG8AAA',
	'BOAAAAG2cG9zdAADAAAAAAaYAAAAIAABAAAAAQAAw+hol18PPPUAAQPoAAAAAOaGMB8AAAAA5oYwHwAyAAABwgK8AAAAAwACAAAA',
	'AAAAAAEAAAMg/zgAAAJYAAAAyAGQAAEAAAAAAAAAAAAAAAAAAAABAAEAAAAcAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwJY',
	'AZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAPz8/PwAAACAAegMg/zgAAAMgAMgA',
	'AAAAAAAAAAH0ArwAAAAgAAACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
	'AAAAAAACAAAAAwAAABQAAwABAAAAFAAEACgAAAAGAAQAAQACACAAev//AAAAIABh////4f+hAAEAAAAAAAAAAAAAAAAADQAaACcA',
	'NABBAE4AWwBoAHUAggCPAJwAqQC2AMMA0ADdAOoA9wEEAREBHgErATgBRQFSAAAAAQAyAAABwgK8AAMAADMhESEyAZD+cAK8AAAB',
	'ADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEyAZD+cAK8',
	'AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEyAZD+',
	'cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEy',
	'AZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMh',
	'ESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMA',
	'ADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8',
	'AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAAB',
	'wgK8AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAy',
	'AAABwgK8AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAAADACWAAEAAAAAAAEADQAAAAEAAAAAAAIA',
	'BwANAAEAAAAAAAMAGQAUAAEAAAAAAAQAFQAtAAEAAAAAAAUACwBCAAEAAAAAAAYAEwBNAAMAAQQJAAEAGgBgAAMAAQQJAAIADgB6',
	'AAMAAQQJAAMAMgCIAAMAAQQJAAQAKgC6AAMAAQQJAAUAFgDkAAMAAQQJAAYAJgD6VEZTIFRlc3QgU2Fuc1JlZ3VsYXJURlMgVGVz',
	'dCBTYW5zIFJlZ3VsYXIgMS4wVEZTIFRlc3QgU2FucyBSZWd1bGFyVmVyc2lvbiAxLjBURlNUZXN0U2Fucy1SZWd1bGFyAFQARgBT',
	'ACAAVABlAHMAdAAgAFMAYQBuAHMAUgBlAGcAdQBsAGEAcgBUAEYAUwAgAFQAZQBzAHQAIABTAGEAbgBzACAAUgBlAGcAdQBsAGEA',
	'cgAgADEALgAwAFQARgBTACAAVABlAHMAdAAgAFMAYQBuAHMAIABSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAxAC4AMABU',
	'AEYAUwBUAGUAcwB0AFMAYQBuAHMALQBSAGUAZwB1AGwAYQByAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
].join('');

function colors() {
	return {
		alphaSchedule: { min: 0.1, max: 0.9 },
		modes: [
			{
				name: 'night',
				isDefault: true as const,
				metadata: { label: 'Night', polarity: 'negative' },
				tokens: {
					pri: { mode: 'oklch' as const, l: 0.7, c: 0.2, h: 30 },
					ink: { mode: 'oklch' as const, l: 0.95, c: 0, h: 0 },
				},
			},
			{
				name: 'paper',
				metadata: { label: 'Paper', polarity: 'positive' },
				tokens: { ink: { mode: 'oklch' as const, l: 0.1, c: 0, h: 0 } },
				alphaSchedule: { min: 0.2, max: 0.8 },
			},
		],
	};
}

function hostManifest(overrides: Record<string, unknown> = {}) {
	return {
		name: '@fixture/design-system',
		version: '1.0.0',
		type: 'module',
		files: ['generated/runtime'],
		sideEffects: ['./generated/runtime/styles/*.css'],
		exports: {
			'.': {
				types: './generated/runtime/index.d.ts',
				import: './generated/runtime/index.js',
			},
			'./system': {
				types: './generated/runtime/system.d.ts',
				import: './generated/runtime/system.js',
			},
			'./typography': {
				types: './generated/runtime/typography.d.ts',
				import: './generated/runtime/typography.js',
			},
			'./native-color-modes': {
				types: './generated/runtime/native-color-modes.d.ts',
				import: './generated/runtime/native-color-modes.js',
			},
			'./styles.css': './generated/runtime/styles/index.css',
			'./tokens.css': './generated/runtime/styles/tokens.css',
			'./typography.css': './generated/runtime/styles/typography.css',
			'./typography.module.css': {
				types: './generated/runtime/styles/typography.module.css.d.ts',
				default: './generated/runtime/styles/typography.module.css',
			},
			'./package.json': './package.json',
			'./unrelated': './src/human.js',
		},
		...overrides,
	};
}

async function fixture(manifest = hostManifest()): Promise<{
	directory: string;
	configPath: string;
	packagePath: string;
}> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-workspace-test-'));
	temporaryDirectories.push(directory);
	const configPath = path.join(directory, 'tfs.config.ts');
	const packagePath = path.join(directory, 'package.json');
	await fs.writeFile(configPath, 'export default {};\n');
	await fs.writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
	await fs.ensureDir(path.join(directory, 'src'));
	await fs.writeFile(path.join(directory, 'src/human.js'), 'export const human = true;\n');
	return { directory, configPath, packagePath };
}

function fullProject() {
	return defineTfsProject({
		system: { colors: colors(), typography: defaultTypography },
		output: {
			layout: 'workspace-package',
			directory: './generated',
			targets: { runtime: true, review: true, design: true },
		},
	});
}

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)));
});

describe('workspace-package build', () => {
	it('reports the validated package graph and exact exports without writing', async () => {
		const { directory, configPath, packagePath } = await fixture();
		const before = await fs.readFile(packagePath);
		const plan = await planProject(fullProject(), configPath);

		expect(plan.output).toEqual({
			layout: 'workspace-package',
			directory: path.join(directory, 'generated'),
			ownership: 'atomic-directory',
		});
		expect(plan.hostPackage).toMatchObject({
			manifest: packagePath,
			generatedFromHost: 'generated',
			requiredExports: expect.arrayContaining([
				{
					subpath: './typography.module.css',
					target: {
						types: './generated/runtime/styles/typography.module.css.d.ts',
						default: './generated/runtime/styles/typography.module.css',
					},
				},
			]),
		});
		expect(plan.artifacts.map((artifact) => artifact.path)).toEqual(
			expect.arrayContaining([
				'build.manifest.json',
				'runtime/styles/index.css',
				'review/index.html',
				'review/workbench.json',
				'design/tokens.dtcg.json',
			])
		);
		expect(await fs.pathExists(path.join(directory, 'generated'))).toBe(false);
		expect(await fs.readFile(packagePath)).toEqual(before);
	});

	it('emits the canonical target tree deterministically without touching package.json', async () => {
		const { directory, configPath, packagePath } = await fixture();
		const before = await fs.readFile(packagePath);
		const first = await buildProject(fullProject(), configPath);
		const firstManifest = await fs.readFile(
			path.join(first.outputDirectory, 'build.manifest.json')
		);
		const second = await buildProject(fullProject(), configPath);
		const secondManifest = await fs.readFile(
			path.join(second.outputDirectory, 'build.manifest.json')
		);

		expect(await fs.readFile(packagePath)).toEqual(before);
		expect(secondManifest).toEqual(firstManifest);
		expect(second.files).toEqual(
			expect.arrayContaining([
				'runtime/index.js',
				'runtime/index.d.ts',
				'runtime/system.js',
				'runtime/system.d.ts',
				'runtime/typography.js',
				'runtime/typography.d.ts',
				'runtime/native-color-modes.js',
				'runtime/native-color-modes.d.ts',
				'runtime/styles/index.css',
				'runtime/styles/tokens.css',
				'runtime/styles/typography.css',
				'runtime/styles/typography.module.css',
				'runtime/styles/typography.module.css.d.ts',
				'review/index.html',
				'review/workbench.css',
				'review/workbench.js',
				'review/workbench.json',
				'review/system.css',
				'design/tokens.dtcg.json',
				'design/figma.variables.json',
				'build.manifest.json',
			])
		);
		const runtimePath = path.join(directory, 'generated/runtime/index.js');
		const imported = await execFileAsync(process.execPath, [
			'--input-type=module',
			'--eval',
			'import(process.argv[1]).then((module) => process.stdout.write(JSON.stringify(module)))',
			runtimePath,
		]);
		const runtime = JSON.parse(imported.stdout) as Record<string, unknown>;
		expect(runtime).toHaveProperty('tfsSystem');
		expect(runtime).toHaveProperty('typography');
		expect(runtime).toHaveProperty('nativeColorModes');
		const native = runtime.nativeColorModes as {
			defaultMode: string;
			colorNames: string[];
			alphaSchedule: unknown;
			modes: Array<{
				name: string;
				source: { colors: Record<string, unknown>; alphaSchedule: unknown };
			}>;
		};
		expect(native.defaultMode).toBe('night');
		expect(native.colorNames).toEqual(['pri', 'ink']);
		expect(native.modes.map((mode) => mode.name)).toEqual(['night', 'paper']);
		expect(Object.keys(native.modes[0]!.source.colors)).toEqual(['pri', 'ink']);
		expect(Object.keys(native.modes[1]!.source.colors)).toEqual(['ink']);
		expect(native.modes[1]!.source.alphaSchedule).toEqual({ min: 0.2, max: 0.8 });
		const manifest = JSON.parse(secondManifest.toString('utf8'));
		expect(manifest).toMatchObject({ schemaVersion: 2, layout: 'workspace-package' });
		for (const [artifact, dependencies] of Object.entries(
			manifest.dependencies as Record<string, string[]>
		)) {
			expect(
				new Set(dependencies).size,
				`${artifact} contains duplicate artifact dependencies`
			).toBe(dependencies.length);
		}
		expect(manifest.targets.runtime.entrypoints).not.toHaveProperty('./design/dtcg');
	});

	it('applies one generator policy across runtime, review and design targets', async () => {
		const { directory, configPath } = await fixture();
		const project = defineTfsProject({
			generator: {
				prefixes: { color: 'palette', typographyRole: 'copy' },
				colorFormat: { alphaModifier: 'opacity' },
			},
			system: { colors: colors(), typography: defaultTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: { runtime: true, review: true, design: true },
			},
		});
		await buildProject(project, configPath);
		const generated = path.join(directory, 'generated');
		const read = (file: string) => fs.readFile(path.join(generated, file), 'utf8');
		const runtime = await read('runtime/styles/tokens.css');
		const review = await read('review/system.css');
		const dtcg = JSON.parse(await read('design/tokens.dtcg.json'));

		for (const css of [runtime, review]) {
			expect(css).toContain('--palette-pri-opacity-min:');
			expect(css).toContain('--copy-prose-font-size:');
		}
		expect(dtcg.color).toHaveProperty('palette-pri-opacity-min');
	});

	it('emits global and module shadow helpers as explicit package surfaces', async () => {
		const manifest = hostManifest({
			exports: {
				'./styles.css': './generated/runtime/styles/index.css',
				'./tokens.css': './generated/runtime/styles/tokens.css',
				'./shadows.css': './generated/runtime/styles/shadows.css',
				'./shadows.module.css': {
					types: './generated/runtime/styles/shadows.module.css.d.ts',
					default: './generated/runtime/styles/shadows.module.css',
				},
				'./package.json': './package.json',
				'./unrelated': './src/human.js',
			},
		});
		const { directory, configPath } = await fixture(manifest);
		const project = defineTfsProject({
			system: {
				colors: colors(),
				shadows: {
					unit: 'px',
					box: {
						elevation: {
							base: [{ x: 0, y: 4, blur: 16, color: { color: 'ink', alpha: 'min' } }],
						},
					},
					text: {
						glow: {
							base: [{ x: 0, y: 0, blur: 8, color: { color: 'pri', alpha: 'min' } }],
						},
					},
				},
			},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: {
					runtime: {
						css: {
							entry: true,
							tokens: true,
							shadows: true,
							shadowModule: true,
						},
					},
					review: { shadowSpecimen: true },
				},
			},
		});
		const result = await buildProject(project, configPath);

		expect(result.files).toEqual(
			expect.arrayContaining([
				'runtime/styles/shadows.css',
				'runtime/styles/shadows.module.css',
				'runtime/styles/shadows.module.css.d.ts',
				'review/shadows.html',
			])
		);
		expect(
			await fs.readFile(path.join(directory, 'generated/runtime/styles/shadows.css'), 'utf8')
		).toContain('.shadow--box-elevation {');
		expect(
			await fs.readFile(path.join(directory, 'generated/runtime/styles/shadows.module.css'), 'utf8')
		).toContain('.text-glow {');
		expect(
			await fs.readFile(path.join(directory, 'generated/review/shadows.html'), 'utf8')
		).toContain('class="box-stage clipped"');
	});

	it('checks a package-shaped tree without replacing or repairing it', async () => {
		const { directory, configPath, packagePath } = await fixture();
		const project = fullProject();
		const built = await buildProject(project, configPath);
		const packageBefore = await fs.readFile(packagePath);
		await expect(checkProject(project, configPath)).resolves.toEqual(built);

		const workbenchPath = path.join(built.outputDirectory, 'review/index.html');
		await fs.remove(workbenchPath);
		await fs.writeFile(path.join(built.outputDirectory, 'unexpected.txt'), 'leave me alone\n');
		await expect(checkProject(project, configPath)).rejects.toThrow(
			/missing review\/index\.html[\s\S]*unexpected unexpected\.txt/
		);
		expect(await fs.pathExists(workbenchPath)).toBe(false);
		expect(await fs.readFile(path.join(built.outputDirectory, 'unexpected.txt'), 'utf8')).toBe(
			'leave me alone\n'
		);
		expect(await fs.readFile(packagePath)).toEqual(packageBefore);
	});

	it('validates committed package artifacts and host wiring without regenerating', async () => {
		const { configPath, packagePath } = await fixture();
		const project = fullProject();
		const built = await buildProject(project, configPath);
		await expect(validateProjectOutput(project, configPath)).resolves.toEqual(built);

		const manifest = await fs.readJson(packagePath);
		await fs.writeJson(packagePath, { ...manifest, description: 'host changed' }, { spaces: 2 });
		await expect(validateProjectOutput(project, configPath)).rejects.toThrow(
			/records a stale host package manifest/
		);
		expect(await fs.pathExists(path.join(built.outputDirectory, 'runtime/index.js'))).toBe(true);
	});

	it('accepts explicit target subsets and requires only their exact exports', async () => {
		const manifest = hostManifest({
			files: ['generated/runtime'],
			sideEffects: ['./generated/runtime/styles/tokens.css'],
			exports: {
				'./system': {
					types: './generated/runtime/system.d.ts',
					import: './generated/runtime/system.js',
				},
				'./tokens.css': './generated/runtime/styles/tokens.css',
				'./package.json': './package.json',
			},
		});
		const { directory, configPath } = await fixture(manifest);
		const project = defineTfsProject({
			system: { colors: colors() },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				hostPackage: { rootExport: false },
				targets: {
					runtime: {
						css: { entry: false, tokens: true },
						contracts: { system: true, typography: false, nativeColorModes: false },
					},
					design: true,
				},
			},
		});
		const result = await buildProject(project, configPath);
		expect(result.files).toContain('runtime/system.js');
		expect(result.files).toContain('runtime/styles/tokens.css');
		expect(result.files).toContain('design/tokens.dtcg.json');
		expect(result.files).not.toContain('runtime/index.js');
		expect(await fs.pathExists(path.join(directory, 'generated/review'))).toBe(false);
	});

	it('accepts a private host package without a files allowlist', async () => {
		const { configPath } = await fixture(hostManifest({ private: true, files: undefined }));
		await expect(buildProject(fullProject(), configPath)).resolves.toBeDefined();
	});

	it('rejects stale exports into targets removed from the current generated plan', async () => {
		const manifest = hostManifest();
		const { configPath } = await fixture(manifest);
		const project = defineTfsProject({
			system: { colors: colors() },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				hostPackage: { rootExport: false },
				targets: { runtime: { css: { entry: true, tokens: true }, contracts: false } },
			},
		});

		await expect(buildProject(project, configPath)).rejects.toThrow(
			/export \. points into TFS-owned output[\s\S]*not generated by the current project plan/
		);
	});

	it('rejects a targetless no-op project', async () => {
		const { configPath } = await fixture();
		const project = defineTfsProject({
			system: {},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: {},
			},
		});
		await expect(buildProject(project, configPath)).rejects.toThrow(
			'enable a runtime, review, or design target'
		);
	});

	it('treats nested css and contract objects as enabled defaults with explicit false opt-outs', async () => {
		const { configPath } = await fixture();
		const project = defineTfsProject({
			system: { colors: colors(), typography: defaultTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: { runtime: { css: {}, contracts: {} } },
			},
		});
		const result = await buildProject(project, configPath);
		expect(result.files).toEqual(
			expect.arrayContaining([
				'runtime/styles/index.css',
				'runtime/styles/tokens.css',
				'runtime/styles/typography.css',
				'runtime/styles/typography.module.css',
				'runtime/system.js',
				'runtime/typography.js',
				'runtime/native-color-modes.js',
			])
		);
	});

	it.each([
		['module mode', { type: 'commonjs' }, 'must declare "type": "module"'],
		[
			'exact export',
			{
				exports: {
					...hostManifest().exports,
					'./system': {
						types: './wrong.d.ts',
						import: './generated/runtime/system.js',
					},
				},
			},
			'export ./system.types must be',
		],
		['CSS side effects', { sideEffects: false }, 'sideEffects must be true or an array'],
		[
			'CSS side effect directory',
			{ sideEffects: ['./generated/runtime/styles'] },
			'does not cover',
		],
		['published files', { files: ['src'] }, 'files does not publish'],
		[
			'publishable package without files',
			{ files: undefined },
			'must declare an explicit files array',
		],
		[
			'conditional export ambiguity',
			{
				exports: {
					...hostManifest().exports,
					'.': {
						types: './generated/runtime/index.d.ts',
						browser: './src/human.js',
						import: './generated/runtime/index.js',
					},
				},
			},
			'conditions must be exactly',
		],
	])('rejects an invalid human-owned host contract: %s', async (_name, override, message) => {
		const { configPath } = await fixture(hostManifest(override));
		await expect(buildProject(fullProject(), configPath)).rejects.toThrow(message);
	});

	it('detects a host-manifest race and leaves the previous output intact', async () => {
		const { configPath, packagePath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		const previous = await fs.readFile(path.join(directory, 'generated/build.manifest.json'));
		await expect(
			buildWorkspacePackageProject(fullProject(), configPath, {
				beforeHostRecheck: async () => {
					await fs.appendFile(packagePath, '\n');
				},
			})
		).rejects.toThrow('changed while TFS was building');
		expect(await fs.readFile(path.join(directory, 'generated/build.manifest.json'))).toEqual(
			previous
		);
	});

	it('rechecks the host after installation while retaining the rollback backup', async () => {
		const { configPath, packagePath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		const previous = await fs.readFile(path.join(directory, 'generated/build.manifest.json'));
		await expect(
			buildWorkspacePackageProject(fullProject(), configPath, {
				afterInstallBeforeValidation: async () => {
					await fs.appendFile(packagePath, '\n');
				},
			})
		).rejects.toThrow('changed while TFS was building');
		expect(await fs.readFile(path.join(directory, 'generated/build.manifest.json'))).toEqual(
			previous
		);
	});

	it('restores the previous output on an injected stage-install failure', async () => {
		const { configPath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		const previous = await fs.readFile(path.join(directory, 'generated/build.manifest.json'));
		await expect(
			buildWorkspacePackageProject(fullProject(), configPath, {
				afterBackupBeforeInstall: () => {
					throw new Error('injected install failure');
				},
			})
		).rejects.toThrow('injected install failure');
		expect(await fs.readFile(path.join(directory, 'generated/build.manifest.json'))).toEqual(
			previous
		);
	});

	it('reports backup-cleanup failure as committed instead of claiming rollback', async () => {
		const { configPath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		await expect(
			buildWorkspacePackageProject(fullProject(), configPath, {
				beforeBackupCleanup: () => {
					throw new Error('injected cleanup failure');
				},
			})
		).rejects.toThrow('output was committed, but backup cleanup failed');
		const live = JSON.parse(
			await fs.readFile(path.join(directory, 'generated/build.manifest.json'), 'utf8')
		);
		expect(live).toMatchObject({ schemaVersion: 2, layout: 'workspace-package' });
		expect(await fs.pathExists(path.join(directory, `generated.tfs-backup-${process.pid}`))).toBe(
			true
		);
	});

	it('rejects unknown layouts and runtime workspace/legacy key mixing before building', async () => {
		const { configPath } = await fixture();
		const unknown = fullProject() as unknown as {
			output: Record<string, unknown>;
		};
		unknown.output.layout = 'workspaec-package';
		await expect(buildProject(unknown as never, configPath)).rejects.toThrow(
			'Unknown TFS output layout'
		);
		const mixed = fullProject() as unknown as { output: Record<string, unknown> };
		mixed.output.css = true;
		await expect(buildProject(mixed as never, configPath)).rejects.toThrow(
			'workspace-package output cannot use legacy keys'
		);
	});

	it('rolls back a renderer failure and supports one-way migration from owned schema v1', async () => {
		const { configPath, directory } = await fixture();
		const output = path.join(directory, 'generated');
		await fs.ensureDir(output);
		await fs.writeFile(path.join(output, 'legacy.txt'), 'owned legacy output');
		await fs.writeFile(
			path.join(output, 'build.manifest.json'),
			`${JSON.stringify({ schemaVersion: 1, tool: { name: 'three-forma-styli' } })}\n`
		);
		await buildProject(fullProject(), configPath);
		expect(await fs.pathExists(path.join(output, 'legacy.txt'))).toBe(false);
		const previous = await fs.readFile(path.join(output, 'build.manifest.json'));
		const invalidTypography = structuredClone(defaultTypography);
		invalidTypography.roles!.heading.base.weight = 'not-a-weight';
		const invalid = defineTfsProject({
			system: { colors: colors(), typography: invalidTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: { runtime: true },
			},
		});
		await expect(buildProject(invalid, configPath)).rejects.toThrow('must be exposed by the role');
		expect(await fs.readFile(path.join(output, 'build.manifest.json'))).toEqual(previous);
	});

	it('rejects host manifests inside generated output, outside the host root, or symlinked', async () => {
		const inside = await fixture();
		await fs.ensureDir(path.join(inside.directory, 'generated'));
		await fs.writeFile(
			path.join(inside.directory, 'generated/package.json'),
			`${JSON.stringify(hostManifest())}\n`
		);
		const insideProject = defineTfsProject({
			system: { colors: colors(), typography: defaultTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				hostPackage: { manifest: './generated/package.json' },
				targets: { runtime: true },
			},
		});
		await expect(buildProject(insideProject, inside.configPath)).rejects.toThrow(
			'must be strictly inside its host package'
		);

		const outside = await fixture();
		await fs.ensureDir(path.join(outside.directory, 'host'));
		await fs.writeFile(
			path.join(outside.directory, 'host/package.json'),
			`${JSON.stringify(hostManifest())}\n`
		);
		const outsideProject = defineTfsProject({
			system: { colors: colors(), typography: defaultTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				hostPackage: { manifest: './host/package.json' },
				targets: { runtime: true },
			},
		});
		await expect(buildProject(outsideProject, outside.configPath)).rejects.toThrow(
			'must be strictly inside its host package'
		);

		const linked = await fixture();
		await fs.symlink(linked.packagePath, path.join(linked.directory, 'package-link.json'));
		const linkedProject = defineTfsProject({
			system: { colors: colors(), typography: defaultTypography },
			output: {
				layout: 'workspace-package',
				directory: './generated',
				hostPackage: { manifest: './package-link.json' },
				targets: { runtime: true },
			},
		});
		await expect(buildProject(linkedProject, linked.configPath)).rejects.toThrow(
			'must be a regular, non-symlink file'
		);
	});

	it('rejects path escapes, reserved asset collisions, and a symlink output', async () => {
		const { configPath, directory } = await fixture();
		const escaped = defineTfsProject({
			system: {},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				assets: { fonts: { directory: '../fonts' } },
				targets: {},
			},
		});
		await expect(buildProject(escaped, configPath)).rejects.toThrow('must stay inside');

		const nonPortable = defineTfsProject({
			system: {},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				assets: { fonts: { directory: 'font assets?' } },
				targets: {},
			},
		});
		await expect(buildProject(nonPortable, configPath)).rejects.toThrow(
			'must use portable path segments'
		);

		const collision = defineTfsProject({
			system: {},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				assets: { fonts: { directory: 'runtime/fonts' } },
				targets: {},
			},
		});
		await expect(buildProject(collision, configPath)).rejects.toThrow('reserved runtime');

		await fs.symlink(path.join(directory, 'elsewhere'), path.join(directory, 'generated'));
		await expect(buildProject(fullProject(), configPath)).rejects.toThrow(
			'must not traverse a symlink'
		);
	});

	it('prepares one shared font asset while rebasing runtime and review URLs independently', async () => {
		const completeManifest = hostManifest();
		const { './native-color-modes': _nativeColorModes, ...fontProjectExports } =
			completeManifest.exports;
		const manifest = hostManifest({
			files: ['generated/runtime', 'generated/assets'],
			exports: fontProjectExports,
		});
		const { configPath, directory, packagePath } = await fixture(manifest);
		await fs.writeFile(
			path.join(directory, 'example.ttf'),
			Buffer.from(TEST_FONT_BASE64, 'base64')
		);
		await fs.writeFile(path.join(directory, 'LICENSE.txt'), 'Synthetic test fixture.');
		const project = defineTfsProject({
			fonts: {
				example: {
					family: 'TFS Test Sans',
					category: 'sans',
					strategy: 'copy',
					sources: [{ path: './example.ttf', output: 'TFS #1 ü.ttf' }],
					license: {
						id: 'TEST',
						file: './LICENSE.txt',
						allowWebEmbedding: true,
						webEmbeddingBasis: 'Synthetic fixture.',
						embeddingRestrictionAcknowledgement:
							'Synthetic fixture metadata is not a real license restriction.',
					},
				},
			},
			system: {
				typography: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 4 },
						},
					],
					roles: {
						prose: {
							font: 'example',
							base: { fontSize: 1, weight: 'base', lineHeight: 1.25, letterSpacing: 0 },
							weights: { base: 400 },
						},
					},
				},
			},
			output: {
				layout: 'workspace-package',
				directory: './generated',
				targets: {
					runtime: {
						css: {
							entry: true,
							tokens: true,
							typography: true,
							module: true,
							fontUrls: { mode: 'public', prefix: '/cdn/tfs-fonts' },
						},
						contracts: true,
					},
					review: true,
				},
			},
		});
		const result = await buildProject(project, configPath);
		const fontManifest = JSON.parse(
			await fs.readFile(
				path.join(result.outputDirectory, 'assets/fonts/fonts.manifest.json'),
				'utf8'
			)
		);
		const faceFile = fontManifest.families.example.faces[0].file as string;
		const faceUrlSegment = encodeURIComponent(faceFile);
		expect(faceFile).toBe('TFS #1 ü.ttf');
		const runtimeCss = await fs.readFile(
			path.join(result.outputDirectory, 'runtime/styles/typography.css'),
			'utf8'
		);
		const reviewFontCss = await fs.readFile(
			path.join(result.outputDirectory, 'assets/fonts/fonts.css'),
			'utf8'
		);
		const reviewContract = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'review/workbench.json'), 'utf8')
		) as { assets: { stylesheets: string[] } };
		const reviewSystemCss = await fs.readFile(
			path.join(result.outputDirectory, 'review/system.css'),
			'utf8'
		);
		expect(runtimeCss).toContain(`/cdn/tfs-fonts/${faceUrlSegment}`);
		expect(reviewFontCss).toContain(`./${faceUrlSegment}`);
		expect(reviewFontCss).not.toContain('/cdn/tfs-fonts');
		expect(reviewContract.assets.stylesheets).toContain('../assets/fonts/fonts.css');
		expect(reviewSystemCss).not.toContain('/cdn/tfs-fonts');
		const matchingAssets = result.files.filter((file) => file.endsWith(`/${faceFile}`));
		expect(matchingAssets).toEqual([`assets/fonts/${faceFile}`]);
		const buildManifest = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'build.manifest.json'), 'utf8')
		);
		expect(buildManifest.artifacts[`assets/fonts/${faceFile}`].sha256).toMatch(/^[a-f\d]{64}$/);

		await fs.writeFile(
			packagePath,
			`${JSON.stringify(
				hostManifest({
					files: ['generated/runtime', 'generated/assets'],
					exports: {
						'./tokens.css': './generated/runtime/styles/tokens.css',
						'./typography.module.css': {
							types: './generated/runtime/styles/typography.module.css.d.ts',
							default: './generated/runtime/styles/typography.module.css',
						},
						'./fonts.css': './generated/runtime/styles/fonts.css',
						'./package.json': './package.json',
					},
				}),
				null,
				2
			)}\n`
		);
		const moduleOnly = structuredClone(project);
		moduleOnly.output = {
			layout: 'workspace-package',
			directory: './generated',
			targets: {
				runtime: {
					css: {
						entry: false,
						tokens: true,
						typography: false,
						module: true,
						fontUrls: { mode: 'absolute', prefix: 'https://cdn.example/fonts' },
					},
					contracts: false,
				},
			},
		};
		const moduleResult = await buildProject(moduleOnly, configPath);
		expect(moduleResult.files).toContain('runtime/styles/fonts.css');
		expect(moduleResult.files).not.toContain('runtime/styles/typography.css');
		const moduleFonts = await fs.readFile(
			path.join(moduleResult.outputDirectory, 'runtime/styles/fonts.css'),
			'utf8'
		);
		expect(moduleFonts).toContain(`https://cdn.example/fonts/${faceUrlSegment}`);
		const moduleManifest = JSON.parse(
			await fs.readFile(path.join(moduleResult.outputDirectory, 'build.manifest.json'), 'utf8')
		);
		expect(moduleManifest.targets.runtime.entrypoints['./fonts.css']).toBe(
			'./generated/runtime/styles/fonts.css'
		);

		const typographyOnly = structuredClone(project);
		typographyOnly.output = {
			layout: 'workspace-package',
			directory: './generated',
			targets: {
				runtime: {
					css: {
						entry: false,
						tokens: true,
						typography: true,
						module: false,
						fontUrls: { mode: 'relative' },
					},
					contracts: false,
				},
			},
		};
		await fs.writeFile(
			packagePath,
			`${JSON.stringify(
				hostManifest({
					files: ['generated/runtime', 'generated/assets'],
					exports: {
						'./tokens.css': './generated/runtime/styles/tokens.css',
						'./typography.css': './generated/runtime/styles/typography.css',
						'./package.json': './package.json',
					},
				}),
				null,
				2
			)}\n`
		);
		const typographyResult = await buildProject(typographyOnly, configPath);
		const relativeCss = await fs.readFile(
			path.join(typographyResult.outputDirectory, 'runtime/styles/typography.css'),
			'utf8'
		);
		expect(relativeCss).toContain(`../../assets/fonts/${faceUrlSegment}`);
		expect(typographyResult.files).not.toContain('runtime/styles/fonts.css');
	});

	it('packs only the configured runtime surface while keeping review and design local', async () => {
		const { configPath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
			cwd: directory,
		});
		const packed = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
		const files = packed[0]!.files.map((entry) => entry.path);
		expect(files).toContain('generated/runtime/index.js');
		expect(files).toContain('generated/runtime/styles/index.css');
		expect(files).not.toContain('generated/review/index.html');
		expect(files).not.toContain('generated/design/tokens.dtcg.json');
	});

	it('supports strict external types and package subpath resolution without downstream compilation', async () => {
		const { configPath, directory } = await fixture();
		await buildProject(fullProject(), configPath);
		const consumer = path.join(directory, 'consumer');
		const tarballs = path.join(directory, 'tarballs');
		await fs.ensureDir(tarballs);
		const packedResult = await execFileAsync(
			'npm',
			['pack', '--json', '--pack-destination', tarballs],
			{ cwd: directory }
		);
		const packed = JSON.parse(packedResult.stdout) as Array<{ filename: string }>;
		const tarball = path.join(tarballs, packed[0]!.filename);
		await fs.ensureDir(consumer);
		await fs.writeFile(
			path.join(consumer, 'package.json'),
			`${JSON.stringify({ name: 'isolated-consumer', private: true, type: 'module' }, null, 2)}\n`
		);
		await execFileAsync(
			'npm',
			['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
			{ cwd: consumer }
		);
		await fs.writeFile(
			path.join(consumer, 'tsconfig.json'),
			`${JSON.stringify(
				{
					compilerOptions: {
						strict: true,
						noEmit: true,
						target: 'ES2022',
						module: 'NodeNext',
						moduleResolution: 'NodeNext',
						skipLibCheck: false,
					},
					include: ['./index.ts'],
				},
				null,
				2
			)}\n`
		);
		await fs.writeFile(
			path.join(consumer, 'index.ts'),
			[
				"import { nativeColorModes, typography } from '@fixture/design-system';",
				"import { tfsSystem } from '@fixture/design-system/system';",
				"const mode: typeof nativeColorModes.defaultMode = 'night';",
				"const role: keyof typeof typography.roles = 'prose';",
				"const colorMode: keyof typeof tfsSystem.modes.color.entries = 'paper';",
				'void [mode, role, colorMode];',
				'// @ts-expect-error exact native mode names stay literal',
				"const invalid: typeof nativeColorModes.defaultMode = 'missing';",
				'void invalid;',
				'',
			].join('\n')
		);
		await expect(
			execFileAsync('pnpm', ['exec', 'tsc', '-p', path.join(consumer, 'tsconfig.json')], {
				cwd: process.cwd(),
			})
		).resolves.toBeDefined();
		const resolved = await execFileAsync(
			process.execPath,
			[
				'--input-type=module',
				'--eval',
				"process.stdout.write([import.meta.resolve('@fixture/design-system/system'), import.meta.resolve('@fixture/design-system/styles.css')].join('\\n'))",
			],
			{ cwd: consumer }
		);
		expect(resolved.stdout).toContain('/generated/runtime/system.js');
		expect(resolved.stdout).toContain('/generated/runtime/styles/index.css');
	});
});
