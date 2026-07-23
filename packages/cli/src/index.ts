#!/usr/bin/env node

import { Command, CommanderError } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { figmaSyncCommand } from './commands/figma-sync.js';
import { inspectFontsCommand, prepareFontsCommand } from './commands/fonts.js';
import { serveSpecimenCommand } from './commands/specimen.js';
import { checkCommand } from './commands/check.js';
import { validateCommand } from './commands/validate.js';
import { CLI_VERSION } from './version.js';
import { writeMachineError } from './output.js';

const program = new Command();
const jsonRequested = process.argv.includes('--json');
const noColorRequested = jsonRequested || process.argv.includes('--no-color');
if (noColorRequested) chalk.level = 0;

program.exitOverride();
program.configureOutput({
	writeErr: (value) => {
		if (!jsonRequested) process.stderr.write(value);
	},
});

// Keep redirected and explicitly requested machine output machine-readable.
if (process.stdout.isTTY && !process.argv.includes('--json')) {
	console.log(chalk.magenta.bold('Three-Forma-Styli CLI'));
	console.log(chalk.magenta('Design token generator\n'));
}

program
	.name('tfs')
	.description('TypeScript-first design token generator with luminance-based color control')
	.version(CLI_VERSION)
	.option('--no-color', 'disable ANSI color output');

// Init command
program
	.command('init [project-name]')
	.description('Create a new theme project')
	.option('-t, --theme <name>', 'starter theme to use (skips prompt)')
	.option('--workspace-package', 'scaffold a monorepo-ready generated package boundary')
	.option('--package-name <name>', 'package.json name (for example @repo/design-system)')
	.option('--package-manager <manager>', 'installer: npm, pnpm, or yarn')
	.option('--skip-install', 'skip automatic npm install')
	.action(async (projectName, options) => {
		await initCommand(projectName, options);
	});

// Build command
program
	.command('build <path>')
	.description('Generate design tokens from theme files')
	.option('-o, --output <path>', 'output file path (default: stdout)')
	.option(
		'-f, --format <format>',
		'output format: css, dtcg, figma-variables, typescript, specimen'
	)
	.option('--collection <name>', 'Figma collection name', 'Color')
	.option('--color-space <space>', 'JSON color space: srgb or display-p3', 'srgb')
	.option('--font-css <path>', 'generated @font-face CSS to link from specimen output')
	.option('--dry-run', 'resolve and validate the project artifact graph without writing')
	.option('--json', 'emit the stable machine-readable command envelope')
	.action(async (filePath, options) => {
		await buildCommand(filePath, options);
	});

program
	.command('check <path>')
	.description('Regenerate privately and fail when committed project output has drifted')
	.option('--json', 'emit the stable machine-readable command envelope')
	.action(async (filePath, options) => {
		await checkCommand(filePath, options);
	});

program
	.command('validate <path>')
	.description('Validate committed artifacts and package wiring without regeneration')
	.option('--json', 'emit the stable machine-readable command envelope')
	.action(async (filePath, options) => {
		await validateCommand(filePath, options);
	});

// Figma sync command
program
	.command('figma-sync <path>')
	.description('Sync design tokens to Figma via Variables API')
	.requiredOption('--file-key <key>', 'Figma file key (from URL)')
	.option('--figma-token <token>', 'Figma personal access token (prefer FIGMA_TOKEN env)')
	.option('--collection <name>', 'Figma collection name', 'Color')
	.option('--color-space <space>', 'target Figma file color space: srgb or display-p3', 'srgb')
	.option('--dry-run', 'show payload without sending to Figma')
	.action(async (filePath, options) => {
		await figmaSyncCommand(filePath, {
			fileKey: options.fileKey,
			token: options.figmaToken,
			collectionName: options.collection,
			colorSpace: options.colorSpace,
			dryRun: options.dryRun,
		});
	});

const fontsCommand = program.command('fonts').description('Inspect and prepare local font assets');

fontsCommand
	.command('inspect <files...>')
	.description('Inspect font names, weights, axes, metrics, features, and embedding flags')
	.option('-o, --output <path>', 'write the inspection manifest to a JSON file')
	.option('--json', 'print the inspection manifest as JSON')
	.action(async (filePaths, options) => {
		await inspectFontsCommand(filePaths, options);
	});

const specimenCommand = program
	.command('specimen')
	.description('Review generated typography specimens');

specimenCommand
	.command('serve [path]')
	.description('Serve a project or generated specimen over localhost')
	.option('-p, --port <port>', 'localhost port (default: first available from 4173)')
	.option('--host <host>', 'host interface', '127.0.0.1')
	.option('--open', 'open the specimen in the default browser')
	.action(async (targetPath, options) => {
		await serveSpecimenCommand(targetPath, options);
	});

fontsCommand
	.command('prepare <path>')
	.description('Prepare licensed font assets and generate @font-face CSS plus a manifest')
	.option('-o, --output-directory <path>', 'override the configured output directory')
	.action(async (filePath, options) => {
		await prepareFontsCommand(filePath, options);
	});

async function main(): Promise<void> {
	try {
		await program.parseAsync(process.argv);
	} catch (error) {
		if (
			error instanceof CommanderError &&
			(error.code === 'commander.helpDisplayed' || error.code === 'commander.version')
		) {
			return;
		}
		const message = error instanceof Error ? error.message : String(error);
		const usageError = error instanceof CommanderError;
		const exitCode = usageError ? 2 : 1;
		const command = commandName(process.argv.slice(2));
		if (jsonRequested) {
			writeMachineError({
				schemaVersion: 1,
				command,
				status: 'error',
				exitCode,
				diagnostic: {
					id: usageError
						? 'TFS_CLI_USAGE'
						: `TFS_${command.toUpperCase().replace(/-/g, '_')}_FAILED`,
					message,
				},
			});
		} else {
			console.error(chalk.red('Error:'), message);
		}
		process.exitCode = exitCode;
	}

	if (!process.argv.slice(2).length) {
		program.outputHelp();
	}
}

function commandName(arguments_: string[]): string {
	const first = arguments_.find((argument) => !argument.startsWith('-'));
	return first ?? 'cli';
}

void main();
