// Public API for @three-forma-styli/core

// ===========================================
// NEW API (Generator + Transformers)
// ===========================================

// Generator - produces Intermediate Representation
export { generate, ValidationError } from './generator/index.js';
export type { IR, TokenValue, GeneratorConfig, GeneratorResult, ModeInfo } from './generator/index.js';

// Transformers - convert IR to output formats
export { toCss, defaultCssConfig } from './transformers/index.js';
export type { CssTransformerConfig, FileHeaderConfig } from './transformers/index.js';

// Header utilities (for building custom transformers)
export { getHeaderLines, formatHeaderComment } from './transformers/index.js';
export type { FileHeaderInfo, CommentStyle } from './transformers/index.js';

// ===========================================
// CONVENIENCE FUNCTION
// ===========================================

import type { DesignSystem } from './types.js';
import type { GeneratorConfig } from './generator/index.js';
import type { CssTransformerConfig } from './transformers/index.js';
import { generate } from './generator/index.js';
import { toCss } from './transformers/index.js';

/**
 * Combined config for the convenience function
 */
export interface GenerateCssConfig extends Partial<GeneratorConfig>, Partial<CssTransformerConfig> {}

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
	designSystem: DesignSystem,
	config?: GenerateCssConfig
): string {
	const ir = generate(designSystem, config);
	return toCss(ir, config);
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

// ===========================================
// UTILITIES
// ===========================================

// Color utilities
export { oklch, oklchToCss, applyAlpha, formatColor, formatColorWithAlpha } from './utils.js';

// Re-export Oklch type from culori for TypeScript consumers
export type { Oklch } from 'culori';

// ===========================================
// CONSTRAINT VALIDATION
// ===========================================

export * from './constraints/index.js';
