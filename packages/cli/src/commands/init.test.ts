import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { initCommand } from './init.js';
import { buildCommand } from './build.js';
import { figmaSyncCommand } from './figma-sync.js';
import { checkCommand } from './check.js';
import { validateCommand } from './validate.js';

const originalCwd = process.cwd();
const require = createRequire(import.meta.url);
const temporaryRoots: string[] = [];

afterEach(async () => {
	process.chdir(originalCwd);
	vi.restoreAllMocks();
	await Promise.all(temporaryRoots.splice(0).map((root) => fs.remove(root)));
});

describe('tfs init', () => {
	it('creates a pinned, documented project that builds through the public workflow', async () => {
		const temporaryRoot = await fs.mkdtemp(path.join(originalCwd, '.tfs-init-test-'));
		temporaryRoots.push(temporaryRoot);
		process.chdir(temporaryRoot);
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		await initCommand('gold-standard-system', { theme: 'default', skipInstall: true });
		const projectRoot = path.join(temporaryRoot, 'gold-standard-system');
		const manifest = await fs.readJson(path.join(projectRoot, 'package.json'));

		expect(manifest.version).toBeUndefined();
		expect(manifest.dependencies['@three-forma-styli/core']).toBe('0.2.0');
		expect(manifest.devDependencies['@three-forma-styli/cli']).toBe('0.2.0');
		expect(manifest.devDependencies['@three-forma-styli/compiler']).toBe('0.2.0');
		expect(await fs.readFile(path.join(projectRoot, 'tfs.config.ts'), 'utf8')).toContain(
			'from "@three-forma-styli/compiler"'
		);
		expect(manifest.scripts).toEqual({
			generate: 'tfs build .',
			build: 'tfs validate .',
			check: 'tsc --noEmit && tfs validate .',
			'check:generated': 'tfs check .',
			specimen: 'tfs specimen serve .',
		});
		expect(await fs.pathExists(path.join(projectRoot, 'config.ts'))).toBe(false);
		expect(await fs.pathExists(path.join(projectRoot, 'README.md'))).toBe(true);
		execFileSync(
			process.execPath,
			[require.resolve('typescript/bin/tsc'), '--noEmit', '-p', projectRoot],
			{
				cwd: projectRoot,
				stdio: 'inherit',
			}
		);

		await buildCommand(projectRoot, {});
		const buildManifest = await fs.readJson(path.join(projectRoot, 'dist/build.manifest.json'));
		expect(buildManifest.tool.version).toBe('0.2.0');
		expect(buildManifest.artifacts['tokens.css']).toBeDefined();
		expect(buildManifest.artifacts['typography.specimen.html']).toBeDefined();
		await expect(checkCommand(projectRoot)).resolves.toBeUndefined();
		await expect(validateCommand(projectRoot)).resolves.toBeUndefined();
		const tokensPath = path.join(projectRoot, 'dist/tokens.css');
		await fs.writeFile(tokensPath, 'drift\n');
		await expect(checkCommand(projectRoot)).rejects.toThrow(/changed tokens\.css/);
		await expect(validateCommand(projectRoot)).rejects.toThrow(/does not match its manifest/);
		expect(await fs.readFile(tokensPath, 'utf8')).toBe('drift\n');
		await buildCommand(projectRoot, {});

		await expect(
			figmaSyncCommand(projectRoot, { fileKey: 'dry-run', dryRun: true })
		).resolves.toBeUndefined();
	});

	it('scaffolds a monorepo-ready package with explicit generation and drift checks', async () => {
		const temporaryRoot = await fs.mkdtemp(path.join(originalCwd, '.tfs-init-test-'));
		temporaryRoots.push(temporaryRoot);
		process.chdir(temporaryRoot);
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		await initCommand('workspace-system', {
			theme: 'default',
			skipInstall: true,
			workspacePackage: true,
			packageName: '@repo/design-system',
		});
		const projectRoot = path.join(temporaryRoot, 'workspace-system');
		const manifest = await fs.readJson(path.join(projectRoot, 'package.json'));
		const config = await fs.readFile(path.join(projectRoot, 'tfs.config.ts'), 'utf8');

		expect(manifest.version).toBe('0.0.0');
		expect(manifest.name).toBe('@repo/design-system');
		expect(config).toContain('layout: "workspace-package"');
		expect(config).toContain('directory: "./generated"');
		expect(manifest.dependencies).toBeUndefined();
		expect(manifest.devDependencies['@three-forma-styli/core']).toBe('0.2.0');
		expect(manifest.scripts).toEqual({
			generate: 'tfs build .',
			build: 'tfs validate .',
			check: 'tsc --noEmit && tfs validate .',
			'check:generated': 'tfs check .',
			specimen: 'tfs specimen serve .',
		});
		expect(manifest.exports['.']).toEqual({
			types: './generated/runtime/index.d.ts',
			import: './generated/runtime/index.js',
		});
		expect(manifest.exports['./styles.css']).toBe('./generated/runtime/styles/index.css');
		expect(manifest.exports['./typography.module.css']).toEqual({
			types: './generated/runtime/styles/typography.module.css.d.ts',
			default: './generated/runtime/styles/typography.module.css',
		});
		expect(manifest.files).toEqual(['generated/runtime', 'generated/assets', 'README.md']);
		expect(manifest.sideEffects).toEqual(['./generated/runtime/styles/*.css']);
		const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		await buildCommand(projectRoot, { dryRun: true, json: true });
		const dryRun = JSON.parse(String(stdout.mock.calls.at(-1)?.[0]));
		expect(dryRun).toMatchObject({
			schemaVersion: 1,
			command: 'build',
			status: 'ok',
			result: {
				mode: 'dry-run',
				plan: {
					output: { layout: 'workspace-package', ownership: 'atomic-directory' },
					hostPackage: { generatedFromHost: 'generated' },
				},
			},
		});
		expect(
			dryRun.result.plan.artifacts.map((artifact: { path: string }) => artifact.path)
		).toContain('runtime/styles/typography.module.css.d.ts');
		expect(await fs.pathExists(path.join(projectRoot, 'generated'))).toBe(false);

		execFileSync(
			process.execPath,
			[require.resolve('typescript/bin/tsc'), '--noEmit', '-p', projectRoot],
			{ cwd: projectRoot, stdio: 'inherit' }
		);
		await buildCommand(projectRoot, {});
		stdout.mockClear();
		await validateCommand(projectRoot, { json: true });
		expect(JSON.parse(String(stdout.mock.calls.at(-1)?.[0]))).toMatchObject({
			command: 'validate',
			status: 'ok',
			result: { valid: true },
		});
		await expect(validateCommand(projectRoot)).resolves.toBeUndefined();
		await expect(checkCommand(projectRoot)).resolves.toBeUndefined();
		expect(await fs.pathExists(path.join(projectRoot, 'dist'))).toBe(false);
		expect(await fs.pathExists(path.join(projectRoot, 'generated/runtime/index.js'))).toBe(true);
		expect(await fs.pathExists(path.join(projectRoot, 'generated/review/typography.html'))).toBe(
			true
		);
	});

	it('rejects path-like and otherwise unsafe non-interactive project names', async () => {
		const temporaryRoot = await fs.mkdtemp(path.join(originalCwd, '.tfs-init-test-'));
		temporaryRoots.push(temporaryRoot);
		process.chdir(temporaryRoot);

		await expect(
			initCommand('../outside', { theme: 'default', skipInstall: true })
		).rejects.toThrow(/must not contain a path/);
		expect(await fs.pathExists(path.resolve(temporaryRoot, '../outside'))).toBe(false);
	});

	it('rejects unknown preset names instead of treating them as filesystem paths', async () => {
		const temporaryRoot = await fs.mkdtemp(path.join(originalCwd, '.tfs-init-test-'));
		temporaryRoots.push(temporaryRoot);
		process.chdir(temporaryRoot);

		await expect(
			initCommand('safe-project', { theme: '../default', skipInstall: true })
		).rejects.toThrow(/Starter preset/);
		expect(await fs.pathExists(path.join(temporaryRoot, 'safe-project'))).toBe(false);
	});

	it('rejects unsafe package names and unknown package managers before writing', async () => {
		const temporaryRoot = await fs.mkdtemp(path.join(originalCwd, '.tfs-init-test-'));
		temporaryRoots.push(temporaryRoot);
		process.chdir(temporaryRoot);

		await expect(
			initCommand('safe-project', {
				theme: 'default',
				skipInstall: true,
				packageName: '@repo/../escape',
			})
		).rejects.toThrow(/Package name/);
		await expect(
			initCommand('safe-project', {
				theme: 'default',
				skipInstall: true,
				packageManager: 'bun',
			})
		).rejects.toThrow(/must be npm, pnpm, or yarn/);
		expect(await fs.pathExists(path.join(temporaryRoot, 'safe-project'))).toBe(false);
	});
});
