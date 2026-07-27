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
	TfsProject,
	WorkspacePackageOutput,
} from './project.js';
import { COMPILER_VERSION } from './version.js';
import { generateProjectSystemTypescript } from './system-typescript.js';
import { buildWorkspacePackageProject } from './workspace/build.js';
import { validateHostPackage } from './workspace/host-package.js';
import { planWorkspacePackage } from './workspace/plan.js';
import { workspacePlanContext } from './workspace/context.js';
import { assertGeneratedOutputCurrent } from './generated-check.js';
import { fontAssetUrl, relativeUrl, validateFontAssetUrlPolicy } from './font-url.js';
import { acquireBuildLock } from './build-lock.js';
import {
	fontAssetsOptions,
	jsonOutput,
	legacyOutputPlan,
	tokenCssOptions,
	typographyCssOptions,
	validateLegacyOutputPlan,
	type LegacyOutputPlan,
} from './legacy-output.js';
import {
	assertOwnedOutput,
	commitOutputDirectory,
	listOutputFiles,
	outputFileMetadata,
	validateFontSourcesOutsideOutput,
	validateOutputRoot,
	writeOutputFile,
} from './output-directory.js';
import {
	addPlannedArtifact,
	appendFontArtifacts,
	plannedFontInputs,
	projectLayout,
	type ProjectBuildPlan,
	type ProjectPlanArtifact,
} from './project-plan.js';

export type {
	ProjectBuildPlan,
	ProjectPlanArtifact,
	ProjectPlanFontSource,
} from './project-plan.js';

function validateFontUrlPolicy(policy: ProjectFontAssetUrlPolicy): void {
	validateFontAssetUrlPolicy(policy, 'output.fontAssets.urls');
}

function fontFaceUrl(
	targetStylesheet: string,
	fontDirectory: string,
	policy: ProjectFontAssetUrlPolicy,
	face: PreparedFontFace
): string {
	return fontAssetUrl(targetStylesheet, fontDirectory, policy, face.file);
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

type LegacyProject<Fonts extends Record<string, ProjectFont> = Record<string, ProjectFont>> =
	TfsProject<Fonts> & { output: LegacyTfsProjectOutput };

interface LegacyProjectContext<Fonts extends Record<string, ProjectFont>> {
	configDirectory: string;
	outputDirectory: string;
	plan: LegacyOutputPlan;
	typographyOutput: ReturnType<typeof typographyCssOptions>;
	fontFacesMode: 'include' | 'separate' | 'none';
	fontAssets: ReturnType<typeof fontAssetsOptions>;
	sourceTypography: LegacyProject<Fonts>['system']['typography'];
	hasEmbeddedTypographyFonts: boolean;
}

/** One validation path shared by writing builds and read-only plan inspection. */
async function legacyProjectContext<const Fonts extends Record<string, ProjectFont>>(
	project: LegacyProject<Fonts>,
	configPath: string
): Promise<LegacyProjectContext<Fonts>> {
	if (project.schemaVersion !== 1) throw new Error('Unsupported TFS project schemaVersion.');
	const configDirectory = path.dirname(configPath);
	const outputDirectory = path.resolve(configDirectory, project.output.directory);
	validateOutputRoot(outputDirectory, configDirectory);
	validateFontSourcesOutsideOutput(project.fonts ?? {}, configDirectory, outputDirectory);
	await assertOwnedOutput(outputDirectory);
	const plan = legacyOutputPlan(project.output);
	validateLegacyOutputPlan(plan);
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
	return {
		configDirectory,
		outputDirectory,
		plan,
		typographyOutput,
		fontFacesMode,
		fontAssets,
		sourceTypography,
		hasEmbeddedTypographyFonts,
	};
}

async function buildLegacyProject<const Fonts extends Record<string, ProjectFont>>(
	project: LegacyProject<Fonts>,
	configPath: string,
	mode: 'build' | 'check'
): Promise<{ outputDirectory: string; files: string[] }> {
	const {
		configDirectory,
		outputDirectory,
		plan,
		typographyOutput,
		fontFacesMode,
		fontAssets,
		sourceTypography,
		hasEmbeddedTypographyFonts,
	} = await legacyProjectContext(project, configPath);

	await fs.ensureDir(path.dirname(outputDirectory));
	const lock = await acquireBuildLock(outputDirectory, 'legacy');
	const staging = await fs.mkdtemp(path.join(path.dirname(outputDirectory), '.tfs-build-stage-'));
	try {
		let preparedFonts: Awaited<ReturnType<typeof prepareFonts>> | undefined;
		const projectFonts: Record<string, ProjectFont> = project.fonts ?? {};
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
		generate({ ...project.system, typography }, project.generator);
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
				await writeOutputFile(
					staging,
					path.join(fontAssets.directory, 'fallbacks.manifest.json'),
					`${JSON.stringify(adjustedFallbacks.manifest, null, 2)}\n`
				);
			}
		}
		const system: PartialDesignSystem = { ...project.system, typography };
		const ir = generate(system, project.generator);

		if (plan.css)
			await writeOutputFile(
				staging,
				plan.css,
				generateCss(system, { ...project.generator, ...tokenCssOptions(project.output) })
			);
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
			await writeOutputFile(
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
			await writeOutputFile(
				staging,
				plan.typographyModule,
				toTypographyCss(ir, { scope: 'module' })
			);
			await writeOutputFile(
				staging,
				`${plan.typographyModule}.d.ts`,
				toTypographyCssModuleTypes(ir)
			);
		}
		if (plan.typescript) {
			await writeOutputFile(
				staging,
				plan.typescript,
				generateTypographyTypescript(system, project.generator)
			);
		}
		if (plan.systemTypescript) {
			await writeOutputFile(
				staging,
				plan.systemTypescript,
				generateProjectSystemTypescript(system, ir)
			);
		}
		if (plan.specimen) {
			const specimenOption = project.output.specimen;
			const faceStylesheet =
				preparedFonts && plan.typographyCss && fontFacesMode === 'include'
					? plan.typographyCss
					: preparedFonts && fontFacesMode !== 'none'
						? path.join(fontAssets.directory, 'fonts.css')
						: undefined;
			const fontHref = faceStylesheet ? relativeUrl(plan.specimen, faceStylesheet) : undefined;
			await writeOutputFile(
				staging,
				plan.specimen,
				generateTypographySpecimen(system, {
					generator: project.generator,
					specimen: {
						title: specimenOption && specimenOption !== true ? specimenOption.title : undefined,
						fontFaceHref: fontHref,
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
			await writeOutputFile(
				staging,
				plan.dtcg,
				generateFigmaJson(
					system,
					{
						generator: project.generator,
						transformer: { colorSpace: options.colorSpace, collectionName: options.collectionName },
					},
					'dtcg'
				)
			);
		}
		if (plan.figmaVariables) {
			const options = jsonOutput(project.output.figmaVariables);
			await writeOutputFile(
				staging,
				plan.figmaVariables,
				generateFigmaJson(
					system,
					{
						generator: project.generator,
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
			await writeOutputFile(
				staging,
				plan.indexCss,
				`${imports
					.map((target) => `@import ${JSON.stringify(relativeUrl(plan.indexCss!, target))};`)
					.join('\n')}\n`
			);
		}

		const files = (await listOutputFiles(staging)).sort();
		const artifacts = Object.fromEntries(
			await Promise.all(
				files.map(async (file) => [file, await outputFileMetadata(staging, file)] as const)
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
				dtcg: plan.dtcg
					? 'DTCG 2025.10 color, dimension, duration, cubicBezier, transition, typography, and shadow; TFS modes and CSS-only metadata use namespaced extensions'
					: undefined,
				figmaVariables: plan.figmaVariables ? 'color-only file output; no network sync' : undefined,
				typescript: plan.typescript ? 'semantic typography contract' : undefined,
			},
		};
		await writeOutputFile(staging, 'build.manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
		if (mode === 'check') await assertGeneratedOutputCurrent(staging, outputDirectory);
		else await commitOutputDirectory(staging, outputDirectory);
		return { outputDirectory, files: [...files, 'build.manifest.json'].sort() };
	} finally {
		await lock.release();
		await fs.remove(staging);
	}
}

/** Resolve and validate the complete output graph without preparing fonts or writing output. */
export async function planProject<const Fonts extends Record<string, ProjectFont>>(
	project: TfsProject<Fonts>,
	configPath: string
): Promise<ProjectBuildPlan> {
	if (project.schemaVersion !== 1) throw new Error('Unsupported TFS project schemaVersion.');
	const resolvedConfig = path.resolve(configPath);
	const configDirectory = path.dirname(resolvedConfig);
	const layout = projectLayout(project);
	const fontPlan = await plannedFontInputs(project, configDirectory);
	let outputDirectory: string;
	let artifacts: ProjectPlanArtifact[];
	let hostPackage: ProjectBuildPlan['hostPackage'];

	if (layout === 'workspace-package') {
		const output = project.output as WorkspacePackageOutput;
		outputDirectory = path.resolve(configDirectory, output.directory);
		validateOutputRoot(outputDirectory, configDirectory);
		validateFontSourcesOutsideOutput(project.fonts ?? {}, configDirectory, outputDirectory);
		const workspacePlan = planWorkspacePackage(
			output,
			workspacePlanContext(project, {
				hasFonts: fontPlan.fonts.sources.length > 0,
			})
		);
		const host = await validateHostPackage(configDirectory, outputDirectory, workspacePlan);
		artifacts = workspacePlan.artifacts.map((artifact) => ({
			path: artifact.path,
			kind: artifact.target === 'assets' ? 'asset' : artifact.target,
			dependencies: [...artifact.dependencies],
		}));
		appendFontArtifacts(artifacts, workspacePlan.fontDirectory, fontPlan.fonts);
		hostPackage = {
			manifest: host.path,
			generatedFromHost: host.generatedFromHost,
			requiredExports: host.requiredExports,
		};
	} else {
		const context = await legacyProjectContext(project as LegacyProject<Fonts>, resolvedConfig);
		outputDirectory = context.outputDirectory;
		const kindFor = (name: keyof LegacyOutputPlan): ProjectPlanArtifact['kind'] =>
			name === 'specimen'
				? 'review'
				: name === 'dtcg' || name === 'figmaVariables'
					? 'design'
					: 'runtime';
		const plannedFontDirectory = context.fontAssets.directory.split(path.sep).join('/');
		const fontArtifacts = fontPlan.fonts.sources.map((source) =>
			path.posix.join(plannedFontDirectory, source.output)
		);
		const dependenciesFor = (name: keyof LegacyOutputPlan): string[] => {
			if (name === 'typographyCss') {
				return [
					...(context.plan.css ? [context.plan.css] : []),
					...(context.fontFacesMode === 'include' ? fontArtifacts : []),
				];
			}
			if (name === 'typographyModule' || name === 'typescript') {
				return context.plan.css ? [context.plan.css] : [];
			}
			if (name === 'indexCss') {
				return [
					...(fontPlan.fonts.sources.length > 0 && context.fontFacesMode === 'separate'
						? [path.posix.join(plannedFontDirectory, 'fonts.css')]
						: []),
					...(context.plan.css ? [context.plan.css] : []),
					...(context.plan.typographyCss ? [context.plan.typographyCss] : []),
				];
			}
			if (name === 'specimen' && fontPlan.fonts.sources.length > 0) {
				if (context.plan.typographyCss && context.fontFacesMode === 'include') {
					return [context.plan.typographyCss];
				}
				if (context.fontFacesMode !== 'none') {
					return [path.posix.join(plannedFontDirectory, 'fonts.css')];
				}
			}
			return [];
		};
		artifacts = Object.entries(context.plan)
			.filter((entry): entry is [keyof LegacyOutputPlan, string] => Boolean(entry[1]))
			.map(([name, file]) => ({
				path: file,
				kind: kindFor(name),
				dependencies: dependenciesFor(name),
			}));
		if (context.plan.typographyModule) {
			addPlannedArtifact(artifacts, {
				path: `${context.plan.typographyModule}.d.ts`,
				kind: 'runtime',
				dependencies: [context.plan.typographyModule],
			});
		}
		if (fontPlan.fonts.sources.length > 0) {
			addPlannedArtifact(artifacts, {
				path: path.posix.join(plannedFontDirectory, 'fonts.manifest.json'),
				kind: 'evidence',
				dependencies: [],
			});
			addPlannedArtifact(artifacts, {
				path: path.posix.join(plannedFontDirectory, 'fonts.css'),
				kind: 'evidence',
				dependencies: fontArtifacts,
			});
			appendFontArtifacts(artifacts, context.fontAssets.directory, fontPlan.fonts);
		}
	}

	addPlannedArtifact(artifacts, {
		path: 'build.manifest.json',
		kind: 'evidence',
		dependencies: artifacts.map((artifact) => artifact.path).sort(),
	});
	artifacts.sort((left, right) => left.path.localeCompare(right.path));
	return {
		schemaVersion: 1,
		project: { schemaVersion: 1, config: resolvedConfig },
		output: { layout, directory: outputDirectory, ownership: 'atomic-directory' },
		artifacts,
		...fontPlan,
		...(hostPackage ? { hostPackage } : {}),
	};
}

async function runProject<const Fonts extends Record<string, ProjectFont>>(
	project: TfsProject<Fonts>,
	configPath: string,
	mode: 'build' | 'check'
): Promise<{ outputDirectory: string; files: string[] }> {
	const layout = projectLayout(project);
	if (layout === 'workspace-package') {
		return buildWorkspacePackageProject(project, configPath, {}, mode);
	}
	return buildLegacyProject(project as LegacyProject<Fonts>, configPath, mode);
}

/** Generate and atomically replace the configured TFS-owned output directory. */
export async function buildProject<const Fonts extends Record<string, ProjectFont>>(
	project: TfsProject<Fonts>,
	configPath: string
): Promise<{ outputDirectory: string; files: string[] }> {
	return runProject(project, configPath, 'build');
}

/** Fully regenerate in a sibling stage and fail on byte-level drift without mutating output. */
export async function checkProject<const Fonts extends Record<string, ProjectFont>>(
	project: TfsProject<Fonts>,
	configPath: string
): Promise<{ outputDirectory: string; files: string[] }> {
	return runProject(project, configPath, 'check');
}
