/**
 * Color token generator
 *
 * Generates color tokens with transparency variants based on schedule
 */

import type { DesignSystem, ColorMode, TransparencySchedule } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';
import { formatColor, formatColorWithAlpha } from '../utils.js';
import { getDefaultMode } from './utils.js';

/**
 * Generate tokens for a single color mode
 */
function generateTokensForMode(
	mode: ColorMode & { name: string },
	transparencySchedule: TransparencySchedule | undefined,
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

		// Transparency variants (skip if no schedule provided)
		if (!transparencySchedule) return;
		Object.entries(transparencySchedule).forEach(([level, alpha]) => {
			tokens.push({
				family: 'color',
				name: `${prefix}-${colorName}-${alphaModifier}-${level}`,
				value: formatColorWithAlpha(color, alpha, config.colorFormat.alpha),
				rawValue: alpha,
				metadata: {
					isTransparencyVariant: true,
					transparencyLevel: level,
					baseColor: colorName,
				},
			});
		});
	});

	return tokens;
}

/**
 * Get the transparency schedule for a mode, falling back to system default
 */
function getTransparencySchedule(
	mode: ColorMode & { name: string },
	systemTransparencySchedule: TransparencySchedule | undefined
): TransparencySchedule | undefined {
	return mode.transparencySchedule || systemTransparencySchedule;
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
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(colors.modes);
	const overrideModes = colors.modes.filter((m) => m !== defaultMode);

	const defaultTransparencySchedule = getTransparencySchedule(defaultMode, colors.transparencySchedule);
	const defaultTokens = generateTokensForMode(defaultMode, defaultTransparencySchedule, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		if (Object.keys(mode.tokens).length > 0) {
			const modeTransparencySchedule = getTransparencySchedule(mode, defaultTransparencySchedule);
			overrideTokens[mode.name] = generateTokensForMode(mode, modeTransparencySchedule, config);
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
