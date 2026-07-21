import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import * as esbuild from 'esbuild';
import {
  generateCss,
  generateFigmaJson,
  type DesignSystem,
  type GenerateCssConfig,
  type FigmaJsonFormat,
} from '@three-forma-styli/core';
import { CLI_VERSION } from '../version.js';

export type OutputFormat = 'css' | 'dtcg' | 'figma-variables';

const outputFormats: OutputFormat[] = ['css', 'dtcg', 'figma-variables'];

export function parseOutputFormat(value: string | undefined): OutputFormat {
  const format = value ?? 'css';
  if (!outputFormats.includes(format as OutputFormat)) {
    throw new Error(`Unsupported output format "${format}". Expected one of: ${outputFormats.join(', ')}`);
  }
  return format as OutputFormat;
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
}

export async function buildCommand(filePath: string, options: BuildOptions): Promise<void> {
  let tempFile: string | null = null;

  try {
    // Resolve the input file path
    // If user provides ".", look for index.ts in current directory
    let inputPath = path.resolve(process.cwd(), filePath);

    // If path is a directory, look for index.ts inside it
    if (await fs.pathExists(inputPath)) {
      const stats = await fs.stat(inputPath);
      if (stats.isDirectory()) {
        inputPath = path.join(inputPath, 'index.ts');
      }
    }

    // Check if file exists
    if (!await fs.pathExists(inputPath)) {
      console.error(chalk.red(`✗ File not found: ${inputPath}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`Building theme from: ${path.relative(process.cwd(), inputPath)}`));

    // Compile TypeScript to a temp JS file using esbuild
    tempFile = path.join(os.tmpdir(), `tfs-theme-${Date.now()}.mjs`);

    try {
      await esbuild.build({
        entryPoints: [inputPath],
        bundle: true,
        outfile: tempFile,
        format: 'esm',
        platform: 'node',
        target: 'node18',
        // Don't treat @three-forma-styli/core as external - bundle it in
        // This ensures the compiled file is self-contained
      });
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to compile theme file'));
      console.error(chalk.yellow(error.message));
      console.error(chalk.yellow('\nMake sure your theme file:'));
      console.error(chalk.yellow('  - Uses valid TypeScript syntax'));
      console.error(chalk.yellow('  - Has @three-forma-styli/core installed (run npm install)'));
      process.exit(1);
    }

    // Import the compiled JS file
    let designSystem: DesignSystem;
    let userConfig: GenerateCssConfig | null = null;

    try {
      // Add cache-busting query param to avoid Node's module cache
      const module = await import(`${tempFile}?t=${Date.now()}`);

      // Try to find the design system export
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exported: any = module.default || module.theme || module.designSystem;

      // If the default export contains nested default/designSystem, unwrap it
      if (exported && !exported.colors && (exported.default || exported.designSystem)) {
        designSystem = exported.default || exported.designSystem;
      } else {
        designSystem = exported;
      }

      if (!designSystem || !designSystem.colors) {
        throw new Error('No valid design system found. Export must have a colors property.');
      }

      // Check if user exported a config (optional)
      userConfig = module.config || (module.default && module.default.config) || null;

    } catch (error: any) {
      console.error(chalk.red('✗ Failed to load compiled theme'));
      console.error(chalk.yellow(error.message));
      console.error(chalk.yellow('\nMake sure your theme file:'));
      console.error(chalk.yellow('  - Has a default export or named export (theme/designSystem)'));
      console.error(chalk.yellow('  - The export has a colors property'));
      process.exit(1);
    }

    // Resolve file header config
    const fileHeader = resolveFileHeader(userConfig);

    // Determine output format
    const format = parseOutputFormat(options.format);
    let output: string;

    if (format === 'css') {
      console.log(chalk.cyan('Generating CSS variables...'));
      const finalConfig: GenerateCssConfig = { ...userConfig, fileHeader };
      output = generateCss(designSystem, finalConfig);
    } else {
      const figmaFormat: FigmaJsonFormat = format;
      console.log(chalk.cyan(`Generating design-token JSON (${figmaFormat})...`));
      output = generateFigmaJson(designSystem, {
        transformer: {
          fileHeader: fileHeader === false ? false : fileHeader,
          collectionName: options.collection,
          colorSpace: options.colorSpace,
        },
      }, figmaFormat);
    }

    // Output
    if (options.output) {
      const outputPath = path.resolve(process.cwd(), options.output);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, output);
      console.log(chalk.green(`✓ Generated ${path.relative(process.cwd(), outputPath)}`));
    } else {
      // Print to stdout
      console.log('\n' + chalk.gray('─'.repeat(50)));
      console.log(output);
      console.log(chalk.gray('─'.repeat(50)));
    }

  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);

  } finally {
    // Clean up temp file
    if (tempFile && await fs.pathExists(tempFile)) {
      await fs.remove(tempFile);
    }
  }
}
