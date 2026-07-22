import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { classifyFontStyle, inspectFontFiles } from '../fonts/inspect.js';
import type { FontInspection } from '../fonts/inspect.js';
import {
	prepareFonts,
	type FontsPreparationConfig,
	type PreparedFontsManifest,
} from '../fonts/prepare.js';
import { loadConfigModule } from '../config/load-module.js';

export interface InspectFontsOptions {
	output?: string;
	json?: boolean;
}

function formatWeight(font: FontInspection): string {
	const axis = font.axes.wght;
	return axis ? `${axis.min}–${axis.max} (default ${axis.default})` : String(font.style.weight);
}

export function formatFontInspection(font: FontInspection): string {
	const style = classifyFontStyle(font);
	const axes = Object.entries(font.axes)
		.map(([tag, axis]) => `${tag} ${axis.min}–${axis.max}`)
		.join(', ');
	const lines = [
		chalk.bold(font.names.full),
		`  family    ${font.names.family}`,
		`  face      ${style}, weight ${formatWeight(font)}`,
		`  source    ${font.source.path} (${Math.round(font.source.bytes / 1024)} KB, ${font.source.format})`,
		`  coverage  ${font.coverage.glyphs} glyphs / ${font.coverage.codePoints} code points`,
	];
	if (axes) lines.push(`  axes      ${axes}`);
	for (const warning of font.warnings) lines.push(chalk.yellow(`  warning   ${warning}`));
	return lines.join('\n');
}

export async function inspectFontsCommand(
	filePaths: string[],
	options: InspectFontsOptions
): Promise<void> {
	const inspections = inspectFontFiles(filePaths);
	const manifest = { schemaVersion: 1, fonts: inspections } as const;
	const output = `${JSON.stringify(manifest, null, 2)}\n`;

	if (!options.output) {
		process.stdout.write(
			options.json ? output : `${inspections.map(formatFontInspection).join('\n\n')}\n`
		);
		return;
	}

	const outputPath = path.resolve(process.cwd(), options.output);
	await fs.ensureDir(path.dirname(outputPath));
	await fs.writeFile(outputPath, output);
	console.log(
		chalk.green(`✓ Inspected ${inspections.length} font face${inspections.length === 1 ? '' : 's'}`)
	);
	console.log(chalk.green(`✓ Generated ${path.relative(process.cwd(), outputPath)}`));
}

export interface PrepareFontsOptions {
	outputDirectory?: string;
}

function preparedWeight(weight: number | { min: number; max: number }): string {
	return typeof weight === 'number' ? String(weight) : `${weight.min}–${weight.max}`;
}

export function formatPreparedSummary(manifest: PreparedFontsManifest): string {
	const lines: string[] = [];
	const warnings: string[] = [];
	for (const [id, family] of Object.entries(manifest.families)) {
		const faces = family.faces
			.map((face) => `${face.style} ${preparedWeight(face.weight)}`)
			.join(', ');
		const strategies = [...new Set(family.faces.map((face) => face.strategy))].join('/');
		lines.push(`${id.padEnd(14)} ${faces} · ${strategies}`);
		for (const face of family.faces) {
			for (const warning of face.warnings) warnings.push(`${id}/${face.style}: ${warning}`);
		}
	}
	if (warnings.length > 0) {
		lines.push('', 'Warnings:', ...warnings.map((warning) => `- ${warning}`));
	}
	return lines.join('\n');
}

export async function prepareFontsCommand(
	filePath: string,
	options: PrepareFontsOptions
): Promise<void> {
	const loaded = await loadConfigModule(filePath);
	const exported = loaded.module.default ?? loaded.module.fontPreparation ?? loaded.module.fonts;
	if (!exported || typeof exported !== 'object') {
		throw new Error('Export a font preparation config as default, fontPreparation, or fonts.');
	}
	const config = structuredClone(exported) as FontsPreparationConfig;
	if (options.outputDirectory) {
		config.output = { ...config.output, directory: options.outputDirectory };
	}
	const result = await prepareFonts(config, path.dirname(loaded.inputPath));
	const faceCount = Object.values(result.manifest.families).reduce(
		(count, family) => count + family.faces.length,
		0
	);
	console.log(chalk.green(`✓ Prepared ${faceCount} font face${faceCount === 1 ? '' : 's'}`));
	console.log(chalk.green(`✓ CSS ${path.relative(process.cwd(), result.cssPath)}`));
	console.log(chalk.green(`✓ Manifest ${path.relative(process.cwd(), result.manifestPath)}`));
	console.log(`\n${formatPreparedSummary(result.manifest)}`);
	console.log(
		chalk.cyan(
			'\nNext: generate a specimen with tfs build --format specimen --font-css <fonts.css>'
		)
	);
}
