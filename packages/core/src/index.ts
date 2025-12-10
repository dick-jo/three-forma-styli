// Public API for @three-forma-styli/core

// ===========================================
// NEW API (Generator + Transformers)
// ===========================================

// Generator - produces Intermediate Representation
export { generate, ValidationError } from './generator/index.js';
export type { IR, TokenValue, GeneratorConfig, GeneratorResult, ModeInfo } from './generator/index.js';

// Transformers - convert IR to output formats
export { toCss, defaultCssConfig } from './transformers/index.js';
export type { CssTransformerConfig } from './transformers/index.js';

// ===========================================
// CONVENIENCE FUNCTION
// ===========================================

import type { DesignSystem, GeneratorConfig as LegacyGeneratorConfig } from './types.js';
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
export { oklch, oklchToCss, applyTransparency, formatColor, formatColorWithAlpha } from './utils.js';

// Legacy config export
export { transformerConfig } from './config.js';

// ===========================================
// CONSTRAINT VALIDATION
// ===========================================

export * from './constraints/index.js';
