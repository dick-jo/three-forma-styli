/**
 * Color token generator
 *
 * Generates color tokens with alpha variants based on schedule
 */

import type { DesignSystem, ColorMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';
import { formatColor, formatColorWithAlpha } from '../utils.js';
import { getDefaultEntry } from './utils.js';

/**
 * Generate tokens for a single color mode
 */
function generateTokensForMode(
	mode: ColorMode & { name: string },
	alphaSchedule: Readonly<Record<string, number>>,
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.color;
	const { alphaModifier } = config.colorFormat;
	const tokens: TokenValue[] = [];

	Object.entries(mode.tokens).forEach(([colorName, color]) => {
		// Skip undefined tokens (happens with partial override modes)
		if (!color) return;

		// Base color
		tokens.push({
			family: 'color',
			name: `${prefix}-${colorName}`,
			value: formatColor(color, config.colorFormat.base),
			metadata: {
				baseColor: colorName,
			},
		});

		Object.entries(alphaSchedule).forEach(([level, alpha]) => {
			tokens.push({
				family: 'color',
				name: `${prefix}-${colorName}-${alphaModifier}-${level}`,
				value: formatColorWithAlpha(color, alpha, config.colorFormat.alpha),
				rawValue: alpha,
				metadata: {
					isAlphaVariant: true,
					alphaLevel: level,
					baseColor: colorName,
				},
			});
		});
	});

	return tokens;
}

/**
 * Generate all color tokens from a DesignSystem
 *
 * Default mode generates all tokens (placed in :root).
 * Override modes only generate tokens for explicitly defined colors
 * (CSS cascade handles inheritance from :root).
 */
export function generateColorTokens(
	colors: DesignSystem['colors'],
	config: GeneratorConfig,
	resolvedAlphaSchedule: Readonly<Record<string, number>> = {}
): GeneratorResult {
	const defaultMode = getDefaultEntry(colors.modes);
	const overrideModes = colors.modes.filter((m) => m !== defaultMode);

	const defaultTokens = generateTokensForMode(defaultMode, resolvedAlphaSchedule, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		if (Object.keys(mode.tokens).length > 0) {
			overrideTokens[mode.name] = generateTokensForMode(mode, resolvedAlphaSchedule, config);
		}
	}

	return {
		defaultTokens,
		overrideTokens,
		modeInfo: {
			default: defaultMode.name,
			overrides: overrideModes.map((m) => m.name),
		},
	};
}
