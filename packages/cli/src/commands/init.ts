import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { input, select } from '@inquirer/prompts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

export interface InitOptions {
  theme?: string;
  skipInstall?: boolean;
}

export async function initCommand(projectName?: string, options: InitOptions = {}): Promise<void> {
  try {
    // Step 1: Get project name (from arg or prompt)
    const name = projectName || await input({
      message: 'Project name:',
      default: 'my-theme',
      validate: (value) => {
        if (!value.trim()) return 'Project name is required';
        if (!/^[a-z0-9-_]+$/i.test(value)) return 'Project name can only contain letters, numbers, hyphens, and underscores';
        return true;
      }
    });

    const targetDir = path.resolve(process.cwd(), name);

    // Step 2: Check if directory already exists
    if (await fs.pathExists(targetDir)) {
      const contents = await fs.readdir(targetDir);
      if (contents.length > 0) {
        console.error(chalk.red(`\n✗ Directory "${name}" already exists and is not empty`));
        process.exit(1);
      }
    }

    // Step 3: Get available themes
    // Use require.resolve to find themes package regardless of install location
    const themesPackagePath = path.dirname(require.resolve('@three-forma-styli/themes/package.json'));
    const themesBasePath = path.join(themesPackagePath, 'src');
    const availableThemes = await getAvailableThemes(themesBasePath);

    if (availableThemes.length === 0) {
      console.error(chalk.red('✗ No themes found'));
      process.exit(1);
    }

    // Step 4: Select theme (from option or prompt)
    let themeName = options.theme;

    if (!themeName) {
      themeName = await select({
        message: 'Which starter theme?',
        choices: availableThemes.map(t => ({
          name: t.name,
          value: t.name,
          description: t.description
        }))
      });
    }

    // Validate theme exists
    const themePath = path.join(themesBasePath, themeName);
    if (!await fs.pathExists(themePath)) {
      console.error(chalk.red(`\n✗ Theme "${themeName}" not found`));
      console.error(chalk.yellow(`  Available themes: ${availableThemes.map(t => t.name).join(', ')}`));
      process.exit(1);
    }

    // Step 5: Create directory
    await fs.ensureDir(targetDir);

    // Step 6: Copy theme files
    const themeFiles = await fs.readdir(themePath);
    const themeSourceFiles = themeFiles.filter(f =>
      f.endsWith('.ts') &&
      !f.endsWith('.d.ts') &&
      f !== 'index.ts'
    );

    for (const file of themeSourceFiles) {
      const sourcePath = path.join(themePath, file);
      const destPath = path.join(targetDir, file);
      await fs.copy(sourcePath, destPath);
    }

    // Step 7: Generate config.ts
    const configContent = generateConfigFile();
    await fs.writeFile(path.join(targetDir, 'config.ts'), configContent);

    // Step 8: Generate index.ts
    const moduleNames = themeSourceFiles.map(f => f.replace('.ts', ''));
    const indexContent = generateIndexFile(moduleNames);
    await fs.writeFile(path.join(targetDir, 'index.ts'), indexContent);

    // Step 9: Generate package.json
    const packageJsonContent = generatePackageJson(name);
    await fs.writeFile(path.join(targetDir, 'package.json'), packageJsonContent);

    // Step 10: Generate tsconfig.json
    const tsconfigContent = generateTsConfig();
    await fs.writeFile(path.join(targetDir, 'tsconfig.json'), tsconfigContent);

    // Summary
    const allFiles = [...themeSourceFiles, 'config.ts', 'index.ts', 'package.json', 'tsconfig.json'].sort();
    console.log(chalk.green(`\n✓ Created ${name}/ with ${themeName} theme\n`));
    console.log(chalk.gray('Files:'));
    allFiles.forEach(f => console.log(chalk.gray(`  ${name}/${f}`)));

    // Step 11: Install dependencies
    if (!options.skipInstall) {
      console.log(chalk.cyan('\nInstalling dependencies...'));

      try {
        const packageManager = detectPackageManager();
        execSync(`${packageManager} install`, {
          cwd: targetDir,
          stdio: 'inherit',
        });
        console.log(chalk.green(`\n✓ Dependencies installed`));
      } catch {
        console.log(chalk.yellow('\n⚠ Failed to install dependencies automatically'));
        console.log(chalk.yellow(`  Run 'cd ${name} && npm install' manually`));
      }
    }

    // Next steps
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.white(`  cd ${name}`));
    console.log(chalk.white(`  # Edit color.ts, spacing.ts, etc.`));
    console.log(chalk.white(`  npx tfs build . --output tokens.css`));

  } catch (error: any) {
    // Handle Ctrl+C gracefully
    if (error.name === 'ExitPromptError') {
      console.log(chalk.gray('\n\nCancelled'));
      process.exit(0);
    }
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

/**
 * Get available themes from the themes package
 */
async function getAvailableThemes(themesBasePath: string): Promise<Array<{ name: string; description: string }>> {
  if (!await fs.pathExists(themesBasePath)) {
    return [];
  }

  const entries = await fs.readdir(themesBasePath, { withFileTypes: true });
  const themes: Array<{ name: string; description: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Could read a theme.json for description in future
      const descriptions: Record<string, string> = {
        'default': 'Clean, minimal dark theme',
      };
      themes.push({
        name: entry.name,
        value: entry.name,
        description: descriptions[entry.name] || 'Custom theme'
      } as { name: string; description: string });
    }
  }

  return themes;
}

/**
 * Generate config.ts content
 */
function generateConfigFile(): string {
  return `import type { GeneratorConfig } from "@three-forma-styli/core";

/**
 * CSS Generation Configuration
 *
 * Customize how your design tokens are converted to CSS variables.
 * All fields are optional — defaults are used for anything not specified.
 */
export const config: GeneratorConfig = {
  // Uncomment and modify to customize:

  // prefixes: {
  //   color: "clr",        // --clr-primary
  //   spacing: "sp",       // --sp-1
  //   gap: "gap",          // --gap-s
  //   typography: "fs",    // --fs-1
  //   borderRadius: "bdr", // --bdr-s
  //   borderWidth: "bdw",  // --bdw
  //   time: "t",           // --t-1
  // },

  // selectors: {
  //   root: ":root",
  //   colorMode: '[data-color-mode="{mode}"]',
  //   sizeMode: '[data-size-mode="{mode}"]',
  //   timeMode: '[data-time-mode="{mode}"]',
  // },
};
`;
}

/**
 * Generate index.ts content
 */
function generateIndexFile(moduleNames: string[]): string {
  const moduleImports = moduleNames
    .map(name => `import { ${name} } from "./${name}";`)
    .join('\n');

  const systemProperties = moduleNames
    .map(name => {
      if (name === 'color') return '  colors: color,';
      return `  ${name},`;
    })
    .join('\n');

  const exportList = [...moduleNames, 'config'].join(', ');

  return `import { DesignSystem } from "@three-forma-styli/core";
${moduleImports}
import { config } from "./config";

export const designSystem: DesignSystem = {
${systemProperties}
};

export default designSystem;

export { ${exportList} };
`;
}

/**
 * Generate package.json
 */
function generatePackageJson(projectName: string): string {
  return JSON.stringify({
    name: projectName,
    version: "1.0.0",
    private: true,
    type: "module",
    dependencies: {
      "@three-forma-styli/core": "latest"
    }
  }, null, 2) + '\n';
}

/**
 * Generate tsconfig.json
 */
function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "node",
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      lib: ["ES2020"]
    },
    include: ["*.ts"]
  }, null, 2) + '\n';
}

/**
 * Detect available package manager
 */
function detectPackageManager(): string {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {
    try {
      execSync('yarn --version', { stdio: 'ignore' });
      return 'yarn';
    } catch {
      return 'npm';
    }
  }
}
