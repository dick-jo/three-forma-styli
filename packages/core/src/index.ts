// Public API for @three-forma-styli/core

// ===========================================
// NEW API (Generator + Transformers)
// ===========================================

// Generator - produces Intermediate Representation
export { generate, ValidationError } from './generator/index.js';
export type {
	IR,
	TokenValue,
	GeneratorConfig,
	GeneratorOptions,
	GeneratorResult,
	ModeInfo,
	TypographyContract,
} from './generator/index.js';

// Transformers - convert IR to output formats
export { toCss, defaultCssConfig } from './transformers/index.js';
export type { CssTransformerConfig, FileHeaderConfig } from './transformers/index.js';

export { toFigmaJson } from './transformers/index.js';
export {
	toTypographyTypescript,
	typographyContractData,
	typographyContractTypes,
} from './transformers/index.js';
export { toTypographySpecimen } from './transformers/index.js';
export { toTypographyCss, toTypographyCssModuleTypes } from './transformers/index.js';
export type { TypographySpecimenConfig } from './transformers/index.js';
export type { TypographyCssConfig } from './transformers/index.js';
export { toShadowCss, toShadowCssModuleTypes } from './transformers/index.js';
export type { ShadowCssConfig } from './transformers/index.js';
export { toShadowSpecimen } from './transformers/index.js';
export type { ShadowSpecimenConfig } from './transformers/index.js';
export type {
	FigmaJsonTransformerConfig,
	FigmaJsonFormat,
	FigmaCollection,
	FigmaVariable,
	FigmaColor,
} from './transformers/index.js';

// Header utilities (for building custom transformers)
export { getHeaderLines, formatHeaderComment } from './transformers/index.js';
export type { FileHeaderInfo, CommentStyle } from './transformers/index.js';

// ===========================================
// CONVENIENCE FUNCTION
// ===========================================

import type { DesignSystem, PartialDesignSystem } from './types.js';
import type { GeneratorOptions } from './generator/index.js';
import type { CssTransformerConfig } from './transformers/index.js';
import type { FigmaJsonTransformerConfig } from './transformers/index.js';
import type { FigmaJsonFormat } from './transformers/index.js';
import { generate } from './generator/index.js';
import { toCss } from './transformers/index.js';
import { toFigmaJson } from './transformers/index.js';
import { toTypographyTypescript } from './transformers/index.js';
import { toTypographySpecimen } from './transformers/index.js';

/**
 * Combined config for the convenience function
 */
export interface GenerateCssConfig extends GeneratorOptions, CssTransformerConfig {}

/**
 * Convenience function: Generate CSS directly from a DesignSystem
 *
 * This combines generate() and toCss() for the most common use case.
 *
 * @example
 * ```ts
 * import { generateCss } from '@three-forma-styli/core';
 *
 * const css = generateCss(designSystem);
 * ```
 */
export function generateCss(
	designSystem: DesignSystem | PartialDesignSystem,
	config?: GenerateCssConfig
): string {
	if (config?.colorFormat?.base === 'hex-p3' || config?.colorFormat?.alpha === 'hexa-p3') {
		throw new Error(
			'Display-P3 component bytes cannot be emitted as CSS hex; use OKLCH CSS or generateFigmaJson()'
		);
	}
	const ir = generate(designSystem, config);
	return toCss(ir, config);
}

/**
 * Config for Figma JSON convenience function
 */
export interface GenerateFigmaJsonConfig {
	generator?: GeneratorOptions;
	transformer?: Partial<FigmaJsonTransformerConfig>;
}

/**
 * Convenience function: Generate Figma-compatible JSON from a DesignSystem
 *
 * Generates profile-relative color components for DTCG or Figma Variables.
 * The selected color space must match the target Figma file profile.
 *
 * @param format - 'dtcg' for standards-based interchange, 'figma-variables' for REST API
 *
 * @example
 * ```ts
 * import { generateFigmaJson } from '@three-forma-styli/core';
 *
 * const json = generateFigmaJson(designSystem);
 * fs.writeFileSync('tokens.json', json);
 * ```
 */
export function generateFigmaJson(
	designSystem: DesignSystem | PartialDesignSystem,
	config?: GenerateFigmaJsonConfig,
	format: FigmaJsonFormat = 'dtcg'
): string {
	const colorSpace = config?.transformer?.colorSpace ?? 'srgb';
	const ir = generate(designSystem, {
		...config?.generator,
		colorFormat: {
			base: colorSpace === 'display-p3' ? 'hex-p3' : 'hex',
			alpha: colorSpace === 'display-p3' ? 'hexa-p3' : 'hexa',
			alphaModifier: config?.generator?.colorFormat?.alphaModifier ?? 'a',
		},
	});
	return toFigmaJson(ir, config?.transformer, format);
}

/** Generate the typed, framework-neutral typography manifest used by local UI primitives. */
export function generateTypographyTypescript(
	designSystem: DesignSystem | PartialDesignSystem,
	config?: GeneratorOptions
): string {
	return toTypographyTypescript(generate(designSystem, config));
}

export interface GenerateTypographySpecimenConfig {
	generator?: GeneratorOptions;
	specimen?: import('./transformers/index.js').TypographySpecimenConfig;
}

/** Generate a standalone visual calibration document for semantic typography. */
export function generateTypographySpecimen(
	designSystem: DesignSystem | PartialDesignSystem,
	config?: GenerateTypographySpecimenConfig
): string {
	return toTypographySpecimen(generate(designSystem, config?.generator), config?.specimen);
}

// ===========================================
// LEGACY API (removed)
// ===========================================

// generateCssVariables has been replaced by generateCss()
// Use: import { generateCss } from '@three-forma-styli/core';

// ===========================================
// TYPES
// ===========================================

export * from './types.js';
export { defineTypography, deriveTypographyRange, fontFromManifest } from './typography/index.js';
export { deriveShadowRange } from './shadows/index.js';
export { createWorkbenchContract } from './review/contract.js';
export type {
	ReviewAssetContract,
	ReviewCapturePolicy,
	ColorReviewCase,
	ColorReviewLab,
	MotionReviewCase,
	MotionReviewLab,
	FoundationReviewCase,
	FoundationReviewLab,
	ReviewCase,
	ReviewControl,
	ReviewDiagnostic,
	ReviewLab,
	ReviewLabId,
	ReviewMode,
	ReviewModeGroup,
	ShadowReviewCase,
	TfsAgentHandoff,
	TfsReviewPatch,
	TfsWorkbenchContract,
	TypographyReviewCase,
	WorkbenchContractOptions,
	WorkbenchDraftOperation,
} from './review/types.js';

// ===========================================
// UTILITIES
// ===========================================

// Color utilities
export {
	oklch,
	oklchToCss,
	oklchToHexP3,
	applyAlpha,
	applyAlphaHexaP3,
	formatColor,
	formatColorWithAlpha,
} from './utils.js';

// Re-export Oklch type from culori for TypeScript consumers
export type { Oklch } from 'culori';

// ===========================================
// CONSTRAINT VALIDATION
// ===========================================

export * from './constraints/index.js';
