import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run, writeJson } from './process.mjs';

/** Prove a packed generated package through a fresh production Next.js build. */
export async function buildNextConsumer({ temporaryRoot, designSystemTarball }) {
	const nextRoot = path.join(temporaryRoot, 'next-app');
	await mkdir(path.join(nextRoot, 'app'), { recursive: true });
	await writeJson(path.join(nextRoot, 'package.json'), {
		name: 'tfs-next-runtime-consumer',
		private: true,
		type: 'module',
		scripts: { build: 'next build' },
		dependencies: {
			next: '16.2.6',
			react: '19.2.1',
			'react-dom': '19.2.1',
			'workspace-system': pathToFileURL(designSystemTarball).href,
		},
		devDependencies: {
			'@types/node': '24.10.1',
			'@types/react': '19.2.7',
			'@types/react-dom': '19.2.3',
			typescript: '5.9.3',
		},
	});
	await writeFile(
		path.join(nextRoot, 'next-env.d.ts'),
		[
			'/// <reference types="next" />',
			'/// <reference types="next/image-types/global" />',
			'',
		].join('\n')
	);
	await writeJson(path.join(nextRoot, 'tsconfig.json'), {
		compilerOptions: {
			target: 'ES2022',
			lib: ['dom', 'dom.iterable', 'esnext'],
			allowJs: false,
			skipLibCheck: true,
			strict: true,
			noEmit: true,
			esModuleInterop: true,
			module: 'esnext',
			moduleResolution: 'bundler',
			resolveJsonModule: true,
			isolatedModules: true,
			jsx: 'react-jsx',
			incremental: true,
			plugins: [{ name: 'next' }],
		},
		include: ['next-env.d.ts', '.next/types/**/*.ts', '**/*.ts', '**/*.tsx'],
		exclude: ['node_modules'],
	});
	await writeFile(
		path.join(nextRoot, 'app/layout.tsx'),
		[
			"import 'workspace-system/styles.css';",
			'',
			'export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {',
			'  return <html lang="en"><body>{children}</body></html>;',
			'}',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(nextRoot, 'app/page.tsx'),
		[
			"import type { TypographySelection } from 'workspace-system/typography';",
			"import { nativeColorModes } from 'workspace-system/native-color-modes';",
			"import { tfsSystem } from 'workspace-system/system';",
			"import typography from 'workspace-system/typography.module.css';",
			'',
			'const selection = {',
			"  role: 'heading',",
			"  variant: 'max',",
			"  weight: 'max',",
			'} satisfies TypographySelection;',
			'',
			'export default function Page() {',
			'  const duration = tfsSystem.motion.recipes.hover.base.duration.seconds;',
			'  return (',
			'    <main className={typography[selection.role]}>',
			"      {nativeColorModes.modes.map((mode) => mode.name).join(', ')} · {duration}s",
			'    </main>',
			'  );',
			'}',
			'',
		].join('\n')
	);

	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: nextRoot });
	run('npm', ['run', 'build'], { cwd: nextRoot });
	const buildId = await readFile(path.join(nextRoot, '.next/BUILD_ID'), 'utf8');
	assert.ok(buildId.trim(), 'Next did not emit a production BUILD_ID');
}
