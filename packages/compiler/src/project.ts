import type {
	CssTransformerConfig,
	PartialDesignSystem,
	TypographyRole,
	TypographySystem,
} from '@three-forma-styli/core';
import type { FontPreparationFamily } from './fonts/prepare.js';

export interface ProjectFont extends FontPreparationFamily {
	/** Safe generic fallback category; explicit fallbacks take precedence. */
	category?: 'sans' | 'serif' | 'mono';
	fallbacks?: string[];
}

export type ProjectTypographyRole<Fonts extends Record<string, ProjectFont>> = Omit<
	TypographyRole,
	'font'
> & {
	font: Extract<keyof Fonts, string>;
};

export type ProjectTypographyInput<Fonts extends Record<string, ProjectFont>> = Omit<
	TypographySystem,
	'fonts' | 'roles'
> & {
	roles: Record<string, ProjectTypographyRole<Fonts>>;
};

type SelfContainedTypographySystem = TypographySystem;

export type ProjectSystem<Fonts extends Record<string, ProjectFont>> = Omit<
	PartialDesignSystem,
	'typography'
> & {
	typography?:
		| SelfContainedTypographySystem
		| (keyof Fonts extends never ? never : ProjectTypographyInput<Fonts>);
};

export interface ProjectOutputFormat {
	file?: string;
}

export interface ProjectCssOutput extends ProjectOutputFormat {
	/** Selectors used for root tokens and independent color and size modes. */
	selectors?: CssTransformerConfig['selectors'];
}

export interface ProjectTypographyCssOutput extends ProjectOutputFormat {
	/** Global helper namespace without punctuation. Defaults to `text`; TFS adds `--`. */
	classPrefix?: string;
	/** Defaults to ordinary class specificity. `zero` wraps global helpers in :where(). */
	specificity?: 'class' | 'zero';
	/** Where prepared primary @font-face rules live. Defaults to `include`. */
	fontFaces?: 'include' | 'separate' | 'none';
}

export interface ProjectShadowCssOutput extends ProjectOutputFormat {
	/** Global helper namespace without punctuation. Defaults to `shadow`; TFS adds `--`. */
	classPrefix?: string;
	/** Defaults to ordinary class specificity. `zero` wraps global helpers in :where(). */
	specificity?: 'class' | 'zero';
}

export type ProjectFontAssetUrlPolicy =
	{ mode: 'relative' } | { mode: 'public'; prefix: string } | { mode: 'absolute'; prefix: string };

export interface ProjectFontAssetsOutput {
	/** Prepared font subtree inside output.directory. Defaults to `fonts`. */
	directory?: string;
	/** CSS URL policy. Portable relative URLs are the default. */
	urls?: ProjectFontAssetUrlPolicy;
}

export interface ProjectJsonOutput extends ProjectOutputFormat {
	colorSpace?: 'srgb' | 'display-p3';
	collectionName?: string;
}

/** The original flat-file output contract. Its defaults and emitted bytes are stable. */
export interface LegacyTfsProjectOutput {
	layout?: 'flat';
	directory: string;
	fontAssets?: ProjectFontAssetsOutput;
	css?: boolean | ProjectCssOutput;
	indexCss?: boolean | ProjectOutputFormat;
	typographyCss?: boolean | ProjectTypographyCssOutput;
	typographyModule?: boolean | ProjectOutputFormat;
	typescript?: boolean | ProjectOutputFormat;
	/** Standalone typed contract for all resolved modes and their authored source values. */
	systemTypescript?: boolean | ProjectOutputFormat;
	specimen?: boolean | (ProjectOutputFormat & { title?: string; interactive?: boolean });
	dtcg?: boolean | ProjectJsonOutput;
	figmaVariables?: boolean | ProjectJsonOutput;
}

export interface WorkspaceHostPackageOutput {
	/** Human-owned package manifest, relative to the TFS config. Defaults to package.json. */
	manifest?: string;
	/** Require and verify the package root export. Defaults to true. */
	rootExport?: boolean;
	/** Verify that generated CSS is covered by package sideEffects. Defaults to true. */
	verifySideEffects?: boolean;
	/** Verify package files coverage when present or publishable. Defaults to if-publishable. */
	verifyPublishedFiles?: 'always' | 'if-publishable' | 'never';
}

export interface WorkspaceFontAssetsOutput {
	/** Prepared font subtree inside the generated directory. Defaults to assets/fonts. */
	directory?: string;
}

export interface WorkspaceRuntimeCssOutput {
	/** Emit runtime/styles/index.css. Defaults to true. */
	entry?: boolean;
	/** Emit the generated token stylesheet. Defaults to true. */
	tokens?: boolean | Omit<ProjectCssOutput, 'file'>;
	/** Emit global semantic typography helpers. Defaults to true when roles exist. */
	typography?: boolean | Omit<ProjectTypographyCssOutput, 'file' | 'fontFaces'>;
	/** Emit the CSS Module and declaration. Defaults to true when roles exist. */
	module?: boolean;
	/** Emit global box/text shadow helper classes when shadow recipes exist. */
	shadows?: boolean | Omit<ProjectShadowCssOutput, 'file'>;
	/** Emit kebab-case shadow CSS Module helpers and their declaration. */
	shadowModule?: boolean;
	/** URL policy for runtime font-face sources. Review always uses relative prepared assets. */
	fontUrls?: ProjectFontAssetUrlPolicy;
}

export interface WorkspaceRuntimeContractsOutput {
	/** Emit runtime/system.js and its literal declaration. Defaults to true. */
	system?: boolean;
	/** Emit runtime/typography.js and its literal declaration when roles exist. Defaults to true. */
	typography?: boolean;
	/** Emit the compact authored native color-mode contract. Defaults to true for colors. */
	nativeColorModes?: boolean;
}

export interface WorkspaceRuntimeOutput {
	css?: boolean | WorkspaceRuntimeCssOutput;
	contracts?: boolean | WorkspaceRuntimeContractsOutput;
}

export interface WorkspaceSpecimenOutput {
	title?: string;
	interactive?: boolean;
	/** Prepared project fonts are the only supported review source. */
	fonts?: 'prepared';
}

export interface WorkspaceWorkbenchOutput {
	title?: string;
}

export interface WorkspaceReviewOutput {
	/** Emit the portable, contract-driven visual workbench. */
	workbench?: boolean | WorkspaceWorkbenchOutput;
	/** @deprecated Use workbench. Retained temporarily for migration evidence. */
	specimen?: boolean | WorkspaceSpecimenOutput;
	/** Layering, clipping, banding and color-mode review for shadow recipes. */
	/** @deprecated Use workbench. Retained temporarily for migration evidence. */
	shadowSpecimen?: boolean | Omit<WorkspaceSpecimenOutput, 'fonts'>;
}

export interface WorkspaceDesignOutput {
	dtcg?: boolean | Omit<ProjectJsonOutput, 'file'>;
	figmaVariables?: boolean | Omit<ProjectJsonOutput, 'file'>;
}

/** A package-shaped, generated subtree hosted by a human-owned package.json. */
export interface WorkspacePackageOutput {
	layout: 'workspace-package';
	directory: string;
	hostPackage?: WorkspaceHostPackageOutput;
	assets?: { fonts?: WorkspaceFontAssetsOutput };
	targets: {
		runtime?: boolean | WorkspaceRuntimeOutput;
		review?: boolean | WorkspaceReviewOutput;
		design?: boolean | WorkspaceDesignOutput;
	};
	fontAssets?: never;
	css?: never;
	indexCss?: never;
	typographyCss?: never;
	typographyModule?: never;
	typescript?: never;
	systemTypescript?: never;
	specimen?: never;
	dtcg?: never;
	figmaVariables?: never;
}

/** Strictly discriminated output layouts; workspace-package cannot mix flat keys. */
export type TfsProjectOutput = LegacyTfsProjectOutput | WorkspacePackageOutput;

export interface TfsProjectInput<Fonts extends Record<string, ProjectFont>> {
	fonts?: Fonts;
	system: ProjectSystem<Fonts>;
	output: TfsProjectOutput;
}

export interface TfsProject<
	Fonts extends Record<string, ProjectFont> = Record<string, ProjectFont>,
> extends TfsProjectInput<Fonts> {
	kind: 'three-forma-styli/project';
	schemaVersion: 1;
}

/** Mark a portable, one-command TFS compiler project while preserving literal font IDs. */
export function defineTfsProject<const Fonts extends Record<string, ProjectFont>>(
	input: TfsProjectInput<NoInfer<Fonts>> & { fonts: Fonts }
): TfsProject<Fonts>;
export function defineTfsProject(
	input: TfsProjectInput<Record<never, never>> & { fonts?: undefined }
): TfsProject<Record<never, never>>;
export function defineTfsProject(
	input: TfsProjectInput<Record<string, ProjectFont>>
): TfsProject<Record<string, ProjectFont>> {
	return {
		kind: 'three-forma-styli/project',
		schemaVersion: 1,
		...input,
	};
}
