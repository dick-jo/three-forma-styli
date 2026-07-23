import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { buildProject, checkProject, planProject } from './project-build.js';
import { defineTfsProject } from './project.js';
import { validateProjectOutput } from './validate-output.js';
import { typography as defaultTypography } from '@three-forma-styli/themes/default';

const temporaryDirectories: string[] = [];

// Tiny synthetic regular TTF covering the versioned Latin calibration corpus.
const TEST_FONT_BASE64 = [
	'AAEAAAAKAIAAAwAgT1MvMke8RmIAAAEoAAAAYGNtYXAAzQA8AAABxAAAADxnbHlm16fXiwAAAjwAAAKkaGVhZC4Uo9oAAACsAAAA',
	'NmhoZWEEsgJaAAAA5AAAACRobXR4AlgAAAAAAYgAAAA6bG9jYQk+CJUAAAIAAAAAOm1heHAAHgAGAAABCAAAACBuYW1lkilG8AAA',
	'BOAAAAG2cG9zdAADAAAAAAaYAAAAIAABAAAAAQAAw+hol18PPPUAAQPoAAAAAOaGMB8AAAAA5oYwHwAyAAABwgK8AAAAAwACAAAA',
	'AAAAAAEAAAMg/zgAAAJYAAAAyAGQAAEAAAAAAAAAAAAAAAAAAAABAAEAAAAcAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwJY',
	'AZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAPz8/PwAAACAAegMg/zgAAAMgAMgA',
	'AAAAAAAAAAH0ArwAAAAgAAACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
	'AAAAAAACAAAAAwAAABQAAwABAAAAFAAEACgAAAAGAAQAAQACACAAev//AAAAIABh////4f+hAAEAAAAAAAAAAAAAAAAADQAaACcA',
	'NABBAE4AWwBoAHUAggCPAJwAqQC2AMMA0ADdAOoA9wEEAREBHgErATgBRQFSAAAAAQAyAAABwgK8AAMAADMhESEyAZD+cAK8AAAB',
	'ADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEyAZD+cAK8',
	'AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEyAZD+',
	'cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMhESEy',
	'AZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMAADMh',
	'ESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8AAMA',
	'ADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAABwgK8',
	'AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAAB',
	'wgK8AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAy',
	'AAABwgK8AAMAADMhESEyAZD+cAK8AAABADIAAAHCArwAAwAAMyERITIBkP5wArwAAAAADACWAAEAAAAAAAEADQAAAAEAAAAAAAIA',
	'BwANAAEAAAAAAAMAGQAUAAEAAAAAAAQAFQAtAAEAAAAAAAUACwBCAAEAAAAAAAYAEwBNAAMAAQQJAAEAGgBgAAMAAQQJAAIADgB6',
	'AAMAAQQJAAMAMgCIAAMAAQQJAAQAKgC6AAMAAQQJAAUAFgDkAAMAAQQJAAYAJgD6VEZTIFRlc3QgU2Fuc1JlZ3VsYXJURlMgVGVz',
	'dCBTYW5zIFJlZ3VsYXIgMS4wVEZTIFRlc3QgU2FucyBSZWd1bGFyVmVyc2lvbiAxLjBURlNUZXN0U2Fucy1SZWd1bGFyAFQARgBT',
	'ACAAVABlAHMAdAAgAFMAYQBuAHMAUgBlAGcAdQBsAGEAcgBUAEYAUwAgAFQAZQBzAHQAIABTAGEAbgBzACAAUgBlAGcAdQBsAGEA',
	'cgAgADEALgAwAFQARgBTACAAVABlAHMAdAAgAFMAYQBuAHMAIABSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAxAC4AMABU',
	'AEYAUwBUAGUAcwB0AFMAYQBuAHMALQBSAGUAZwB1AGwAYQByAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
].join('');

async function fixtureDirectory(): Promise<string> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-project-test-'));
	temporaryDirectories.push(directory);
	await fs.writeFile(path.join(directory, 'tfs.config.ts'), 'export default {}\n');
	return directory;
}

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)));
});

describe('portable project build', () => {
	it('plans exact authored outputs and external font prerequisites without writing', async () => {
		const directory = await fixtureDirectory();
		await fs.writeFile(path.join(directory, 'proof.ttf'), 'not inspected during planning');
		await fs.writeFile(path.join(directory, 'LICENSE.txt'), 'test');
		const project = defineTfsProject({
			fonts: {
				proof: {
					family: 'Proof',
					sources: ['./proof.ttf'],
					license: {
						id: 'test',
						file: './LICENSE.txt',
						allowWebEmbedding: true,
						allowTransformations: true,
						webEmbeddingBasis: 'test fixture',
					},
				},
			},
			system: {},
			output: { directory: './dist', css: true },
		});
		const plan = await planProject(project, path.join(directory, 'tfs.config.ts'));

		expect(plan.output).toEqual({
			layout: 'flat',
			directory: path.join(directory, 'dist'),
			ownership: 'atomic-directory',
		});
		expect(plan.artifacts.map((artifact) => artifact.path)).toEqual(
			expect.arrayContaining([
				'build.manifest.json',
				'fonts/proof.woff2',
				'fonts/fonts.css',
				'fonts/fonts.manifest.json',
				'fonts/licenses/proof-LICENSE.txt',
				'tokens.css',
			])
		);
		expect(plan.fonts.sources).toMatchObject([
			{ font: 'proof', output: 'proof.woff2', strategy: 'woff2', exists: true },
		]);
		expect(plan.prerequisites.externalTools).toMatchObject([
			{ id: 'fonttools', requiredBy: ['proof/proof.woff2'] },
		]);
		expect(await fs.pathExists(path.join(directory, 'dist'))).toBe(false);
	});

	it('builds and replaces one deterministic owned output tree', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: {
				directory: './dist',
				css: true,
				indexCss: true,
				typographyCss: true,
				typographyModule: true,
				typescript: true,
				systemTypescript: true,
				specimen: true,
			},
		});
		const configPath = path.join(directory, 'tfs.config.ts');
		const first = await buildProject(project, configPath);
		const firstManifest = await fs.readFile(
			path.join(first.outputDirectory, 'build.manifest.json')
		);
		const second = await buildProject(project, configPath);
		const secondManifest = await fs.readFile(
			path.join(second.outputDirectory, 'build.manifest.json')
		);

		expect(firstManifest).toEqual(secondManifest);
		expect(await fs.readFile(path.join(second.outputDirectory, 'index.css'), 'utf8')).toBe(
			'@import "./tokens.css";\n@import "./typography.css";\n'
		);
		const tokens = await fs.readFile(path.join(second.outputDirectory, 'tokens.css'), 'utf8');
		expect(tokens).toContain('--text-prose-font-family: system-ui, sans-serif;');
		expect(tokens).not.toContain('--ff-');
		const typographyCss = await fs.readFile(
			path.join(second.outputDirectory, 'typography.css'),
			'utf8'
		);
		expect(typographyCss).toContain('.text--prose {');
		expect(typographyCss).not.toContain(':where(.text--prose)');
		const systemTypescript = await fs.readFile(
			path.join(second.outputDirectory, 'system.generated.ts'),
			'utf8'
		);
		expect(systemTypescript).toContain('export const tfsSystem =');
		const legacyFixture = Object.fromEntries(
			await Promise.all(
				second.files.map(
					async (file) =>
						[
							file,
							createHash('sha256')
								.update(await fs.readFile(path.join(second.outputDirectory, file)))
								.digest('hex'),
						] as const
				)
			)
		);
		expect(legacyFixture).toEqual({
			'build.manifest.json': '55f3615d55dba4a3a9fc137a69507150472b6636cbd6c496af42b4a85a511737',
			'index.css': '4cb2f483ae8a8ccca27250d862e726233646c40571ecfbb5e9a32e66ad79436a',
			'system.generated.ts': 'ff16abd9f1075dae372cc332fe9b39818cb55482a429b0eb79f93f1f5cdcee0e',
			'tokens.css': '580d6d89ce37cfc05e13e2e8e96742732f659570b760567c4fa3e5e24182a220',
			'typography.css': '7acb1ed4300ee678f8a80b1e346331ff414d9eb81e9aa0ef0b64fd916c8e4924',
			'typography.generated.module.css':
				'd6fd0ee579f4028e9e067bef8e03d86c67292059c11827b702f1621c16753f22',
			'typography.generated.module.css.d.ts':
				'c0d5b47824c3b1196fa61c19bbb9960fca2ef26165a59f07d8894b622c973fce',
			'typography.generated.ts': '498590d92ba88966a20b41c2796e78392a3cce759850c52cce0d210c0d413517',
			'typography.specimen.html':
				'aac66436a9adc6d88431420d859aa81931fbd930a1dce12c46e47bdeb2b28f2e',
		});
	});

	it('checks exact generated output without mutating drift', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', css: true, typographyCss: true },
		});
		const configPath = path.join(directory, 'tfs.config.ts');
		const built = await buildProject(project, configPath);
		await expect(checkProject(project, configPath)).resolves.toEqual(built);
		await expect(validateProjectOutput(project, configPath)).resolves.toEqual(built);

		const tokensPath = path.join(built.outputDirectory, 'tokens.css');
		await fs.writeFile(tokensPath, 'human drift\n');
		await expect(checkProject(project, configPath)).rejects.toThrow(
			/Generated output is out of date[\s\S]*changed tokens\.css[\s\S]*tfs build/
		);
		await expect(validateProjectOutput(project, configPath)).rejects.toThrow(
			/Generated artifact does not match its manifest: tokens\.css/
		);
		expect(await fs.readFile(tokensPath, 'utf8')).toBe('human drift\n');
	});

	it('passes an explicit zero-specificity policy to global helpers', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: {
				directory: './dist',
				typographyCss: { specificity: 'zero' },
			},
		});
		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const css = await fs.readFile(path.join(result.outputDirectory, 'typography.css'), 'utf8');
		expect(css).toContain(':where(.text--prose) {');
	});

	it('passes project selector policy to the token stylesheet', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: {
				colors: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { pri: { mode: 'oklch', l: 0.7, c: 0.2, h: 30 } },
						},
						{
							name: 'light',
							tokens: { pri: { mode: 'oklch', l: 0.4, c: 0.1, h: 30 } },
						},
					],
				},
			},
			output: {
				directory: './dist',
				css: {
					selectors: {
						root: ':host',
						colorMode: '[data-scatter-theme="{mode}"]',
					},
				},
			},
		});
		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const css = await fs.readFile(path.join(result.outputDirectory, 'tokens.css'), 'utf8');
		expect(css).toContain(':host {');
		expect(css).toContain('[data-scatter-theme="light"] {');
		expect(css).not.toContain('[data-color-mode="light"]');
	});

	it('refuses to overwrite an unowned non-empty directory', async () => {
		const directory = await fixtureDirectory();
		const output = path.join(directory, 'dist');
		await fs.ensureDir(output);
		await fs.writeFile(path.join(output, 'user.txt'), 'keep');
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', css: true },
		});

		await expect(buildProject(project, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'Refusing to replace non-empty unowned directory'
		);
		expect(await fs.readFile(path.join(output, 'user.txt'), 'utf8')).toBe('keep');
	});

	it('leaves the previous owned output untouched when a later build fails', async () => {
		const directory = await fixtureDirectory();
		const configPath = path.join(directory, 'tfs.config.ts');
		const valid = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', css: true, typographyCss: true },
		});
		const result = await buildProject(valid, configPath);
		const previousManifest = await fs.readFile(
			path.join(result.outputDirectory, 'build.manifest.json')
		);
		const previousCss = await fs.readFile(path.join(result.outputDirectory, 'tokens.css'));
		const invalidTypography = structuredClone(defaultTypography);
		invalidTypography.roles!.heading.base.weight = 'does-not-exist';
		const invalid = defineTfsProject({
			system: {
				typography: invalidTypography,
			},
			output: { directory: './dist', css: true, typographyCss: true },
		});

		await expect(buildProject(invalid, configPath)).rejects.toThrow(
			'weight "does-not-exist" must be exposed by the role'
		);
		expect(await fs.readFile(path.join(result.outputDirectory, 'build.manifest.json'))).toEqual(
			previousManifest
		);
		expect(await fs.readFile(path.join(result.outputDirectory, 'tokens.css'))).toEqual(previousCss);
	});

	it('rejects output paths that escape the owned root', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', css: { file: '../tokens.css' } },
		});

		await expect(buildProject(project, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'must stay inside the project output directory'
		);

		const nonPortable = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', css: { file: 'tokens?.css' } },
		});
		await expect(buildProject(nonPortable, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'must use portable path segments'
		);
	});

	it('validates explicit font asset URL policies and keeps the asset subtree reserved', async () => {
		const directory = await fixtureDirectory();
		const publicPath = defineTfsProject({
			system: { typography: defaultTypography },
			output: {
				directory: './dist',
				fontAssets: { urls: { mode: 'public', prefix: 'fonts' } },
				typographyCss: true,
			},
		});
		await expect(buildProject(publicPath, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'public prefix must start with /'
		);

		const collision = defineTfsProject({
			system: { typography: defaultTypography },
			output: {
				directory: './dist',
				fontAssets: { directory: 'assets/fonts' },
				typographyCss: { file: 'assets/fonts/fonts.css' },
			},
		});
		await expect(buildProject(collision, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'must not be inside output.fontAssets.directory'
		);
	});

	it('rejects ambiguous top-level and embedded font ownership', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			fonts: {
				local: {
					family: 'Local',
					category: 'sans',
					strategy: 'copy',
					sources: ['./unused.woff2'],
					license: {
						id: 'TEST',
						file: './unused-license.txt',
						allowWebEmbedding: true,
						webEmbeddingBasis: 'test',
						allowTransformations: false,
					},
				},
			},
			system: { typography: defaultTypography },
			output: { directory: './dist', css: true },
		});

		await expect(buildProject(project, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'project.fonts or system.typography.fonts, not both'
		);
	});

	it('passes specimen interactivity through the one-command project build', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: {
				directory: './dist',
				specimen: { interactive: false },
			},
		});
		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const specimen = await fs.readFile(
			path.join(result.outputDirectory, 'typography.specimen.html'),
			'utf8'
		);
		expect(specimen).not.toContain('data-control="lineHeight"');
	});

	it('automatically includes and records token CSS required by semantic outputs', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: { typography: defaultTypography },
			output: { directory: './dist', typographyModule: true },
		});
		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const manifest = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'build.manifest.json'), 'utf8')
		);
		expect(await fs.pathExists(path.join(result.outputDirectory, 'tokens.css'))).toBe(true);
		expect(manifest.dependencies['typography.generated.module.css']).toEqual(['tokens.css']);
	});

	it('rejects an index stylesheet with nothing to import', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: {},
			output: { directory: './dist', indexCss: true },
		});
		await expect(buildProject(project, path.join(directory, 'tfs.config.ts'))).rejects.toThrow(
			'output.indexCss requires'
		);
	});

	it('keeps Display-P3 JSON profile generation isolated from CSS output', async () => {
		const directory = await fixtureDirectory();
		const project = defineTfsProject({
			system: {
				colors: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { pri: { mode: 'oklch', l: 0.7, c: 0.2, h: 30 } },
						},
					],
					alphaSchedule: { half: 0.5 },
				},
			},
			output: {
				directory: './dist',
				css: true,
				dtcg: { colorSpace: 'display-p3' },
			},
		});
		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const css = await fs.readFile(path.join(result.outputDirectory, 'tokens.css'), 'utf8');
		const dtcg = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'figma/colors.dtcg.json'), 'utf8')
		);

		expect(css).toContain('oklch(');
		expect(dtcg.color['clr-pri'].$value.colorSpace).toBe('display-p3');
		expect(dtcg.color['clr-pri'].$value).not.toHaveProperty('hex');
	});

	it('automatically builds and records metric-adjusted project-font fallbacks', async () => {
		const directory = await fixtureDirectory();
		await fs.writeFile(
			path.join(directory, 'example.ttf'),
			Buffer.from(TEST_FONT_BASE64, 'base64')
		);
		await fs.writeFile(path.join(directory, 'LICENSE.txt'), 'Synthetic test fixture.');
		const project = defineTfsProject({
			fonts: {
				example: {
					family: 'TFS Test Sans',
					category: 'sans',
					strategy: 'copy',
					sources: ['./example.ttf'],
					license: {
						id: 'TEST',
						file: './LICENSE.txt',
						allowWebEmbedding: true,
						webEmbeddingBasis: 'Synthetic test fixture.',
						embeddingRestrictionAcknowledgement:
							'Synthetic fixture metadata is not a real license restriction.',
					},
				},
			},
			system: {
				typography: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 4 },
						},
					],
					roles: {
						text: {
							font: 'example',
							base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
							weights: { lo: 400 },
						},
					},
				},
			},
			output: {
				directory: './dist',
				css: true,
				indexCss: true,
				typographyCss: { fontFaces: 'include' },
				specimen: true,
			},
		});

		const result = await buildProject(project, path.join(directory, 'tfs.config.ts'));
		const tokens = await fs.readFile(path.join(result.outputDirectory, 'tokens.css'), 'utf8');
		const typographyCss = await fs.readFile(
			path.join(result.outputDirectory, 'typography.css'),
			'utf8'
		);
		const standaloneFontCss = await fs.readFile(
			path.join(result.outputDirectory, 'fonts/fonts.css'),
			'utf8'
		);
		const specimen = await fs.readFile(
			path.join(result.outputDirectory, 'typography.specimen.html'),
			'utf8'
		);
		const fallbackManifest = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'fonts/fallbacks.manifest.json'), 'utf8')
		);
		const buildManifest = JSON.parse(
			await fs.readFile(path.join(result.outputDirectory, 'build.manifest.json'), 'utf8')
		);

		expect(tokens).toContain(
			'--text-text-font-family: "TFS Test Sans", "__tfs-example-adjusted-fallback", system-ui, sans-serif;'
		);
		expect(typographyCss).toContain('font-family: "__tfs-example-adjusted-fallback";');
		expect(typographyCss).toContain('src: local("Arial");');
		expect(typographyCss).toContain('size-adjust: 131.49%;');
		expect(standaloneFontCss).toContain('font-family: "__tfs-example-adjusted-fallback";');
		expect(specimen).toContain('force adjusted fallback');
		expect(specimen).toContain(
			'body[data-fallback=true] [data-type-role="text"] { font-family: "__tfs-example-adjusted-fallback"'
		);
		expect(fallbackManifest.schemaVersion).toBe(2);
		expect(fallbackManifest).not.toHaveProperty('status');
		expect(fallbackManifest.roles.text.instances[0].primary.source.sha256).toMatch(/^[a-f\d]{64}$/);
		expect(fallbackManifest.roles.text.instances[0].provenance).not.toHaveProperty('verification');
		expect(buildManifest.fonts.adjustedFallbacks).toMatchObject({
			manifest: 'fonts/fallbacks.manifest.json',
			measurements: 1,
			privateFamilies: ['__tfs-example-adjusted-fallback'],
		});
		expect(buildManifest.fonts.adjustedFallbacks).not.toHaveProperty('status');
		expect(buildManifest.fonts.adjustedFallbacks).not.toHaveProperty('verification');
		expect(buildManifest.fonts.adjustedFallbacks.warnings).toEqual(
			expect.arrayContaining([expect.stringContaining('without originating font-file provenance')])
		);
		expect(JSON.stringify(fallbackManifest)).not.toMatch(
			/"(?:status|verification|approved|pending)"/i
		);
	});
});
