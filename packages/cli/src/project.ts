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

type ProjectTypographyRole<Fonts extends Record<string, ProjectFont>> = Omit<
	TypographyRole,
	'font'
> & {
	font: Extract<keyof Fonts, string>;
};

type ProjectTypographyInput<Fonts extends Record<string, ProjectFont>> = Omit<
	TypographySystem,
	'fonts' | 'roles'
> & {
	roles: Record<string, ProjectTypographyRole<Fonts>>;
};

type SelfContainedTypographySystem = TypographySystem;

type ProjectSystem<Fonts extends Record<string, ProjectFont>> = Omit<
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
	/** Selectors used for root tokens and independent color, size, and time modes. */
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

export interface TfsProjectOutput {
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
