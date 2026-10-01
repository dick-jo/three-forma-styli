import { readdir, readFile, rename, rm, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { emitColorThemeJs, emitColorThemeTypes } from '../emit/color-theme.js';
import { emitTokensCss } from '../emit/css.js';
import { emitFigmaJson } from '../emit/figma.js';
import { emitTokensJs, emitTokensTypes } from '../emit/tokens-module.js';
import {
	emitTypographyCss,
	emitTypographyJs,
	emitTypographyModuleCss,
	emitTypographyModuleTypes,
	emitTypographyTypes,
} from '../emit/typography.js';
import { prepareFonts, writeFontAssets, type PreparedFonts } from '../fonts/prepare.js';
import { resolveSystem, type ResolvedSystem } from '../resolve/index.js';
import { GENERATED_HEADER } from '../const.js';
import type { LoadedConfig } from './config.js';

type BuildResult = {
	readonly resolved: ResolvedSystem;
	readonly fonts: PreparedFonts | undefined;
};

/** Every text file in generated/, by name. Font files are added separately. */
function textFiles(
	loaded: LoadedConfig,
	resolved: ResolvedSystem,
	fonts: PreparedFonts | undefined
): Record<string, string> {
	const stacks = fonts?.stacks ?? {};
	const files: Record<string, string> = {
		'tokens.css': emitTokensCss(resolved, stacks),
		'tokens.js': emitTokensJs(resolved, stacks),
		'tokens.d.ts': emitTokensTypes(resolved, stacks),
	};
	const styles = ['tokens.css'];
	if (fonts && fonts.css) {
		files['fonts.css'] = GENERATED_HEADER + fonts.css;
		styles.push('fonts.css');
	}
	if (resolved.input.typography) {
		Object.assign(files, {
			'typography.css': emitTypographyCss(resolved),
			'typography.module.css': emitTypographyModuleCss(resolved),
			'typography.module.css.d.ts': emitTypographyModuleTypes(resolved),
			'typography.js': emitTypographyJs(resolved),
			'typography.d.ts': emitTypographyTypes(resolved),
		});
		styles.push('typography.css');
	}
	const colorThemes = loaded.config.runtime?.colorThemes;
	if (colorThemes) {
		files['color-theme.js'] = emitColorThemeJs(resolved, colorThemes);
		files['color-theme.d.ts'] = emitColorThemeTypes(resolved, colorThemes);
	}
	const figma = loaded.config.output?.figma;
	if (figma) files['figma.json'] = emitFigmaJson(resolved, stacks, figma);
	files['styles.css'] = GENERATED_HEADER + styles.map((file) => `@import "./${file}";\n`).join('');
	return files;
}

const GIT_IGNORE = '.gitignore';

/** Runs every check and writes the complete output into `directory`. */
async function generateInto(loaded: LoadedConfig, directory: string): Promise<BuildResult> {
	const resolved = resolveSystem(loaded.config.system);
	const fonts = loaded.config.system.typography
		? await prepareFonts(loaded.config.system.typography, loaded.projectDir)
		: undefined;
	const files = textFiles(loaded, resolved, fonts);
	await mkdir(directory, { recursive: true });
	for (const [name, content] of Object.entries(files))
		await writeFile(join(directory, name), content);
	if (fonts && fonts.assets.length > 0) await writeFontAssets(fonts.assets, directory);
	return { resolved, fonts };
}

/**
 * Checks everything and generates into a staging folder first, so an invalid
 * system writes nothing. Then moves only the changed files into the existing
 * output folder and removes files no longer generated. The folder itself is never
 * replaced, so file watchers (Vite, editors) keep seeing changes. The staging
 * folder ignores itself for git, so an interrupted build can't be committed.
 */
export async function buildProject(loaded: LoadedConfig): Promise<BuildResult> {
	const staging = `${loaded.outDir}.tfs-staging-${process.pid}`;
	await rm(staging, { recursive: true, force: true });
	try {
		await mkdir(staging, { recursive: true });
		await writeFile(join(staging, GIT_IGNORE), '*\n');
		const result = await generateInto(loaded, staging);
		await mkdir(loaded.outDir, { recursive: true });
		const [all, current] = await Promise.all([listFiles(staging), listFiles(loaded.outDir)]);
		const fresh = all.filter((file) => file !== GIT_IGNORE);
		for (const file of fresh) {
			const target = join(loaded.outDir, file);
			const [next, previous] = await Promise.all([
				readFile(join(staging, file)),
				readFile(target).catch(() => undefined),
			]);
			if (previous?.equals(next)) continue;
			await mkdir(dirname(target), { recursive: true });
			await rename(join(staging, file), target);
		}
		for (const file of current.filter((f) => !fresh.includes(f)))
			await rm(join(loaded.outDir, file));
		return result;
	} finally {
		await rm(staging, { recursive: true, force: true });
	}
}

async function listFiles(directory: string, root = directory): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
	const nested = await Promise.all(
		entries.map((entry) =>
			entry.isDirectory()
				? listFiles(join(directory, entry.name), root)
				: [relative(root, join(directory, entry.name))]
		)
	);
	return nested.flat().sort();
}

/** Differences between what a build would write and what is committed. Empty means current. */
export async function checkProject(loaded: LoadedConfig): Promise<string[]> {
	const fresh = `${loaded.outDir}.tfs-check-${process.pid}`;
	await rm(fresh, { recursive: true, force: true });
	try {
		await generateInto(loaded, fresh);
		const [expected, actual] = await Promise.all([listFiles(fresh), listFiles(loaded.outDir)]);
		const differences = [
			...expected.filter((file) => !actual.includes(file)).map((file) => `missing: ${file}`),
			...actual
				.filter((file) => !expected.includes(file))
				.map((file) => `not generated by this config: ${file}`),
		];
		for (const file of expected.filter((f) => actual.includes(f))) {
			const [a, b] = await Promise.all([
				readFile(join(fresh, file)),
				readFile(join(loaded.outDir, file)),
			]);
			if (!a.equals(b)) differences.push(`out of date: ${file}`);
		}
		return differences;
	} finally {
		await rm(fresh, { recursive: true, force: true });
	}
}
