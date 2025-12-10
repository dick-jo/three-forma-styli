/**
 * Color token generator
 *
 * Generates color tokens with transparency variants based on schedule
 */

import type { Oklch } from 'culori';
import type { DesignSystem, ColorMode, TransparencySchedule } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';
import { formatColor, formatColorWithAlpha } from '../utils.js';

/**
 * Get the default mode from an array of modes
 */
function getDefaultMode<T extends { isDefault?: boolean; name: string }>(modes: T[]): T {
	const defaultMode = modes.find((m) => m.isDefault);
	return defaultMode || modes[0];
}

/**
 * Generate tokens for a single color mode
 */
function generateTokensForMode(
	mode: ColorMode & { name: string },
	transparencySchedule: TransparencySchedule,
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

		// Transparency variants
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
 * Normalize color modes - fill in missing tokens from default mode
 */
function normalizeColorModes(
	modes: Array<ColorMode & { name: string }>,
	systemTransparencySchedule: TransparencySchedule
): Array<ColorMode & { name: string }> {
	// Deep clone to avoid mutating original (JSON clone since culori objects aren't structuredClone-able)
	const normalized = JSON.parse(JSON.stringify(modes)) as Array<ColorMode & { name: string }>;

	const defaultMode = getDefaultMode(normalized);
	const defaultTokens = defaultMode.tokens;
	const defaultTransparencySchedule = defaultMode.transparencySchedule || systemTransparencySchedule;

	// Fill in missing tokens and transparency schedules for override modes
	normalized.forEach((mode) => {
		if (mode === defaultMode) return;

		// Fill missing tokens from default
		Object.entries(defaultTokens).forEach(([tokenName, tokenValue]) => {
			if (tokenValue && (!(tokenName in mode.tokens) || mode.tokens[tokenName] === undefined)) {
				(mode.tokens as Record<string, Oklch>)[tokenName] = tokenValue;
			}
		});

		// Fill missing transparency schedule from default
		if (!mode.transparencySchedule) {
			mode.transparencySchedule = defaultTransparencySchedule;
		}
	});

	return normalized;
}

/**
 * Generate all color tokens from a DesignSystem
 */
export function generateColorTokens(
	colors: DesignSystem['colors'],
	config: GeneratorConfig
): GeneratorResult {
	const normalizedModes = normalizeColorModes(colors.modes, colors.transparencySchedule);
	const defaultMode = getDefaultMode(normalizedModes);
	const overrideModes = normalizedModes.filter((m) => m !== defaultMode);

	const defaultTransparencySchedule = defaultMode.transparencySchedule || colors.transparencySchedule;
	const defaultTokens = generateTokensForMode(defaultMode, defaultTransparencySchedule, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		const modeTransparencySchedule = mode.transparencySchedule || defaultTransparencySchedule;
		// For overrides, we only generate tokens for colors that were explicitly defined
		// (not inherited), so we use the original mode from colors.modes
		const originalMode = colors.modes.find((m) => m.name === mode.name);
		if (originalMode && Object.keys(originalMode.tokens).length > 0) {
			overrideTokens[mode.name] = generateTokensForMode(
				originalMode as ColorMode & { name: string },
				modeTransparencySchedule,
				config
			);
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
