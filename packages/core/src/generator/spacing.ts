/**
 * Spacing token generator
 *
 * Generates spacing tokens using multiplicative formula: sp-{n} = base * n
 */

import type { DesignSystem, SpacingMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';

/**
 * Get the default mode from an array of modes
 */
function getDefaultMode<T extends { isDefault?: boolean; name: string }>(modes: T[]): T {
	const defaultMode = modes.find((m) => m.isDefault);
	return defaultMode || modes[0];
}

/**
 * Generate tokens for a single spacing mode
 */
function generateTokensForMode(
	mode: SpacingMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.spacing;
	const { unit, base, min, range } = mode.tokens;
	const tokens: TokenValue[] = [];

	// sp-min
	tokens.push({
		family: 'spacing',
		name: `${prefix}-min`,
		value: `${min}${unit}`,
		rawValue: min,
		unit,
	});

	// sp-1 through sp-{range}
	for (let i = 1; i <= range; i++) {
		const value = base * i;
		tokens.push({
			family: 'spacing',
			name: `${prefix}-${i}`,
			value: `${value}${unit}`,
			rawValue: value,
			unit,
		});
	}

	return tokens;
}

/**
 * Generate all spacing tokens from a DesignSystem
 */
export function generateSpacingTokens(
	spacing: DesignSystem['spacing'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(spacing.modes);
	const overrideModes = spacing.modes.filter((m) => m !== defaultMode);

	const defaultTokens = generateTokensForMode(defaultMode, config);

	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		overrideTokens[mode.name] = generateTokensForMode(mode, config);
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
