import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { buildProject, checkProject } from './project-build.js';
import { defineTfsProject } from './project.js';
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
			'build.manifest.json': '01f5bd35190ab596a5da78cc109500b70ed6004743f2c17a548fafb9001de6e8',
			'index.css': '4cb2f483ae8a8ccca27250d862e726233646c40571ecfbb5e9a32e66ad79436a',
			'system.generated.ts': '18a655155852930d0d54a783507b36c35b09cf62cf76d6b62a57db634bfef716',
			'tokens.css': 'f2fb21be48defa144feed8d91243839e135b3d5332fc5366f17ebd86c89d623a',
			'typography.css': '6af6c4d0b10c01e4288a761b0fb122a0c6d0673370f33f11b7853a3511d108ba',
			'typography.generated.module.css':
				'05bb1d5e817cd42847141f5446f16f33a32b5b0a87be7365b9cb4acf63cc726b',
			'typography.generated.module.css.d.ts':
				'c0d5b47824c3b1196fa61c19bbb9960fca2ef26165a59f07d8894b622c973fce',
			'typography.generated.ts': '51e96732b2b5b735a0cd583f24800ab8633e5cc5aaa820478612ae6de4f8736c',
			'typography.specimen.html':
				'e0e56eea4b320c9a1b26e5318e6849fcab68ec17af3cbae889b21f86c44f0317',
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

		const tokensPath = path.join(built.outputDirectory, 'tokens.css');
		await fs.writeFile(tokensPath, 'human drift\n');
		await expect(checkProject(project, configPath)).rejects.toThrow(
			/Generated output is out of date[\s\S]*changed tokens\.css[\s\S]*tfs build/
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
