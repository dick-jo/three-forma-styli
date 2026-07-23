import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run, writeJson } from './process.mjs';

/** Prove the generated package boundary inside a fresh pnpm/Turborepo graph. */
export async function buildTurborepoConsumer({ temporaryRoot, workspaceRoot, tarballs }) {
	const monorepoRoot = path.join(temporaryRoot, 'pnpm-turborepo');
	const designSystemRoot = path.join(monorepoRoot, 'packages/design-system');
	const contractsRoot = path.join(monorepoRoot, 'apps/contracts');
	await mkdir(path.dirname(designSystemRoot), { recursive: true });
	await mkdir(contractsRoot, { recursive: true });
	await cp(workspaceRoot, designSystemRoot, { recursive: true });

	const designSystemPackagePath = path.join(designSystemRoot, 'package.json');
	const designSystemPackage = JSON.parse(await readFile(designSystemPackagePath, 'utf8'));
	for (const packageName of ['core', 'compiler', 'cli']) {
		designSystemPackage.devDependencies[`@three-forma-styli/${packageName}`] = pathToFileURL(
			tarballs[packageName]
		).href;
	}
	await writeJson(designSystemPackagePath, designSystemPackage);

	await writeJson(path.join(monorepoRoot, 'package.json'), {
		name: 'tfs-neutral-monorepo-consumer',
		private: true,
		packageManager: 'pnpm@11.9.0',
		scripts: {
			build: 'turbo run build',
			check: 'turbo run check',
		},
		devDependencies: {
			turbo: '2.10.0',
		},
	});
	await writeFile(
		path.join(monorepoRoot, 'pnpm-workspace.yaml'),
		[
			'packages:',
			'  - "apps/*"',
			'  - "packages/*"',
			'overrides:',
			...Object.entries(tarballs).map(
				([name, tarball]) =>
					`  ${JSON.stringify(`@three-forma-styli/${name}`)}: ${JSON.stringify(pathToFileURL(tarball).href)}`
			),
			'',
		].join('\n')
	);
	await writeJson(path.join(monorepoRoot, 'turbo.json'), {
		$schema: 'https://turborepo.dev/schema.json',
		tasks: {
			build: {
				dependsOn: ['^build'],
				outputs: [],
			},
			check: {
				dependsOn: ['^build', '^check'],
				outputs: [],
			},
		},
	});
	await writeJson(path.join(contractsRoot, 'package.json'), {
		name: '@fixture/contracts',
		private: true,
		type: 'module',
		scripts: {
			build: 'tsc --noEmit',
			check: 'tsc --noEmit',
		},
		dependencies: {
			'workspace-system': 'workspace:*',
		},
		devDependencies: {
			typescript: '5.9.3',
		},
	});
	await writeJson(path.join(contractsRoot, 'tsconfig.json'), {
		compilerOptions: {
			target: 'ES2022',
			module: 'NodeNext',
			moduleResolution: 'NodeNext',
			strict: true,
			noEmit: true,
			skipLibCheck: true,
		},
		include: ['index.ts'],
	});
	await writeFile(
		path.join(contractsRoot, 'index.ts'),
		[
			"import { nativeColorModes } from 'workspace-system/native-color-modes';",
			"import { runtimeColorThemeConfig } from 'workspace-system/runtime-color-theme';",
			"import { tfsSystem } from 'workspace-system/system';",
			"import type { TypographySelection } from 'workspace-system/typography';",
			"import typography from 'workspace-system/typography.module.css';",
			'',
			'const selection = {',
			"  role: 'prose',",
			"  variant: 's',",
			'} satisfies TypographySelection;',
			'const className: string = typography[selection.role];',
			'const firstMode: string | undefined = nativeColorModes.modes[0]?.name;',
			'const duration: number = tfsSystem.motion.recipes.hover.base.duration.seconds;',
			'const minimumDelta: number = runtimeColorThemeConfig.luminance.minimumLuminanceDelta;',
			'void [className, firstMode, duration, minimumDelta];',
			'',
		].join('\n')
	);

	const manifestPath = path.join(designSystemRoot, 'generated/build.manifest.json');
	run('pnpm', ['install', '--ignore-scripts', '--frozen-lockfile=false'], { cwd: monorepoRoot });
	run('pnpm', ['--filter', 'workspace-system', 'generate'], { cwd: monorepoRoot });
	const manifestBefore = await readFile(manifestPath);
	run('pnpm', ['exec', 'turbo', 'run', 'build', 'check'], { cwd: monorepoRoot });
	assert.deepEqual(
		await readFile(manifestPath),
		manifestBefore,
		'Routine monorepo build/check rewrote committed generated output'
	);

	const productionTree = run(
		'pnpm',
		['--filter', '@fixture/contracts', 'list', '--prod', '--json', '--depth', 'Infinity'],
		{ cwd: monorepoRoot }
	);
	for (const forbidden of [
		'@three-forma-styli/cli',
		'@three-forma-styli/compiler',
		'fontkit',
		'@inquirer',
		'@playwright',
	]) {
		assert.doesNotMatch(
			productionTree,
			new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			`Application production graph leaked ${forbidden}`
		);
	}
}
