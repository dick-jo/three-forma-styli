#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';

const program = new Command();

// Welcome message
console.log(chalk.magenta.bold('Three-Forma-Styli CLI'));
console.log(chalk.magenta('Design token generator\n'));

program
  .name('tfs')
  .description('TypeScript-first design token generator with luminosity-based color control')
  .version('1.0.0');

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
  .description('Generate CSS from theme files (directory or index.ts file)')
  .option('-o, --output <path>', 'output CSS file path (default: stdout)')
  .action(async (filePath, options) => {
    await buildCommand(filePath, options);
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
