import { createHash } from 'node:crypto';
import { open, type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {
	fontFromManifest,
	generate,
	generateCss,
	generateFigmaJson,
	generateTypographySpecimen,
	generateTypographyTypescript,
	toTypographyCss,
	toTypographyCssModuleTypes,
	type PartialDesignSystem,
	type TypographySystem,
} from '@three-forma-styli/core';
import {
	prepareFonts,
	renderFontFaceCss,
	type FontsPreparationConfig,
	type PreparedFontFace,
} from './fonts/prepare.js';
import {
	buildAdjustedFallbacks,
	type AdjustedFallbackBuildResult,
} from './fonts/adjusted-fallbacks.js';
import type {
	LegacyTfsProjectOutput,
	ProjectFontAssetUrlPolicy,
	ProjectFont,
	ProjectJsonOutput,
	ProjectOutputFormat,
	TfsProject,
} from './project.js';
import { COMPILER_VERSION } from './version.js';
import { generateProjectSystemTypescript } from './system-typescript.js';
import { buildWorkspacePackageProject } from './workspace/build.js';
import { assertGeneratedOutputCurrent } from './generated-check.js';

interface OutputPlan {
	css?: string;
	indexCss?: string;
	typographyCss?: string;
	typographyModule?: string;
	typescript?: string;
	systemTypescript?: string;
	specimen?: string;
	dtcg?: string;
	figmaVariables?: string;
}

function selectedFile(
	option: boolean | ProjectOutputFormat | undefined,
	fallback: string
): string | undefined {
	if (!option) return undefined;
	return option === true ? fallback : (option.file ?? fallback);
}

function typographyCssOptions(output: LegacyTfsProjectOutput) {
	const configured =
		output.typographyCss && output.typographyCss !== true ? output.typographyCss : {};
	return {
		classPrefix: configured.classPrefix,
		specificity: configured.specificity ?? 'class',
		fontFaces: configured.fontFaces ?? 'include',
	};
}

function tokenCssOptions(output: LegacyTfsProjectOutput) {
	const configured = output.css && output.css !== true ? output.css : {};
	return { selectors: configured.selectors };
}

function fontAssetsOptions(output: LegacyTfsProjectOutput) {
	return {
		directory: assertPortableRelativePath(
			output.fontAssets?.directory ?? 'fonts',
			'output.fontAssets.directory'
		),
		urls: output.fontAssets?.urls ?? ({ mode: 'relative' } as const),
	};
}

function joinAssetUrl(prefix: string, file: string): string {
	return `${prefix.replace(/\/$/, '')}/${file}`;
}

function validateFontUrlPolicy(policy: ProjectFontAssetUrlPolicy): void {
	if (policy.mode === 'relative') return;
	if (!policy.prefix.trim())
		throw new Error(`output.fontAssets.urls ${policy.mode} prefix is required.`);
	if (policy.mode === 'public' && !policy.prefix.startsWith('/')) {
		throw new Error('output.fontAssets.urls public prefix must start with /.');
	}
	if (policy.mode === 'absolute') {
		let url: URL;
		try {
			url = new URL(policy.prefix);
		} catch {
			throw new Error('output.fontAssets.urls absolute prefix must be an absolute URL.');
		}
		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new Error('output.fontAssets.urls absolute prefix must use http or https.');
		}
	}
}

function fontFaceUrl(
	targetStylesheet: string,
	fontDirectory: string,
	policy: ProjectFontAssetUrlPolicy,
	face: PreparedFontFace
): string {
	if (policy.mode !== 'relative') return joinAssetUrl(policy.prefix, face.file);
	const relative = path
		.relative(path.dirname(targetStylesheet), path.join(fontDirectory, face.file))
		.split(path.sep)
		.join('/');
	return relative.startsWith('.') ? relative : `./${relative}`;
}

function outputPlan(output: LegacyTfsProjectOutput): OutputPlan {
	const typographyCss = selectedFile(output.typographyCss, 'typography.css');
	const typographyModule = selectedFile(output.typographyModule, 'typography.generated.module.css');
	const typescript = selectedFile(output.typescript, 'typography.generated.ts');
	const tokenCss = selectedFile(output.css, 'tokens.css');
	return {
		// Semantic CSS/TS outputs contain var(--*) references, so project builds
		// always close that dependency with the token stylesheet.
		css: tokenCss ?? (typographyCss || typographyModule || typescript ? 'tokens.css' : undefined),
		indexCss: selectedFile(output.indexCss, 'index.css'),
		typographyCss,
		typographyModule,
		typescript,
		systemTypescript: selectedFile(output.systemTypescript, 'system.generated.ts'),
		specimen: selectedFile(output.specimen, 'typography.specimen.html'),
		dtcg: selectedFile(output.dtcg, 'figma/colors.dtcg.json'),
		figmaVariables: selectedFile(output.figmaVariables, 'figma/variables.json'),
	};
}

function assertPortableRelativePath(value: string, label: string): string {
	if (!value || path.isAbsolute(value)) throw new Error(`${label} must be a relative output path.`);
	const normalized = path.normalize(value);
	if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
		throw new Error(`${label} must stay inside the project output directory.`);
	}
	return normalized;
}

function validatePlan(plan: OutputPlan): void {
	const claimed = new Map<string, string>();
	for (const [kind, configured] of Object.entries(plan)) {
		if (!configured) continue;
		const relative = assertPortableRelativePath(configured, `output.${kind}.file`);
		const key = relative.toLowerCase();
		const previous = claimed.get(key);
		if (previous)
			throw new Error(`Output collision: ${previous} and ${kind} both use ${relative}.`);
		claimed.set(key, kind);
	}
	if (plan.typographyModule) {
		const declaration = `${plan.typographyModule}.d.ts`.toLowerCase();
		if (claimed.has(declaration)) {
			throw new Error(
				`Output collision: typographyModule declaration conflicts with ${declaration}.`
			);
		}
	}
}

function jsonOutput(
	option: boolean | ProjectJsonOutput | undefined
): Required<Pick<ProjectJsonOutput, 'colorSpace' | 'collectionName'>> {
	const configured = option && option !== true ? option : {};
	return {
		colorSpace: configured.colorSpace ?? 'srgb',
		collectionName: configured.collectionName ?? 'Color',
	};
}

async function writeText(root: string, relative: string, contents: string): Promise<void> {
	const destination = path.join(root, assertPortableRelativePath(relative, 'output file'));
	await fs.ensureDir(path.dirname(destination));
	await fs.writeFile(destination, contents);
}

async function allFiles(directory: string, root = directory): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map(async (entry) => {
				const absolute = path.join(directory, entry.name);
				if (entry.isDirectory()) return allFiles(absolute, root);
				if (!entry.isFile()) throw new Error(`Project output must be a regular file: ${absolute}`);
				return [path.relative(root, absolute).split(path.sep).join('/')];
			})
		)
	).flat();
}

async function fileMetadata(root: string, relative: string) {
	const data = await fs.readFile(path.join(root, relative));
	return {
		path: relative,
		bytes: data.byteLength,
		sha256: createHash('sha256').update(data).digest('hex'),
	};
}

async function assertOwnedOutput(outputDirectory: string): Promise<void> {
	if (!(await fs.pathExists(outputDirectory))) return;
	const stats = await fs.lstat(outputDirectory);
	if (stats.isSymbolicLink()) throw new Error('Project output directory must not be a symlink.');
	if (!stats.isDirectory()) throw new Error('Project output path exists and is not a directory.');
	if ((await fs.readdir(outputDirectory)).length === 0) return;
	const manifestPath = path.join(outputDirectory, 'build.manifest.json');
	if (!(await fs.pathExists(manifestPath))) {
		throw new Error(
			`Refusing to replace non-empty unowned directory ${outputDirectory}; build.manifest.json is missing.`
		);
	}
	let manifest: unknown;
	try {
		manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	} catch {
		throw new Error(`Refusing to replace ${outputDirectory}; build.manifest.json is invalid.`);
	}
	if ((manifest as { tool?: { name?: unknown } }).tool?.name !== 'three-forma-styli') {
		throw new Error(`Refusing to replace ${outputDirectory}; it is not marked as TFS-owned.`);
	}
}

async function commitOutput(staging: string, outputDirectory: string): Promise<void> {
	await assertOwnedOutput(outputDirectory);
	const backup = `${outputDirectory}.tfs-backup-${process.pid}`;
	if (await fs.pathExists(backup)) throw new Error(`Build backup already exists: ${backup}`);
	let movedPrevious = false;
	try {
		if (await fs.pathExists(outputDirectory)) {
			await fs.move(outputDirectory, backup);
			movedPrevious = true;
		}
		await fs.move(staging, outputDirectory);
		if (movedPrevious) await fs.remove(backup);
	} catch (error) {
		if (!(await fs.pathExists(outputDirectory)) && movedPrevious && (await fs.pathExists(backup))) {
			await fs.move(backup, outputDirectory);
		}
		throw error;
	}
}

function validateOutputRoot(outputDirectory: string, configDirectory: string): void {
	const forbidden = new Set([
		path.parse(outputDirectory).root,
		path.resolve(os.homedir()),
		path.resolve(configDirectory),
	]);
	if (forbidden.has(path.resolve(outputDirectory))) {
		throw new Error(
			'Project output directory must not be the filesystem root, home, or config directory.'
		);
	}
}

function isInside(directory: string, candidate: string): boolean {
	const relative = path.relative(directory, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateFontSourcesOutsideOutput(
	fonts: Record<string, ProjectFont>,
	configDirectory: string,
	outputDirectory: string
): void {
	for (const [id, font] of Object.entries(fonts)) {
		const paths = [
			...font.sources.map((source) => (typeof source === 'string' ? source : source.path)),
			font.license.file,
		];
		for (const configured of paths) {
			const resolved = path.resolve(configDirectory, configured);
			if (isInside(outputDirectory, resolved)) {
				throw new Error(
					`fonts.${id} source/license files must live outside the TFS-owned output directory.`
				);
			}
		}
	}
}

function fontFallback(font: ProjectFont): {
	category?: 'sans' | 'serif' | 'mono';
	fallbacks?: string[];
} {
	if (font.fallbacks?.length) return { fallbacks: font.fallbacks };
	if (font.category) return { category: font.category };
	throw new Error('Every project font must declare either fallbacks or a category.');
}

function joinFontFaceCss(primary: string, adjusted?: string): string {
	return adjusted ? `${primary.trimEnd()}\n\n${adjusted.trim()}\n` : primary;
}

async function buildLegacyProject(
	project: TfsProject & { output: LegacyTfsProjectOutput },
	configPath: string,
	mode: 'build' | 'check'
): Promise<{ outputDirectory: string; files: string[] }> {
	if (project.schemaVersion !== 1) throw new Error('Unsupported TFS project schemaVersion.');
	const configDirectory = path.dirname(configPath);
	const outputDirectory = path.resolve(configDirectory, project.output.directory);
	validateOutputRoot(outputDirectory, configDirectory);
	validateFontSourcesOutsideOutput(project.fonts ?? {}, configDirectory, outputDirectory);
	await assertOwnedOutput(outputDirectory);
	const plan = outputPlan(project.output);
	validatePlan(plan);
	const typographyOutput = typographyCssOptions(project.output);
	const fontFacesMode = plan.typographyCss
		? typographyOutput.fontFaces
		: typographyOutput.fontFaces === 'none'
			? 'none'
			: 'separate';
	const fontAssets = fontAssetsOptions(project.output);
	validateFontUrlPolicy(fontAssets.urls);
	if (fontAssets.directory === '.') {
		throw new Error('output.fontAssets.directory must be a dedicated output subtree.');
	}
	for (const [kind, file] of Object.entries(plan)) {
		if (!file) continue;
		const relative = path.relative(fontAssets.directory, file);
		if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
			throw new Error(`output.${kind}.file must not be inside output.fontAssets.directory.`);
		}
	}
	if (
		plan.indexCss &&
		!plan.css &&
		!plan.typographyCss &&
		Object.keys(project.fonts ?? {}).length === 0
	) {
		throw new Error(
			'output.indexCss requires token CSS, typography CSS, or prepared project fonts to import.'
		);
	}
	const sourceTypography = project.system.typography;
	const hasEmbeddedTypographyFonts = Boolean(
		sourceTypography && 'fonts' in sourceTypography && sourceTypography.fonts
	);
	if (Object.keys(project.fonts ?? {}).length > 0 && hasEmbeddedTypographyFonts) {
		throw new Error(
			'Configure project fonts either at project.fonts or system.typography.fonts, not both.'
		);
	}

	const lockPath = `${outputDirectory}.tfs-lock`;
	await fs.ensureDir(path.dirname(outputDirectory));
	let lock: FileHandle | undefined;
	try {
		lock = await open(lockPath, 'wx');
	} catch {
		throw new Error(`Another TFS build appears to be using ${outputDirectory}.`);
	}
	const staging = await fs.mkdtemp(path.join(path.dirname(outputDirectory), '.tfs-build-stage-'));
	try {
		let preparedFonts: Awaited<ReturnType<typeof prepareFonts>> | undefined;
		const projectFonts = project.fonts ?? {};
		if (Object.keys(projectFonts).length > 0) {
			const fontCssPublicPath = fontAssets.urls.mode === 'relative' ? '.' : fontAssets.urls.prefix;
			const fontConfig: FontsPreparationConfig = {
				output: { directory: fontAssets.directory, publicPath: fontCssPublicPath },
				fonts: projectFonts,
			};
			preparedFonts = await prepareFonts(fontConfig, configDirectory, {
				outputDirectory: path.join(staging, fontAssets.directory),
			});
		}

		let typography: TypographySystem | undefined;
		if (sourceTypography) {
			if (Object.keys(projectFonts).length > 0 && !hasEmbeddedTypographyFonts) {
				const fonts = Object.fromEntries(
					Object.entries(projectFonts).map(([id, configured]) => [
						id,
						fontFromManifest(preparedFonts!.manifest, id, fontFallback(configured)),
					])
				);
				typography = { ...sourceTypography, fonts } as TypographySystem;
			} else {
				typography = sourceTypography as TypographySystem;
			}
		}
		// Validate the physical role selections before attempting fallback calibration.
		generate({ ...project.system, typography });
		let adjustedFallbacks: AdjustedFallbackBuildResult | undefined;
		if (preparedFonts && typography && fontFacesMode !== 'none') {
			adjustedFallbacks = await buildAdjustedFallbacks(
				typography,
				preparedFonts.manifest,
				projectFonts,
				{ preparedDirectory: path.join(staging, fontAssets.directory) }
			);
			if (adjustedFallbacks) {
				typography = adjustedFallbacks.typography;
				preparedFonts.css = joinFontFaceCss(preparedFonts.css, adjustedFallbacks.css);
				await fs.writeFile(preparedFonts.cssPath, preparedFonts.css);
				await writeText(
					staging,
					path.join(fontAssets.directory, 'fallbacks.manifest.json'),
					`${JSON.stringify(adjustedFallbacks.manifest, null, 2)}\n`
				);
			}
		}
		const system: PartialDesignSystem = { ...project.system, typography };
		const ir = generate(system);

		if (plan.css)
			await writeText(staging, plan.css, generateCss(system, tokenCssOptions(project.output)));
		if (plan.typographyCss) {
			const fontFaceCss =
				preparedFonts && fontFacesMode === 'include'
					? joinFontFaceCss(
							renderFontFaceCss(preparedFonts.manifest, {
								includeHeader: false,
								resolveUrl: (face) =>
									fontFaceUrl(plan.typographyCss!, fontAssets.directory, fontAssets.urls, face),
							}),
							adjustedFallbacks?.css
						)
					: undefined;
			await writeText(
				staging,
				plan.typographyCss,
				toTypographyCss(ir, {
					classPrefix: typographyOutput.classPrefix,
					specificity: typographyOutput.specificity,
					fontFaceCss,
				})
			);
		}
		if (plan.typographyModule) {
			await writeText(staging, plan.typographyModule, toTypographyCss(ir, { scope: 'module' }));
			await writeText(staging, `${plan.typographyModule}.d.ts`, toTypographyCssModuleTypes(ir));
		}
		if (plan.typescript) {
			await writeText(staging, plan.typescript, generateTypographyTypescript(system));
		}
		if (plan.systemTypescript) {
			await writeText(staging, plan.systemTypescript, generateProjectSystemTypescript(system, ir));
		}
		if (plan.specimen) {
			const specimenOption = project.output.specimen;
			const faceStylesheet =
				preparedFonts && plan.typographyCss && fontFacesMode === 'include'
					? plan.typographyCss
					: preparedFonts && fontFacesMode !== 'none'
						? path.join(fontAssets.directory, 'fonts.css')
						: undefined;
			const fontHref = faceStylesheet
				? path.relative(path.dirname(plan.specimen), faceStylesheet).split(path.sep).join('/')
				: undefined;
			await writeText(
				staging,
				plan.specimen,
				generateTypographySpecimen(system, {
					specimen: {
						title: specimenOption && specimenOption !== true ? specimenOption.title : undefined,
						fontFaceHref: fontHref?.startsWith('.')
							? fontHref
							: fontHref
								? `./${fontHref}`
								: undefined,
						interactive:
							specimenOption && specimenOption !== true ? specimenOption.interactive : undefined,
						adjustedFallbackFamilies: adjustedFallbacks
							? Object.fromEntries(
									Object.entries(adjustedFallbacks.manifest.roles).map(([role, entry]) => [
										role,
										entry.fallbackFamily,
									])
								)
							: undefined,
					},
				})
			);
		}
		if (plan.dtcg) {
			const options = jsonOutput(project.output.dtcg);
			await writeText(
				staging,
				plan.dtcg,
				generateFigmaJson(
					system,
					{
						transformer: { colorSpace: options.colorSpace, collectionName: options.collectionName },
					},
					'dtcg'
				)
			);
		}
		if (plan.figmaVariables) {
			const options = jsonOutput(project.output.figmaVariables);
			await writeText(
				staging,
				plan.figmaVariables,
				generateFigmaJson(
					system,
					{
						transformer: { colorSpace: options.colorSpace, collectionName: options.collectionName },
					},
					'figma-variables'
				)
			);
		}
		if (plan.indexCss) {
			const importSeparateFontCss = preparedFonts && fontFacesMode === 'separate';
			const imports = [
				importSeparateFontCss ? path.join(fontAssets.directory, 'fonts.css') : undefined,
				plan.css,
				plan.typographyCss,
			].filter((value): value is string => Boolean(value));
			const from = path.dirname(plan.indexCss);
			await writeText(
				staging,
				plan.indexCss,
				`${imports
					.map((target) => {
						const relative = path.relative(from, target).split(path.sep).join('/');
						return `@import ${JSON.stringify(relative.startsWith('.') ? relative : `./${relative}`)};`;
					})
					.join('\n')}\n`
			);
		}

		const files = (await allFiles(staging)).sort();
		const artifacts = Object.fromEntries(
			await Promise.all(
				files.map(async (file) => [file, await fileMetadata(staging, file)] as const)
			)
		);
		const preparedFontArtifacts = preparedFonts
			? Object.values(preparedFonts.manifest.families).flatMap((family) =>
					family.faces.map((face) =>
						path.join(fontAssets.directory, face.file).split(path.sep).join('/')
					)
				)
			: [];
		const separateFontCss = path.join(fontAssets.directory, 'fonts.css').split(path.sep).join('/');
		const fallbackManifest = path
			.join(fontAssets.directory, 'fallbacks.manifest.json')
			.split(path.sep)
			.join('/');
		const manifest = {
			schemaVersion: 1,
			tool: { name: 'three-forma-styli', version: COMPILER_VERSION },
			project: { config: path.basename(configPath) },
			artifacts,
			dependencies: {
				...(preparedFonts && fontFacesMode === 'separate'
					? { [separateFontCss]: preparedFontArtifacts }
					: {}),
				...(plan.typographyCss
					? {
							[plan.typographyCss]: [
								...(plan.css ? [plan.css] : []),
								...(preparedFonts && fontFacesMode === 'include' ? preparedFontArtifacts : []),
							],
						}
					: {}),
				...(plan.typographyModule && plan.css ? { [plan.typographyModule]: [plan.css] } : {}),
				...(plan.typescript && plan.css ? { [plan.typescript]: [plan.css] } : {}),
				...(plan.indexCss
					? {
							[plan.indexCss]: [
								...(preparedFonts && fontFacesMode === 'separate' ? [separateFontCss] : []),
								...(plan.css ? [plan.css] : []),
								...(plan.typographyCss ? [plan.typographyCss] : []),
							],
						}
					: {}),
			},
			fonts: preparedFonts
				? {
						manifest: path
							.join(fontAssets.directory, 'fonts.manifest.json')
							.split(path.sep)
							.join('/'),
						css: separateFontCss,
						placement: fontFacesMode,
						urls: fontAssets.urls,
						families: Object.keys(preparedFonts.manifest.families),
						faces: Object.values(preparedFonts.manifest.families).reduce(
							(total, family) => total + family.faces.length,
							0
						),
						warnings: Object.entries(preparedFonts.manifest.families).flatMap(([id, family]) =>
							family.faces.flatMap((face) =>
								face.warnings.map((warning) => `${id}/${face.style}: ${warning}`)
							)
						),
						adjustedFallbacks: adjustedFallbacks
							? {
									manifest: fallbackManifest,
									measurements: adjustedFallbacks.measurementCount,
									privateFamilies: adjustedFallbacks.privateFamilies,
									warnings: [
										...new Set(
											Object.values(adjustedFallbacks.manifest.roles).flatMap((role) =>
												role.instances.flatMap((instance) => instance.warnings)
											)
										),
									],
								}
							: undefined,
					}
				: undefined,
			limitations: {
				dtcg: plan.dtcg ? 'color-only' : undefined,
				figmaVariables: plan.figmaVariables ? 'color-only file output; no network sync' : undefined,
				typescript: plan.typescript ? 'semantic typography contract' : undefined,
			},
		};
		await writeText(staging, 'build.manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
		if (mode === 'check') await assertGeneratedOutputCurrent(staging, outputDirectory);
		else await commitOutput(staging, outputDirectory);
		return { outputDirectory, files: [...files, 'build.manifest.json'].sort() };
	} finally {
		await lock?.close();
		await fs.remove(lockPath);
		await fs.remove(staging);
	}
}

async function runProject(
	project: TfsProject,
	configPath: string,
	mode: 'build' | 'check'
): Promise<{ outputDirectory: string; files: string[] }> {
	const output = project.output as unknown as Record<string, unknown>;
	const layout = output.layout;
	if (layout !== undefined && layout !== 'flat' && layout !== 'workspace-package') {
		throw new Error(`Unknown TFS output layout ${JSON.stringify(layout)}.`);
	}
	const legacyKeys = [
		'fontAssets',
		'css',
		'indexCss',
		'typographyCss',
		'typographyModule',
		'typescript',
		'systemTypescript',
		'specimen',
		'dtcg',
		'figmaVariables',
	];
	const workspaceKeys = ['hostPackage', 'assets', 'targets'];
	if (layout === 'workspace-package') {
		const mixed = legacyKeys.filter((key) => output[key] !== undefined);
		if (mixed.length > 0) {
			throw new Error(`workspace-package output cannot use legacy keys: ${mixed.join(', ')}.`);
		}
		return buildWorkspacePackageProject(project, configPath, {}, mode);
	}
	const mixed = workspaceKeys.filter((key) => output[key] !== undefined);
	if (mixed.length > 0) {
		throw new Error(`Flat output cannot use workspace-package keys: ${mixed.join(', ')}.`);
	}
	return buildLegacyProject(
		project as TfsProject & { output: LegacyTfsProjectOutput },
		configPath,
		mode
	);
}

/** Generate and atomically replace the configured TFS-owned output directory. */
export async function buildProject(
	project: TfsProject,
	configPath: string
): Promise<{ outputDirectory: string; files: string[] }> {
	return runProject(project, configPath, 'build');
}

/** Fully regenerate in a sibling stage and fail on byte-level drift without mutating output. */
export async function checkProject(
	project: TfsProject,
	configPath: string
): Promise<{ outputDirectory: string; files: string[] }> {
	return runProject(project, configPath, 'check');
}
