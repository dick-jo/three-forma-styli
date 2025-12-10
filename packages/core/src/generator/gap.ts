/**
 * Gap token generator
 *
 * Generates gap tokens that reference spacing values
 */

import type { DesignSystem, GapMode, SpacingMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';

/**
 * Get the default mode from an array of modes
 */
function getDefaultMode<T extends { isDefault?: boolean; name: string }>(modes: T[]): T {
	const defaultMode = modes.find((m) => m.isDefault);
	return defaultMode || modes[0];
}

/**
 * Properties that are metadata, not actual gap values
 */
const META_PROPS = ['unit', 'spacingMode'];

/**
 * Generate tokens for a single gap mode
 */
function generateTokensForMode(
	gapMode: GapMode & { name: string },
	spacingMode: SpacingMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.gap;
	const gapSystem = gapMode.tokens;
	const spacingSystem = spacingMode.tokens;

	// Determine unit (use gap unit if specified, otherwise spacing unit)
	const unit = gapSystem.unit || spacingSystem.unit;

	const tokens: TokenValue[] = [];

	// Helper function to resolve a gap value
	const resolveGapValue = (value: number | 'min'): number => {
		if (value === 'min') return spacingSystem.min;
		return value * spacingSystem.base;
	};

	// Helper to get reference string
	const getReference = (value: number | 'min'): string => {
		if (value === 'min') return `${config.prefixes.spacing}-min`;
		return `${config.prefixes.spacing}-${value}`;
	};

	// Process all gap properties (skip metadata)
	Object.entries(gapSystem).forEach(([key, value]) => {
		if (META_PROPS.includes(key)) return;

		const resolvedValue = resolveGapValue(value as number | 'min');
		tokens.push({
			family: 'gap',
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
 * Find the spacing mode that matches a gap mode (by name or default)
 */
function findSpacingModeForGap(
	gapMode: GapMode & { name: string },
	spacingModes: Array<SpacingMode & { name: string }>
): SpacingMode & { name: string } {
	// If gap specifies a spacing mode, find it
	if (gapMode.tokens.spacingMode) {
		const namedMode = spacingModes.find((m) => m.name === gapMode.tokens.spacingMode);
		if (namedMode) return namedMode;
	}

	// Otherwise, try to find a spacing mode with the same name
	const sameNameMode = spacingModes.find((m) => m.name === gapMode.name);
	if (sameNameMode) return sameNameMode;

	// Fall back to default spacing mode
	return getDefaultMode(spacingModes);
}

/**
 * Generate all gap tokens from a DesignSystem
 */
export function generateGapTokens(
	gap: DesignSystem['gap'],
	spacing: DesignSystem['spacing'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultGapMode = getDefaultMode(gap.modes);
	const overrideGapModes = gap.modes.filter((m) => m !== defaultGapMode);

	const defaultSpacingMode = findSpacingModeForGap(defaultGapMode, spacing.modes);
	const defaultTokens = generateTokensForMode(defaultGapMode, defaultSpacingMode, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const gapMode of overrideGapModes) {
		const spacingMode = findSpacingModeForGap(gapMode, spacing.modes);
		overrideTokens[gapMode.name] = generateTokensForMode(gapMode, spacingMode, config);
	}

	return {
		defaultTokens,
		overrideTokens,
		modeInfo: {
			default: defaultGapMode.name,
			overrides: overrideGapModes.map((m) => m.name),
		},
	};
}
