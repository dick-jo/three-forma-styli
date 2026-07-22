import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
	generateCss,
	generateFigmaJson,
	generateTypographySpecimen,
	generateTypographyTypescript,
	type PartialDesignSystem,
	type GenerateCssConfig,
	type FigmaJsonFormat,
} from '@three-forma-styli/core';
import { CLI_VERSION } from '../version.js';
import { loadConfigModule } from '../config/load-module.js';
import { buildProject } from '../project-build.js';
import type { TfsProject } from '../project.js';

export type OutputFormat = 'css' | 'dtcg' | 'figma-variables' | 'typescript' | 'specimen';

const outputFormats: OutputFormat[] = ['css', 'dtcg', 'figma-variables', 'typescript', 'specimen'];

export function parseOutputFormat(value: string | undefined): OutputFormat {
	const format = value ?? 'css';
	if (!outputFormats.includes(format as OutputFormat)) {
		throw new Error(
			`Unsupported output format "${format}". Expected one of: ${outputFormats.join(', ')}`
		);
	}
	return format as OutputFormat;
}

export function relativeStylesheetHref(outputPath: string, stylesheetPath: string): string {
	const relative = path
		.relative(path.dirname(outputPath), stylesheetPath)
		.split(path.sep)
		.join('/');
	if (relative.startsWith('.') || relative.startsWith('/')) return relative;
	return `./${relative}`;
}

function resolveFileHeader(userConfig: GenerateCssConfig | null) {
	if (userConfig?.fileHeader === false) {
		return false as const;
	}
	if (userConfig?.fileHeader && typeof userConfig.fileHeader === 'object') {
		return {
			toolName: userConfig.fileHeader.toolName || 'three-forma-styli',
			toolVersion: userConfig.fileHeader.toolVersion || CLI_VERSION,
			includeTimestamp: userConfig.fileHeader.includeTimestamp,
			customLines: userConfig.fileHeader.customLines,
		};
	}
	return {
		toolName: 'three-forma-styli',
		toolVersion: CLI_VERSION,
	};
}

export interface BuildOptions {
	output?: string;
	format?: OutputFormat;
	collection?: string;
	colorSpace?: 'srgb' | 'display-p3';
	fontCss?: string;
}

function isProject(value: unknown): value is TfsProject {
	return Boolean(
		value && typeof value === 'object' && (value as TfsProject).kind === 'three-forma-styli/project'
	);
}

async function projectConfigPath(filePath: string): Promise<string | undefined> {
	const input = path.resolve(process.cwd(), filePath);
	if (!(await fs.pathExists(input))) return undefined;
	const stats = await fs.stat(input);
	if (!stats.isDirectory()) {
		return ['tfs.config.ts', 'tfs.config.js'].includes(path.basename(input)) ? input : undefined;
	}
	const candidates = ['tfs.config.ts', 'tfs.config.js'];
	const existing = [];
	for (const candidate of candidates) {
		const resolved = path.join(input, candidate);
		if (await fs.pathExists(resolved)) existing.push(resolved);
	}
	if (existing.length > 1) {
		throw new Error(`Multiple TFS project configs found: ${existing.join(', ')}`);
	}
	return existing[0];
}

export async function buildCommand(filePath: string, options: BuildOptions): Promise<void> {
	const possibleProjectPath = await projectConfigPath(filePath);
	let inputPath = possibleProjectPath ?? path.resolve(process.cwd(), filePath);
	if ((await fs.pathExists(inputPath)) && (await fs.stat(inputPath)).isDirectory()) {
		inputPath = path.join(inputPath, 'index.ts');
	}
	const loaded = await loadConfigModule(inputPath);
	const module = loaded.module as Record<string, any>;
	if (isProject(module.default)) {
		if (options.format || options.output || options.fontCss) {
			throw new Error(
				'Project builds own their output plan; omit --format, --output, and --font-css.'
			);
		}
		const result = await buildProject(module.default, loaded.inputPath);
		console.error(
			chalk.green(
				`✓ Built ${result.files.length} files in ${path.relative(process.cwd(), result.outputDirectory)}`
			)
		);
		return;
	}
	const exported = module.default || module.theme || module.designSystem;
	const designSystem: PartialDesignSystem =
		exported && !exported.colors && (exported.default || exported.designSystem)
			? exported.default || exported.designSystem
			: exported;
	const tokenFamilies = ['colors', 'spacing', 'gap', 'typography', 'border', 'time'] as const;
	if (!designSystem || !tokenFamilies.some((family) => designSystem[family])) {
		throw new Error(
			`No valid design system found. Export at least one token family: ${tokenFamilies.join(', ')}.`
		);
	}
	const userConfig: GenerateCssConfig | null =
		module.config || (module.default && module.default.config) || null;
	const fileHeader = resolveFileHeader(userConfig);
	const format = parseOutputFormat(options.format);
	if (options.fontCss && format !== 'specimen') {
		throw new Error('--font-css is only valid with --format specimen.');
	}
	let output: string;

	if (format === 'css') {
		console.error(chalk.cyan('Generating CSS variables...'));
		output = generateCss(designSystem, { ...userConfig, fileHeader });
	} else if (format === 'typescript') {
		console.error(chalk.cyan('Generating typed typography contract...'));
		output = generateTypographyTypescript(designSystem, userConfig ?? undefined);
	} else if (format === 'specimen') {
		console.error(chalk.cyan('Generating typography specimen...'));
		if (options.fontCss && !options.output) {
			throw new Error('--font-css requires --output so its relative font URLs remain valid.');
		}
		const fontCssPath = options.fontCss ? path.resolve(process.cwd(), options.fontCss) : undefined;
		if (fontCssPath && !(await fs.pathExists(fontCssPath))) {
			throw new Error(`Font CSS not found: ${fontCssPath}`);
		}
		const specimenOutputPath = options.output
			? path.resolve(process.cwd(), options.output)
			: undefined;
		const fontFaceHref =
			fontCssPath && specimenOutputPath
				? relativeStylesheetHref(specimenOutputPath, fontCssPath)
				: undefined;
		output = generateTypographySpecimen(designSystem, {
			generator: userConfig ?? undefined,
			specimen: { fontFaceHref },
		});
	} else {
		const figmaFormat: FigmaJsonFormat = format;
		console.error(chalk.cyan(`Generating design-token JSON (${figmaFormat})...`));
		output = generateFigmaJson(
			designSystem,
			{
				transformer: {
					fileHeader: fileHeader === false ? false : fileHeader,
					collectionName: options.collection,
					colorSpace: options.colorSpace,
				},
			},
			figmaFormat
		);
	}

	if (options.output) {
		const outputPath = path.resolve(process.cwd(), options.output);
		await fs.ensureDir(path.dirname(outputPath));
		await fs.writeFile(outputPath, output);
		console.error(chalk.green(`✓ Generated ${path.relative(process.cwd(), outputPath)}`));
	} else {
		process.stdout.write(output);
	}
}
