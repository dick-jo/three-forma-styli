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
		path.join(nextRoot, 'app/Text.tsx'),
		[
			"import typographyClasses from 'workspace-system/typography.module.css';",
			'import {',
			'  typographyClassName,',
			'  type TypographyRole,',
			'  type TypographySelection,',
			'  type TypographyVariant,',
			"} from 'workspace-system/typography';",
			"import { createElement, type ComponentPropsWithRef, type ReactElement } from 'react';",
			'',
			"const textElements = ['span', 'p', 'strong', 'em', 'code', 'h1', 'h2', 'h3'] as const;",
			'type TextElement = (typeof textElements)[number];',
			'',
			'type RenameRole<S extends TypographySelection> = S extends TypographySelection',
			'  ? S extends { role: infer Role extends TypographyRole }',
			"    ? Omit<S, 'role' | 'variant'> & { kind: Role; variant?: 'base' | TypographyVariant<Role> }",
			'    : never',
			'  : never;',
			'type DefaultProse<S> = S extends { kind: "prose" } ? Omit<S, "kind"> & { kind?: "prose" } : S;',
			'type TextTypographyProps = DefaultProse<RenameRole<TypographySelection>>;',
			'type TextProps<Element extends TextElement = "span"> = TextTypographyProps &',
			'  { as?: Element } &',
			"  Omit<ComponentPropsWithRef<Element>, keyof TextTypographyProps | 'as' | 'className'> &",
			'  { className?: string };',
			'',
			'export function Text<Element extends TextElement = "span">(props: TextProps<Element>): ReactElement {',
			'  const {',
			"    as = 'span',",
			"    kind = 'prose',",
			"    variant = 'base',",
			'    fontStyle,',
			'    weight,',
			'    className,',
			'    ...elementProps',
			'  } = props as TextProps<TextElement>;',
			'  const selection = {',
			'    role: kind,',
			"    ...(variant === 'base' ? {} : { variant }),",
			'    ...(fontStyle === undefined ? {} : { fontStyle }),',
			'    ...(weight === undefined ? {} : { weight }),',
			'  } as TypographySelection;',
			'  const generated = typographyClassName(selection, typographyClasses);',
			'  return createElement(as, {',
			'    ...elementProps,',
			'    className: className ? `${generated} ${className}` : generated,',
			'  });',
			'}',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(nextRoot, 'app/client-text.tsx'),
		[
			"'use client';",
			'',
			"import { Text } from './Text';",
			'',
			'export function ClientText() {',
			'  return <Text kind="label" variant="s" role="status">Client-compatible label</Text>;',
			'}',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(nextRoot, 'app/page.tsx'),
		[
			"import { nativeColorModes } from 'workspace-system/native-color-modes';",
			"import { runtimeColorThemeConfig } from 'workspace-system/runtime-color-theme';",
			"import { tfsSystem } from 'workspace-system/system';",
			"import { ClientText } from './client-text';",
			"import { Text } from './Text';",
			'',
			'export default function Page() {',
			'  const duration = tfsSystem.motion.recipes.hover.base.duration.seconds;',
			'  return (',
			'    <main>',
			'      <Text as="h2" kind="heading" variant="max" weight="max">',
			"        {nativeColorModes.modes.map((mode) => mode.name).join(', ')} · {runtimeColorThemeConfig.colorNames.length} colors · {duration}s",
			'      </Text>',
			'      <ClientText />',
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
