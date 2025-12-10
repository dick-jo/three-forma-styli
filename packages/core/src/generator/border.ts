/**
 * Border token generators (radius and width)
 */

import type { DesignSystem, BorderRadiusMode, BorderWidthMode, SpacingMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig, ModeInfo } from './types.js';
import { getDefaultMode } from './utils.js';

// ============================================
// BORDER RADIUS
// ============================================

/**
 * Properties that are metadata, not actual border radius values
 */
const RADIUS_META_PROPS = ['unit', 'spacingMode'];

/**
 * Generate tokens for a single border radius mode
 */
function generateRadiusTokensForMode(
	borderRadiusMode: BorderRadiusMode & { name: string },
	spacingMode: SpacingMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.borderRadius;
	const borderRadiusSystem = borderRadiusMode.tokens;
	const spacingSystem = spacingMode.tokens;

	// Determine unit (use border radius unit if specified, otherwise spacing unit)
	const unit = borderRadiusSystem.unit || spacingSystem.unit;

	const tokens: TokenValue[] = [];

	// Helper function to resolve a border radius value
	const resolveValue = (value: number | 'min'): number => {
		if (value === 'min') return spacingSystem.min;
		return value * spacingSystem.base;
	};

	// Helper to get reference string
	const getReference = (value: number | 'min'): string => {
		if (value === 'min') return `${config.prefixes.spacing}-min`;
		return `${config.prefixes.spacing}-${value}`;
	};

	// Process all border radius properties (skip metadata)
	Object.entries(borderRadiusSystem).forEach(([key, value]) => {
		if (RADIUS_META_PROPS.includes(key)) return;

		const resolvedValue = resolveValue(value as number | 'min');
		tokens.push({
			family: 'borderRadius',
			name: `${prefix}-${key}`,
			value: `${resolvedValue}${unit}`,
			rawValue: resolvedValue,
			unit,
			reference: getReference(value as number | 'min'),
		});
	});

	return tokens;
}

/**
 * Find the spacing mode that matches a border radius mode (by name or default)
 */
function findSpacingModeForRadius(
	borderRadiusMode: BorderRadiusMode & { name: string },
	spacingModes: Array<SpacingMode & { name: string }>
): SpacingMode & { name: string } {
	// If border radius specifies a spacing mode, find it
	if (borderRadiusMode.tokens.spacingMode) {
		const namedMode = spacingModes.find((m) => m.name === borderRadiusMode.tokens.spacingMode);
		if (namedMode) return namedMode;
	}

	// Otherwise, try to find a spacing mode with the same name
	const sameNameMode = spacingModes.find((m) => m.name === borderRadiusMode.name);
	if (sameNameMode) return sameNameMode;

	// Fall back to default spacing mode
	return getDefaultMode(spacingModes);
}

/**
 * Generate all border radius tokens
 */
export function generateBorderRadiusTokens(
	borderRadius: DesignSystem['border']['radius'],
	spacing: DesignSystem['spacing'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultRadiusMode = getDefaultMode(borderRadius.modes);
	const overrideRadiusModes = borderRadius.modes.filter((m) => m !== defaultRadiusMode);

	const defaultSpacingMode = findSpacingModeForRadius(defaultRadiusMode, spacing.modes);
	const defaultTokens = generateRadiusTokensForMode(defaultRadiusMode, defaultSpacingMode, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const radiusMode of overrideRadiusModes) {
		const spacingMode = findSpacingModeForRadius(radiusMode, spacing.modes);
		overrideTokens[radiusMode.name] = generateRadiusTokensForMode(radiusMode, spacingMode, config);
	}

	return {
		defaultTokens,
		overrideTokens,
		modeInfo: {
			default: defaultRadiusMode.name,
			overrides: overrideRadiusModes.map((m) => m.name),
		},
	};
}

// ============================================
// BORDER WIDTH
// ============================================

/**
 * Generate tokens for a single border width mode
 */
function generateWidthTokensForMode(
	mode: BorderWidthMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.borderWidth;
	const { unit, value } = mode.tokens;

	return [
		{
			family: 'borderWidth',
			name: prefix,
			value: `${value}${unit}`,
			rawValue: value,
			unit,
		},
	];
}

/**
 * Generate all border width tokens
 */
export function generateBorderWidthTokens(
	borderWidth: DesignSystem['border']['width'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(borderWidth.modes);
	const overrideModes = borderWidth.modes.filter((m) => m !== defaultMode);

	const defaultTokens = generateWidthTokensForMode(defaultMode, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		overrideTokens[mode.name] = generateWidthTokensForMode(mode, config);
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
