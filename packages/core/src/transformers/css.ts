/**
 * CSS Transformer
 *
 * Converts Intermediate Representation (IR) to CSS custom properties
 */

import type { IR, TokenValue } from '../generator/types.js';

/**
 * CSS Transformer configuration
 */
export interface CssTransformerConfig {
	/** CSS selectors for different mode categories */
	selectors?: {
		root?: string;
		colorMode?: string;
		sizeMode?: string;
		timeMode?: string;
	};
}

/**
 * Default CSS transformer configuration (internal, with all values)
 */
const defaultSelectors: ResolvedCssConfig['selectors'] = {
	root: ':root',
	colorMode: '[data-color-mode="{mode}"]',
	sizeMode: '[data-size-mode="{mode}"]',
	timeMode: '[data-time-mode="{mode}"]',
};

/**
 * Default CSS transformer configuration (exported for reference)
 */
export const defaultCssConfig: Required<CssTransformerConfig> = {
	selectors: defaultSelectors,
};

/**
 * Internal resolved config with all values present
 */
interface ResolvedCssConfig {
	selectors: {
		root: string;
		colorMode: string;
		sizeMode: string;
		timeMode: string;
	};
}

/**
 * Merge user config with defaults
 */
function mergeConfig(userConfig?: CssTransformerConfig): ResolvedCssConfig {
	return {
		selectors: {
			...defaultSelectors,
			...userConfig?.selectors,
		},
	};
}

/**
 * Determine which category a mode belongs to based on which tokens it contains
 */
function getModeCategory(
	modeName: string,
	ir: IR
): 'color' | 'size' | 'time' | null {
	// Check color modes
	if (ir.modes.color.overrides.includes(modeName)) {
		return 'color';
	}

	// Check size modes
	if (ir.modes.size.overrides.includes(modeName)) {
		return 'size';
	}

	// Check time modes
	if (ir.modes.time.overrides.includes(modeName)) {
		return 'time';
	}

	return null;
}

/**
 * Get the selector for a mode based on its category
 */
function getSelectorForMode(
	modeName: string,
	category: 'color' | 'size' | 'time',
	config: ResolvedCssConfig
): string {
	switch (category) {
		case 'color':
			return config.selectors.colorMode.replace('{mode}', modeName);
		case 'size':
			return config.selectors.sizeMode.replace('{mode}', modeName);
		case 'time':
			return config.selectors.timeMode.replace('{mode}', modeName);
	}
}

/**
 * Format tokens as CSS variable declarations
 */
function formatTokensAsCss(tokens: Record<string, TokenValue>): string[] {
	const lines: string[] = [];

	for (const [name, token] of Object.entries(tokens)) {
		lines.push(`  --${name}: ${token.value};`);
	}

	return lines;
}

/**
 * Transform IR to CSS string
 */
export function toCss(ir: IR, userConfig?: Partial<CssTransformerConfig>): string {
	const config = mergeConfig(userConfig);
	const blocks: string[] = [];

	// Generate :root block with all default tokens
	const rootVars = formatTokensAsCss(ir.tokens);
	blocks.push(`${config.selectors.root} {\n${rootVars.join('\n')}\n}`);

	// Generate override blocks for each mode
	for (const [modeName, tokens] of Object.entries(ir.overrideTokens)) {
		const category = getModeCategory(modeName, ir);

		if (!category) {
			// Skip modes we can't categorize
			continue;
		}

		const selector = getSelectorForMode(modeName, category, config);
		const modeVars = formatTokensAsCss(tokens);

		if (modeVars.length > 0) {
			blocks.push(`${selector} {\n${modeVars.join('\n')}\n}`);
		}
	}

	return blocks.join('\n\n');
}
