import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import {
	createWorkbenchContract,
	fontFromManifest,
	generate,
	generateCss,
	generateFigmaJson,
	generateTypographySpecimen,
	resolveGeneratorConfig,
	toTypographyCss,
	toTypographyCssModuleTypes,
	toShadowCss,
	toShadowCssModuleTypes,
	toShadowSpecimen,
	type IR,
	type PartialDesignSystem,
	type TypographySystem,
} from '@three-forma-styli/core';
import { COMPILER_VERSION } from '../version.js';
import {
	prepareFonts,
	renderFontFaceCss,
	type FontsPreparationConfig,
	type PreparedFontFace,
	type PrepareFontsResult,
} from '../fonts/prepare.js';
import {
	buildAdjustedFallbacks,
	type AdjustedFallbackBuildResult,
} from '../fonts/adjusted-fallbacks.js';
import type {
	ProjectFont,
	ProjectFontAssetUrlPolicy,
	TfsProject,
	WorkspacePackageOutput,
} from '../project.js';
import {
	renderNativeColorModesContract,
	renderRuntimeColorThemeContract,
	renderSystemContract,
	renderTypographyContract,
} from './contracts.js';
import type { WorkspacePlan } from './plan.js';
import { fontAssetUrl, relativeUrl, validateFontAssetUrlPolicy } from '../font-url.js';

export type WorkspaceProject = TfsProject & { output: WorkspacePackageOutput };

export interface WorkspaceRenderResult {
	system: PartialDesignSystem;
	ir: IR;
	preparedFonts?: PrepareFontsResult;
	adjustedFallbacks?: AdjustedFallbackBuildResult;
}

async function writeText(staging: string, relative: string, contents: string): Promise<void> {
	const destination = path.join(staging, relative);
	await fs.ensureDir(path.dirname(destination));
	await fs.writeFile(destination, contents);
}

const workbenchAssetDirectory = fileURLToPath(new URL('../../workbench-assets/', import.meta.url));

async function workbenchAsset(file: 'index.html' | 'workbench.css' | 'workbench.js') {
	return fs.readFile(path.join(workbenchAssetDirectory, file), 'utf8');
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

export function validateRuntimeFontUrlPolicy(policy: ProjectFontAssetUrlPolicy): void {
	validateFontAssetUrlPolicy(policy, 'runtime.css.fontUrls');
}

function fontFaceUrl(
	stylesheet: string,
	fontDirectory: string,
	policy: ProjectFontAssetUrlPolicy,
	face: PreparedFontFace
): string {
	return fontAssetUrl(stylesheet, fontDirectory, policy, face.file);
}

function importLine(from: string, target: string): string {
	return `@import ${JSON.stringify(relativeUrl(from, target))};`;
}

function moduleExport(from: string, target: string): string {
	return relativeUrl(from, target);
}

function hasEmbeddedTypographyFonts(typography: unknown): boolean {
	return Boolean(
		typography &&
		typeof typography === 'object' &&
		'fonts' in typography &&
		(typography as { fonts?: unknown }).fonts
	);
}

async function resolveSystem(
	project: WorkspaceProject,
	configDirectory: string,
	staging: string,
	plan: WorkspacePlan
): Promise<WorkspaceRenderResult> {
	const projectFonts = project.fonts ?? {};
	const sourceTypography = project.system.typography;
	const embeddedFonts = hasEmbeddedTypographyFonts(sourceTypography);
	if (Object.keys(projectFonts).length > 0 && embeddedFonts) {
		throw new Error(
			'Configure project fonts either at project.fonts or system.typography.fonts, not both.'
		);
	}

	let preparedFonts: PrepareFontsResult | undefined;
	if (Object.keys(projectFonts).length > 0) {
		const fontConfig: FontsPreparationConfig = {
			output: { directory: plan.fontDirectory, publicPath: '.' },
			fonts: projectFonts,
		};
		preparedFonts = await prepareFonts(fontConfig, configDirectory, {
			outputDirectory: path.join(staging, plan.fontDirectory),
		});
	}

	let typography: TypographySystem | undefined;
	if (sourceTypography) {
		if (preparedFonts && !embeddedFonts) {
			const fonts = Object.fromEntries(
				Object.entries(projectFonts).map(([id, configured]) => [
					id,
					fontFromManifest(preparedFonts!.manifest, id, fontFallback(configured)),
				])
			);
			typography = { ...sourceTypography, fonts } as TypographySystem;
		} else typography = sourceTypography as TypographySystem;
	}

	generate({ ...project.system, typography }, project.generator);
	let adjustedFallbacks: AdjustedFallbackBuildResult | undefined;
	if (preparedFonts && typography) {
		adjustedFallbacks = await buildAdjustedFallbacks(
			typography,
			preparedFonts.manifest,
			projectFonts,
			{ preparedDirectory: path.join(staging, plan.fontDirectory) }
		);
		if (adjustedFallbacks) {
			typography = adjustedFallbacks.typography;
			preparedFonts.css = joinFontFaceCss(preparedFonts.css, adjustedFallbacks.css);
			await fs.writeFile(preparedFonts.cssPath, preparedFonts.css);
			await writeText(
				staging,
				path.posix.join(plan.fontDirectory, 'fallbacks.manifest.json'),
				`${JSON.stringify(adjustedFallbacks.manifest, null, 2)}\n`
			);
		}
	}
	const system: PartialDesignSystem = { ...project.system, typography };
	return { system, ir: generate(system, project.generator), preparedFonts, adjustedFallbacks };
}

/** Render the already-planned graph. No host-package or final-output paths are written here. */
export async function renderWorkspacePackage(
	project: WorkspaceProject,
	configDirectory: string,
	staging: string,
	plan: WorkspacePlan
): Promise<WorkspaceRenderResult> {
	validateRuntimeFontUrlPolicy(plan.runtimeFontUrls);
	const result = await resolveSystem(project, configDirectory, staging, plan);
	const { system, ir, preparedFonts, adjustedFallbacks } = result;

	if (plan.css.tokens) {
		await writeText(
			staging,
			'runtime/styles/tokens.css',
			generateCss(system, { ...project.generator, selectors: plan.css.tokenSelectors })
		);
	}

	const runtimeFaceTarget = plan.css.typography
		? 'runtime/styles/typography.css'
		: plan.css.separateFonts
			? 'runtime/styles/fonts.css'
			: undefined;
	const runtimeFontCss =
		preparedFonts && runtimeFaceTarget
			? joinFontFaceCss(
					renderFontFaceCss(preparedFonts.manifest, {
						includeHeader: false,
						resolveUrl: (face) =>
							fontFaceUrl(runtimeFaceTarget, plan.fontDirectory, plan.runtimeFontUrls, face),
					}),
					adjustedFallbacks?.css
				)
			: undefined;
	if (plan.css.typography) {
		await writeText(
			staging,
			'runtime/styles/typography.css',
			toTypographyCss(ir, {
				classPrefix: plan.css.typographyClassPrefix,
				specificity: plan.css.typographySpecificity,
				fontFaceCss: runtimeFontCss,
			})
		);
	}
	if (plan.css.separateFonts && runtimeFontCss) {
		await writeText(staging, 'runtime/styles/fonts.css', runtimeFontCss);
	}
	if (plan.css.module) {
		await writeText(
			staging,
			'runtime/styles/typography.module.css',
			toTypographyCss(ir, { scope: 'module' })
		);
		await writeText(
			staging,
			'runtime/styles/typography.module.css.d.ts',
			toTypographyCssModuleTypes(ir)
		);
	}
	if (plan.css.shadows) {
		await writeText(
			staging,
			'runtime/styles/shadows.css',
			toShadowCss(ir, {
				classPrefix: plan.css.shadowClassPrefix,
				specificity: plan.css.shadowSpecificity,
			})
		);
	}
	if (plan.css.shadowModule) {
		await writeText(
			staging,
			'runtime/styles/shadows.module.css',
			toShadowCss(ir, { scope: 'module' })
		);
		await writeText(staging, 'runtime/styles/shadows.module.css.d.ts', toShadowCssModuleTypes(ir));
	}
	if (plan.css.entry) {
		const imports = [
			...(plan.css.separateFonts ? ['runtime/styles/fonts.css'] : []),
			...(plan.css.tokens ? ['runtime/styles/tokens.css'] : []),
			...(plan.css.typography ? ['runtime/styles/typography.css'] : []),
			...(plan.css.shadows ? ['runtime/styles/shadows.css'] : []),
		];
		await writeText(
			staging,
			'runtime/styles/index.css',
			`${imports.map((target) => importLine('runtime/styles/index.css', target)).join('\n')}\n`
		);
	}

	const modules: string[] = [];
	const writeContract = async (
		name: string,
		contract: { javascript: string; declaration: string }
	) => {
		modules.push(name);
		await writeText(staging, `runtime/${name}.js`, contract.javascript);
		await writeText(staging, `runtime/${name}.d.ts`, contract.declaration);
	};
	if (plan.contracts.system) await writeContract('system', renderSystemContract(system, ir));
	if (plan.contracts.typography) {
		await writeContract('typography', renderTypographyContract(ir));
	}
	if (plan.contracts.nativeColorModes) {
		await writeContract('native-color-modes', renderNativeColorModesContract(system));
	}
	if (plan.contracts.runtimeColorTheme) {
		await writeContract(
			'runtime-color-theme',
			renderRuntimeColorThemeContract(system, resolveGeneratorConfig(project.generator))
		);
	}
	if (modules.length > 0 && plan.host.rootExport) {
		const js = modules
			.map(
				(name) =>
					`export * from ${JSON.stringify(moduleExport('runtime/index.js', `runtime/${name}.js`))};`
			)
			.join('\n');
		const dts = modules
			.map(
				(name) =>
					`export * from ${JSON.stringify(moduleExport('runtime/index.d.ts', `runtime/${name}.js`))};`
			)
			.join('\n');
		await writeText(staging, 'runtime/index.js', `${js}\n`);
		await writeText(staging, 'runtime/index.d.ts', `${dts}\n`);
	}

	if (plan.review.specimen) {
		const fontFaceHref = preparedFonts
			? moduleExport('review/typography.html', path.posix.join(plan.fontDirectory, 'fonts.css'))
			: undefined;
		await writeText(
			staging,
			'review/typography.html',
			generateTypographySpecimen(system, {
				specimen: {
					title: plan.review.title,
					interactive: plan.review.interactive,
					fontFaceHref,
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
	if (plan.review.workbench) {
		const systemCss = generateCss(system, {
			...project.generator,
			selectors: plan.css.tokenSelectors,
		});
		const fingerprint = createHash('sha256').update(JSON.stringify(ir)).digest('hex');
		const contract = createWorkbenchContract(system, ir, {
			title: plan.review.workbenchTitle,
			systemFingerprint: fingerprint,
			toolVersion: COMPILER_VERSION,
			stylesheets: [
				...(preparedFonts
					? [relativeUrl('review/index.html', path.posix.join(plan.fontDirectory, 'fonts.css'))]
					: []),
				'./system.css',
			],
			adjustedFallbackFamilies: adjustedFallbacks
				? Object.fromEntries(
						Object.entries(adjustedFallbacks.manifest.roles).map(([role, entry]) => [
							role,
							entry.fallbackFamily,
						])
					)
				: undefined,
		});
		await Promise.all([
			writeText(staging, 'review/index.html', await workbenchAsset('index.html')),
			writeText(staging, 'review/workbench.css', await workbenchAsset('workbench.css')),
			writeText(staging, 'review/workbench.js', await workbenchAsset('workbench.js')),
			writeText(staging, 'review/system.css', systemCss),
			writeText(staging, 'review/workbench.json', `${JSON.stringify(contract, null, 2)}\n`),
		]);
	}
	if (plan.review.shadowSpecimen) {
		await writeText(
			staging,
			'review/shadows.html',
			toShadowSpecimen(ir, {
				title: plan.review.shadowTitle,
				interactive: plan.review.shadowInteractive,
			})
		);
	}
	if (plan.design.dtcg) {
		await writeText(
			staging,
			'design/tokens.dtcg.json',
			generateFigmaJson(system, { transformer: plan.design.dtcg }, 'dtcg')
		);
	}
	if (plan.design.figmaVariables) {
		await writeText(
			staging,
			'design/figma.variables.json',
			generateFigmaJson(system, { transformer: plan.design.figmaVariables }, 'figma-variables')
		);
	}
	return result;
}
