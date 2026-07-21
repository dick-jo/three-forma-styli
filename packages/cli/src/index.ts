#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { figmaSyncCommand } from './commands/figma-sync.js';
import { CLI_VERSION } from './version.js';

const program = new Command();

// Welcome message
console.log(chalk.magenta.bold('Three-Forma-Styli CLI'));
console.log(chalk.magenta('Design token generator\n'));

program
  .name('tfs')
  .description('TypeScript-first design token generator with luminance-based color control')
  .version(CLI_VERSION);

// Init command
program
  .command('init [project-name]')
  .description('Create a new theme project')
  .option('-t, --theme <name>', 'starter theme to use (skips prompt)')
  .option('--skip-install', 'skip automatic npm install')
  .action(async (projectName, options) => {
    await initCommand(projectName, options);
  });

// Build command
program
  .command('build <path>')
  .description('Generate design tokens from theme files')
  .option('-o, --output <path>', 'output file path (default: stdout)')
  .option('-f, --format <format>', 'output format: css, dtcg, figma-variables', 'css')
  .option('--collection <name>', 'Figma collection name', 'Color')
  .option('--color-space <space>', 'JSON color space: srgb or display-p3', 'srgb')
  .action(async (filePath, options) => {
    await buildCommand(filePath, options);
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

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
