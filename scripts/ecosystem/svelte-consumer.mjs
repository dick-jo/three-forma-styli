import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run, writeJson } from './process.mjs';

/** Prove a host-owned Text adapter through a fresh Svelte 5/Vite build. */
export async function buildSvelteConsumer({ temporaryRoot, designSystemTarball }) {
	const svelteRoot = path.join(temporaryRoot, 'svelte-app');
	await mkdir(path.join(svelteRoot, 'src'), { recursive: true });
	await writeJson(path.join(svelteRoot, 'package.json'), {
		name: 'tfs-svelte-runtime-consumer',
		private: true,
		type: 'module',
		scripts: {
			build: 'vite build',
			check: 'svelte-check --tsconfig ./tsconfig.json',
		},
		dependencies: {
			'workspace-system': pathToFileURL(designSystemTarball).href,
		},
		devDependencies: {
			'@sveltejs/vite-plugin-svelte': '5.1.1',
			svelte: '5.56.7',
			'svelte-check': '4.7.3',
			typescript: '5.9.3',
			vite: '6.4.3',
		},
	});
	await writeJson(path.join(svelteRoot, 'tsconfig.json'), {
		compilerOptions: {
			allowJs: true,
			checkJs: true,
			esModuleInterop: true,
			forceConsistentCasingInFileNames: true,
			moduleResolution: 'Bundler',
			resolveJsonModule: true,
			skipLibCheck: true,
			sourceMap: true,
			strict: true,
			target: 'ES2022',
			module: 'ESNext',
		},
		include: ['src/**/*.d.ts', 'src/**/*.ts', 'src/**/*.svelte', 'vite.config.ts'],
	});
	await writeFile(
		path.join(svelteRoot, 'vite.config.ts'),
		[
			"import { svelte } from '@sveltejs/vite-plugin-svelte';",
			"import { defineConfig } from 'vite';",
			'',
			'export default defineConfig({ plugins: [svelte()] });',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(svelteRoot, 'svelte.config.js'),
		[
			"import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';",
			'',
			'export default { preprocess: vitePreprocess() };',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(svelteRoot, 'index.html'),
		'<main id="app"></main><script type="module" src="/src/main.ts"></script>\n'
	);
	await writeFile(
		path.join(svelteRoot, 'src/main.ts'),
		[
			"import 'workspace-system/styles.css';",
			"import { mount } from 'svelte';",
			"import App from './App.svelte';",
			'',
			"const target = document.querySelector<HTMLElement>('#app');",
			"if (!target) throw new Error('Missing app root');",
			'mount(App, { target });',
			'',
		].join('\n')
	);
	await writeFile(
		path.join(svelteRoot, 'src/Text.svelte'),
		`<script lang="ts">
	import typographyClasses from 'workspace-system/typography.module.css';
	import {
		typographyClassName,
		type TypographyRole,
		type TypographySelection,
	} from 'workspace-system/typography';
	import type { Snippet } from 'svelte';

	type RenameRole<S> = S extends { role: infer Role extends TypographyRole }
		? Omit<S, 'role'> & { kind: Role }
		: never;
	type TypographyProps = RenameRole<TypographySelection>;
	type Props = TypographyProps & {
		as?: 'span' | 'p' | 'h2';
		children?: Snippet;
		class?: string;
	};

	function toSelection(props: TypographyProps): TypographySelection {
		const { kind, ...selection } = props;
		return { role: kind, ...selection } as TypographySelection;
	}

	let { as = 'span', children, class: className, ...typographyProps }: Props = $props();
	const selection = $derived(toSelection(typographyProps));
	const generatedClassName = $derived(typographyClassName(selection, typographyClasses));
	const resolvedClassName = $derived(
		className ? \`\${generatedClassName} \${className}\` : generatedClassName
	);
</script>

{#if as === 'p'}
	<p class={resolvedClassName}>{@render children?.()}</p>
{:else if as === 'h2'}
	<h2 class={resolvedClassName}>{@render children?.()}</h2>
{:else}
	<span class={resolvedClassName}>{@render children?.()}</span>
{/if}
`
	);
	await writeFile(
		path.join(svelteRoot, 'src/App.svelte'),
		`<script lang="ts">
	import Text from './Text.svelte';
</script>

<Text as="h2" kind="heading" variant="max" weight="max">
	Svelte host-owned Text ready
</Text>
<Text kind="label" variant="s">Typed label</Text>
`
	);

	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: svelteRoot });
	run('npm', ['run', 'check'], { cwd: svelteRoot });
	run('npm', ['run', 'build'], { cwd: svelteRoot });

	const builtFiles = (await readdir(path.join(svelteRoot, 'dist', 'assets'))).sort();
	const javascript = builtFiles.find((file) => file.endsWith('.js'));
	const css = builtFiles.find((file) => file.endsWith('.css'));
	assert.ok(javascript, 'Svelte/Vite did not emit a JavaScript bundle');
	assert.ok(css, 'Svelte/Vite did not emit generated typography CSS');
	assert.match(
		await readFile(path.join(svelteRoot, 'dist', 'assets', javascript), 'utf8'),
		/Svelte host-owned Text ready/
	);
}
