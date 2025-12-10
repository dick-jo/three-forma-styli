/**
 * Typography token generator
 *
 * Generates font size tokens using additive formula: fs-{n} = base + ((n - 1) * increment)
 */

import type { DesignSystem, TypographyMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';
import { getDefaultMode } from './utils.js';

/**
 * Format a number, removing unnecessary trailing zeros
 */
function formatNumber(value: number): string {
	return value.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * Generate tokens for a single typography mode
 */
function generateTokensForMode(
	mode: TypographyMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.typography;
	const { unit, base, min, increment, range } = mode.tokens;
	const tokens: TokenValue[] = [];

	// fs-min
	tokens.push({
		family: 'typography',
		name: `${prefix}-min`,
		value: `${formatNumber(min)}${unit}`,
		rawValue: min,
		unit,
	});

	// fs-1 through fs-{range}
	for (let i = 1; i <= range; i++) {
		const value = i === 1 ? base : base + increment * (i - 1);
		tokens.push({
			family: 'typography',
			name: `${prefix}-${i}`,
			value: `${formatNumber(value)}${unit}`,
			rawValue: value,
			unit,
		});
	}

	return tokens;
}

/**
 * Generate all typography tokens from a DesignSystem
 */
export function generateTypographyTokens(
	typography: DesignSystem['typography'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(typography.modes);
	const overrideModes = typography.modes.filter((m) => m !== defaultMode);

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
