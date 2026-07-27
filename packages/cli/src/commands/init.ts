import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { CLI_VERSION } from '../version.js';

const require = createRequire(import.meta.url);

export interface InitOptions {
	theme?: string;
	skipInstall?: boolean;
	workspacePackage?: boolean;
	packageName?: string;
	packageManager?: string;
}

const projectNamePattern = /^[a-z0-9][a-z0-9-]*$/;
const packageNamePartPattern = /^[a-z0-9][a-z0-9._-]*$/;
type PackageManager = 'npm' | 'pnpm' | 'yarn';

function projectNameError(value: string): string | undefined {
	if (!value.trim()) return 'Project name is required';
	if (!projectNamePattern.test(value)) {
		return 'Project name must use lowercase letters, numbers, and hyphens, and must not contain a path';
	}
	return undefined;
}

function packageNameError(value: string): string | undefined {
	if (!value || value.length > 214) return 'Package name must contain 1–214 characters';
	const parts = value.startsWith('@') ? value.slice(1).split('/') : [value];
	if (
		parts.length !== (value.startsWith('@') ? 2 : 1) ||
		parts.some((part) => !packageNamePartPattern.test(part))
	) {
		return 'Package name must be a lowercase npm name such as design-system or @repo/design-system';
	}
	return undefined;
}

function requestedPackageManager(value: string | undefined): PackageManager | undefined {
	if (value === undefined) return undefined;
	if (value === 'npm' || value === 'pnpm' || value === 'yarn') return value;
	throw new Error('--package-manager must be npm, pnpm, or yarn');
}

export async function initCommand(projectName?: string, options: InitOptions = {}): Promise<void> {
	try {
		// Step 1: Get project name (from arg or prompt)
		const name =
			projectName ||
			(await input({
				message: 'Project name:',
				default: 'my-design-system',
				validate: (value) => projectNameError(value) ?? true,
			}));
		const nameError = projectNameError(name);
		if (nameError) throw new Error(nameError);
		const packageName = options.packageName ?? name;
		const namePackageError = packageNameError(packageName);
		if (namePackageError) throw new Error(namePackageError);
		const explicitPackageManager = requestedPackageManager(options.packageManager);

		const targetDir = path.resolve(process.cwd(), name);
		const packageManager = await detectPackageManager(targetDir, explicitPackageManager);

		// Step 2: Check if directory already exists
		if (await fs.pathExists(targetDir)) {
			const contents = await fs.readdir(targetDir);
			if (contents.length > 0) {
				throw new Error(`Directory "${name}" already exists and is not empty`);
			}
		}

		// Step 3: Get available themes
		// Use require.resolve to find themes package regardless of install location
		const themesPackagePath = path.dirname(
			require.resolve('@three-forma-styli/themes/package.json')
		);
		const themesBasePath = path.join(themesPackagePath, 'src');
		const availableThemes = await getAvailableThemes(themesBasePath);

		if (availableThemes.length === 0) {
			throw new Error('No starter presets were found in @three-forma-styli/themes');
		}

		// Step 4: Select theme (from option or prompt)
		let themeName = options.theme;

		if (!themeName) {
			themeName = await select({
				message: 'Which starter preset?',
				choices: availableThemes.map((t) => ({
					name: t.name,
					value: t.name,
					description: t.description,
				})),
			});
		}

		// Match a discovered preset name exactly; never treat --theme as a filesystem path.
		if (!availableThemes.some((preset) => preset.name === themeName)) {
			throw new Error(
				`Starter preset "${themeName}" was not found. Available presets: ${availableThemes
					.map((preset) => preset.name)
					.join(', ')}`
			);
		}
		const themePath = path.join(themesBasePath, themeName);

		// Step 5: Create directory
		await fs.ensureDir(targetDir);

		// Step 6: Copy theme files
		const themeFiles = await fs.readdir(themePath);
		const familyOrder = ['color', 'spacing', 'gap', 'typography', 'border', 'time'];
		const themeSourceFiles = themeFiles
			.filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'index.ts')
			.sort((left, right) => {
				const leftIndex = familyOrder.indexOf(left.replace('.ts', ''));
				const rightIndex = familyOrder.indexOf(right.replace('.ts', ''));
				return (
					(leftIndex < 0 ? Infinity : leftIndex) - (rightIndex < 0 ? Infinity : rightIndex) ||
					left.localeCompare(right)
				);
			});

		for (const file of themeSourceFiles) {
			const sourcePath = path.join(themePath, file);
			const destPath = path.join(targetDir, file);
			await fs.copy(sourcePath, destPath);
		}
		// Step 7: Generate the programmatic source export and project config
		const moduleNames = themeSourceFiles.map((f) => f.replace('.ts', ''));
		const indexContent = generateIndexFile(moduleNames);
		await fs.writeFile(path.join(targetDir, 'index.ts'), indexContent);
		await fs.writeFile(
			path.join(targetDir, 'tfs.config.ts'),
			generateProjectFile(moduleNames, options.workspacePackage === true)
		);

		// Step 8: Generate package metadata and local instructions
		const packageJsonContent = generatePackageJson(packageName, options.workspacePackage === true);
		await fs.writeFile(path.join(targetDir, 'package.json'), packageJsonContent);

		// Step 9: Generate TypeScript config
		const tsconfigContent = generateTsConfig();
		await fs.writeFile(path.join(targetDir, 'tsconfig.json'), tsconfigContent);
		await fs.writeFile(
			path.join(targetDir, 'README.md'),
			generateReadme(name, options.workspacePackage === true)
		);

		// Summary
		const allFiles = [
			...themeSourceFiles,
			'index.ts',
			'README.md',
			'tfs.config.ts',
			'package.json',
			'tsconfig.json',
		].sort();
		console.log(chalk.green(`\n✓ Created ${name}/ with the ${themeName} preset\n`));
		console.log(chalk.gray('Files:'));
		allFiles.forEach((f) => console.log(chalk.gray(`  ${name}/${f}`)));

		// Step 10: Install dependencies
		if (!options.skipInstall) {
			console.log(chalk.cyan('\nInstalling dependencies...'));

			try {
				execFileSync(packageManager, ['install'], {
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
		if (options.skipInstall) console.log(chalk.white(`  ${packageManager} install`));
		console.log(chalk.white(`  # Edit the authored TypeScript source`));
		console.log(chalk.white(`  npm run generate`));
		const generatedDirectory = options.workspacePackage ? 'generated' : 'dist';
		const specimen = options.workspacePackage
			? 'review/typography.html'
			: 'typography.specimen.html';
		console.log(
			chalk.white(
				`  # Inspect ${generatedDirectory}/build.manifest.json and ${generatedDirectory}/${specimen}`
			)
		);
	} catch (error: unknown) {
		// Handle Ctrl+C gracefully
		if (error instanceof Error && error.name === 'ExitPromptError') {
			console.log(chalk.gray('\n\nCancelled'));
			return;
		}
		throw error;
	}
}

/**
 * Get available themes from the themes package
 */
async function getAvailableThemes(
	themesBasePath: string
): Promise<Array<{ name: string; description: string }>> {
	if (!(await fs.pathExists(themesBasePath))) {
		return [];
	}

	const entries = await fs.readdir(themesBasePath, { withFileTypes: true });
	const themes: Array<{ name: string; description: string }> = [];

	for (const entry of entries) {
		if (entry.isDirectory() && entry.name !== 'legacy') {
			// Could read a theme.json for description in future
			const descriptions: Record<string, string> = {
				default: 'Clean, minimal dark theme',
			};
			themes.push({
				name: entry.name,
				description: descriptions[entry.name] || 'Custom theme',
			});
		}
	}

	return themes.sort((left, right) => left.name.localeCompare(right.name));
}

function generateProjectFile(moduleNames: string[], workspacePackage: boolean): string {
	const imports = moduleNames.map((name) => `import { ${name} } from "./${name}.js";`).join('\n');
	const properties = moduleNames
		.map((name) => (name === 'color' ? '    colors: color,' : `    ${name},`))
		.join('\n');
	const output = workspacePackage
		? `    layout: "workspace-package",
    directory: "./generated",
    targets: {
      runtime: true,
      review: true,
      design: true,
    },`
		: `    directory: "./dist",
    css: true,
    indexCss: true,
    typographyCss: true,
    typographyModule: true,
    typescript: true,
    systemTypescript: true,
    specimen: true,
    dtcg: true,
    figmaVariables: true,`;
	return `import { defineTfsProject } from "@three-forma-styli/compiler";
${imports}

export default defineTfsProject({
  system: {
${properties}
  },
  output: {
${output}
  },
});
`;
}

/**
 * Generate index.ts content
 */
function generateIndexFile(moduleNames: string[]): string {
	const moduleImports = moduleNames
		.map((name) => `import { ${name} } from "./${name}.js";`)
		.join('\n');

	const systemProperties = moduleNames
		.map((name) => {
			if (name === 'color') return '  colors: color,';
			return `  ${name},`;
		})
		.join('\n');

	const exportList = moduleNames.join(', ');

	return `import type { DesignSystem } from "@three-forma-styli/core";
${moduleImports}

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
function generatePackageJson(packageName: string, workspacePackage: boolean): string {
	const scripts = {
		generate: 'tfs build .',
		build: 'tfs validate .',
		check: 'tsc --noEmit && tfs validate .',
		'check:generated': 'tfs check .',
		review: 'tfs review serve .',
	};
	const workspaceFields = workspacePackage
		? {
				files: ['generated/runtime', 'generated/assets', 'README.md'],
				sideEffects: ['./generated/runtime/styles/*.css'],
				exports: {
					'.': {
						types: './generated/runtime/index.d.ts',
						import: './generated/runtime/index.js',
					},
					'./system': {
						types: './generated/runtime/system.d.ts',
						import: './generated/runtime/system.js',
					},
					'./typography': {
						types: './generated/runtime/typography.d.ts',
						import: './generated/runtime/typography.js',
					},
					'./native-color-modes': {
						types: './generated/runtime/native-color-modes.d.ts',
						import: './generated/runtime/native-color-modes.js',
					},
					'./runtime-color-theme': {
						types: './generated/runtime/runtime-color-theme.d.ts',
						import: './generated/runtime/runtime-color-theme.js',
					},
					'./styles.css': './generated/runtime/styles/index.css',
					'./tokens.css': './generated/runtime/styles/tokens.css',
					'./typography.css': './generated/runtime/styles/typography.css',
					'./typography.module.css': {
						types: './generated/runtime/styles/typography.module.css.d.ts',
						default: './generated/runtime/styles/typography.module.css',
					},
					'./shadows.css': './generated/runtime/styles/shadows.css',
					'./shadows.module.css': {
						types: './generated/runtime/styles/shadows.module.css.d.ts',
						default: './generated/runtime/styles/shadows.module.css',
					},
					'./package.json': './package.json',
				},
			}
		: {};
	return (
		JSON.stringify(
			{
				name: packageName,
				...(workspacePackage ? { version: '0.0.0' } : {}),
				private: true,
				type: 'module',
				...workspaceFields,
				scripts,
				...(workspacePackage ? {} : { dependencies: { '@three-forma-styli/core': CLI_VERSION } }),
				devDependencies: {
					'@three-forma-styli/cli': CLI_VERSION,
					'@three-forma-styli/compiler': CLI_VERSION,
					...(workspacePackage ? { '@three-forma-styli/core': CLI_VERSION } : {}),
					typescript: '5.9.3',
				},
				engines: { node: '>=22' },
			},
			null,
			2
		) + '\n'
	);
}

/**
 * Generate tsconfig.json
 */
function generateTsConfig(): string {
	return (
		JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'NodeNext',
					moduleResolution: 'NodeNext',
					resolveJsonModule: true,
					esModuleInterop: true,
					skipLibCheck: true,
					strict: true,
					lib: ['ES2022'],
					noEmit: true,
				},
				include: ['*.ts'],
			},
			null,
			2
		) + '\n'
	);
}

function generateReadme(projectName: string, workspacePackage: boolean): string {
	if (workspacePackage) {
		return `# ${projectName}

Private, package-shaped design-system source generated by Three-Forma-Styli.

## Commands

\`\`\`sh
npm run check             # fast type + committed-package validation; no FontTools
npm run generate          # explicit authoring operation; replace generated/
npm run check:generated   # CI proof; regenerate privately and reject drift
npm run review            # serve the generated visual workbench
\`\`\`

Edit the root TypeScript source files and \`tfs.config.ts\`; do not hand-edit
\`generated/\`. Applications consume the declared package exports, especially
\`./styles.css\` and the generated TypeScript contracts. Review and design-tool
artifacts stay outside the package export boundary.
`;
	}
	return `# ${projectName}

Portable design-system source generated by Three-Forma-Styli.

## Commands

\`\`\`sh
npm run generate          # explicit authoring operation; replace dist/
npm run build             # validate the committed handoff; never writes
npm run check             # fast types + committed-output validation
npm run check:generated   # CI proof; regenerate privately and reject drift
npm run review            # serve the generated visual workbench
\`\`\`

Edit the root TypeScript source files and \`tfs.config.ts\`; do not hand-edit
\`dist/\`. A successful build writes \`dist/build.manifest.json\`, which records
the exact generated files and tool version.
`;
}

/**
 * Detect available package manager
 */
async function nearestPackageManager(start: string): Promise<PackageManager | undefined> {
	let current = path.resolve(start);
	while (true) {
		const manifest = path.join(current, 'package.json');
		if (await fs.pathExists(manifest)) {
			try {
				const value = (await fs.readJson(manifest)).packageManager;
				if (typeof value === 'string') {
					const manager = value.split('@')[0];
					if (manager === 'npm' || manager === 'pnpm' || manager === 'yarn') return manager;
				}
			} catch {
				// The generated package remains authoritative; an invalid ancestor is ignored here.
			}
		}
		for (const [file, manager] of [
			['pnpm-lock.yaml', 'pnpm'],
			['yarn.lock', 'yarn'],
			['package-lock.json', 'npm'],
			['npm-shrinkwrap.json', 'npm'],
		] as const) {
			if (await fs.pathExists(path.join(current, file))) return manager;
		}
		const parent = path.dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

async function detectPackageManager(
	start: string,
	explicit?: PackageManager
): Promise<PackageManager> {
	if (explicit) return explicit;
	const userAgent = process.env.npm_config_user_agent?.split('/')[0];
	if (userAgent === 'npm' || userAgent === 'pnpm' || userAgent === 'yarn') return userAgent;
	const nearest = await nearestPackageManager(start);
	if (nearest) return nearest;
	try {
		execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--version'], {
			stdio: 'ignore',
			shell: process.platform === 'win32',
		});
		return 'pnpm';
	} catch {
		try {
			execFileSync(process.platform === 'win32' ? 'yarn.cmd' : 'yarn', ['--version'], {
				stdio: 'ignore',
				shell: process.platform === 'win32',
			});
			return 'yarn';
		} catch {
			return 'npm';
		}
	}
}
