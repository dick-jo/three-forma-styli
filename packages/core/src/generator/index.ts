/**
 * Main generator - orchestrates all token generators and produces IR
 *
 * Supports both full DesignSystem and PartialDesignSystem inputs.
 * When using partial input, only the provided token families are generated.
 */

import type { DesignSystem, PartialDesignSystem } from '../types.js';
import type { IR, TokenValue, GeneratorConfig, GeneratorResult, ModeInfo } from './types.js';
import { defaultGeneratorConfig } from './types.js';
import { validatePartialDesignSystem, ValidationError } from './validate.js';
import { generateColorTokens } from './colors.js';
import { generateSpacingTokens } from './spacing.js';
import { generateGapTokens } from './gap.js';
import { generateTypographyTokens } from './typography.js';
import { generateBorderRadiusTokens, generateBorderWidthTokens } from './border.js';
import { generateTimeTokens } from './time.js';

export { ValidationError };
export type { IR, TokenValue, GeneratorConfig, GeneratorResult, ModeInfo };

/**
 * Empty generator result for when a family is not provided
 */
const emptyResult: GeneratorResult = {
	defaultTokens: [],
	overrideTokens: {},
	modeInfo: { default: '', overrides: [] },
};

/**
 * Merge user config with defaults
 */
function mergeConfig(userConfig?: Partial<GeneratorConfig>): GeneratorConfig {
	if (!userConfig) {
		return defaultGeneratorConfig;
	}

	return {
		prefixes: {
			...defaultGeneratorConfig.prefixes,
			...userConfig.prefixes,
		},
		separators: {
			...defaultGeneratorConfig.separators,
			...userConfig.separators,
		},
		modeCategories: {
			...defaultGeneratorConfig.modeCategories,
			...userConfig.modeCategories,
		},
		colorFormat: {
			...defaultGeneratorConfig.colorFormat,
			...userConfig.colorFormat,
		},
	};
}

/**
 * Convert array of tokens to record keyed by token name
 */
function tokensToRecord(tokens: TokenValue[]): Record<string, TokenValue> {
	const record: Record<string, TokenValue> = {};
	for (const token of tokens) {
		record[token.name] = token;
	}
	return record;
}

/**
 * Generate the complete Intermediate Representation from a DesignSystem or PartialDesignSystem
 *
 * @example Full design system
 * ```ts
 * const ir = generate(fullDesignSystem);
 * ```
 *
 * @example Partial - just colors
 * ```ts
 * const ir = generate({
 *   colors: {
 *     modes: [{ name: 'default', isDefault: true, tokens: { bg, primary, ink } }],
 *     transparencySchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 },
 *   },
 * });
 * ```
 */
export function generate(
	designSystem: DesignSystem | PartialDesignSystem,
	userConfig?: Partial<GeneratorConfig>
): IR {
	// Validate inputs
	validatePartialDesignSystem(designSystem);

	// Merge config
	const config = mergeConfig(userConfig);

	// Generate tokens for each family (if provided)
	const colorResult = designSystem.colors
		? generateColorTokens(designSystem.colors, config)
		: emptyResult;

	const spacingResult = designSystem.spacing
		? generateSpacingTokens(designSystem.spacing, config)
		: emptyResult;

	// Gap and borderRadius depend on spacing
	const gapResult = designSystem.gap && designSystem.spacing
		? generateGapTokens(designSystem.gap, designSystem.spacing, config)
		: emptyResult;

	const typographyResult = designSystem.typography
		? generateTypographyTokens(designSystem.typography, config)
		: emptyResult;

	const borderRadiusResult = designSystem.border?.radius && designSystem.spacing
		? generateBorderRadiusTokens(designSystem.border.radius, designSystem.spacing, config)
		: emptyResult;

	const borderWidthResult = designSystem.border?.width
		? generateBorderWidthTokens(designSystem.border.width, config)
		: emptyResult;

	const timeResult = designSystem.time
		? generateTimeTokens(designSystem.time, config)
		: emptyResult;

	const results = {
		colors: colorResult,
		spacing: spacingResult,
		gap: gapResult,
		typography: typographyResult,
		borderRadius: borderRadiusResult,
		borderWidth: borderWidthResult,
		time: timeResult,
	};

	// Combine all default tokens
	const allDefaultTokens = [
		...colorResult.defaultTokens,
		...spacingResult.defaultTokens,
		...gapResult.defaultTokens,
		...typographyResult.defaultTokens,
		...borderRadiusResult.defaultTokens,
		...borderWidthResult.defaultTokens,
		...timeResult.defaultTokens,
	];

	// Collect all override mode names
	const allOverrideModes = new Set<string>();
	Object.values(results).forEach((result) => {
		result.modeInfo.overrides.forEach((name) => allOverrideModes.add(name));
	});

	// Build override tokens by mode, grouped by category
	const overrideTokens: Record<string, Record<string, TokenValue>> = {};

	for (const modeName of allOverrideModes) {
		const modeTokens: TokenValue[] = [];

		// Collect tokens from each family if this mode has overrides
		if (colorResult.overrideTokens[modeName]) {
			modeTokens.push(...colorResult.overrideTokens[modeName]);
		}
		if (spacingResult.overrideTokens[modeName]) {
			modeTokens.push(...spacingResult.overrideTokens[modeName]);
		}
		if (gapResult.overrideTokens[modeName]) {
			modeTokens.push(...gapResult.overrideTokens[modeName]);
		}
		if (typographyResult.overrideTokens[modeName]) {
			modeTokens.push(...typographyResult.overrideTokens[modeName]);
		}
		if (borderRadiusResult.overrideTokens[modeName]) {
			modeTokens.push(...borderRadiusResult.overrideTokens[modeName]);
		}
		if (borderWidthResult.overrideTokens[modeName]) {
			modeTokens.push(...borderWidthResult.overrideTokens[modeName]);
		}
		if (timeResult.overrideTokens[modeName]) {
			modeTokens.push(...timeResult.overrideTokens[modeName]);
		}

		if (modeTokens.length > 0) {
			overrideTokens[modeName] = tokensToRecord(modeTokens);
		}
	}

	// Build mode info
	const colorOverrides = colorResult.modeInfo.overrides;
	const timeOverrides = timeResult.modeInfo.overrides;

	// Size overrides: union of all size family overrides
	const sizeOverridesSet = new Set<string>();
	[spacingResult, gapResult, typographyResult, borderRadiusResult, borderWidthResult].forEach(
		(result) => {
			result.modeInfo.overrides.forEach((name) => sizeOverridesSet.add(name));
		}
	);
	const sizeOverrides = Array.from(sizeOverridesSet);

	return {
		tokens: tokensToRecord(allDefaultTokens),
		modes: {
			color: {
				default: colorResult.modeInfo.default,
				overrides: colorOverrides,
			},
			size: {
				default: spacingResult.modeInfo.default,
				overrides: sizeOverrides,
			},
			time: {
				default: timeResult.modeInfo.default,
				overrides: timeOverrides,
			},
		},
		overrideTokens,
	};
}
