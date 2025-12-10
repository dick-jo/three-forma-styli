/**
 * Time token generator
 *
 * Generates time tokens using multiplicative formula: t-{n} = base * n
 *
 * The default mode gets unprefixed tokens (--t-1, --t-2, etc.)
 * Other modes get their name as prefix (--t-anim-1, --t-anim-2, etc.)
 */

import type { DesignSystem, TimeMode } from '../types.js';
import type { TokenValue, GeneratorResult, GeneratorConfig } from './types.js';
import { getDefaultMode } from './utils.js';

/**
 * Generate tokens for a single time mode
 */
function generateTokensForMode(
	mode: TimeMode & { name: string },
	isDefaultMode: boolean,
	config: GeneratorConfig
): TokenValue[] {
	const basePrefix = config.prefixes.time;
	const { unit, base, min, range } = mode.tokens;
	const tokens: TokenValue[] = [];

	// Default mode gets unprefixed tokens, others get their name as prefix
	const prefix = isDefaultMode ? basePrefix : `${basePrefix}-${mode.name}`;

	// min token
	tokens.push({
		family: 'time',
		name: `${prefix}-min`,
		value: `${min}${unit}`,
		rawValue: min,
		unit,
		metadata: {
			timeCategory: mode.name,
		},
	});

	// 1 through {range}
	for (let i = 1; i <= range; i++) {
		const value = base * i;
		tokens.push({
			family: 'time',
			name: `${prefix}-${i}`,
			value: `${value}${unit}`,
			rawValue: value,
			unit,
			metadata: {
				timeCategory: mode.name,
			},
		});
	}

	return tokens;
}

/**
 * Generate all time tokens from a DesignSystem
 *
 * Unlike other generators, time modes all output to :root together.
 * The default mode gets unprefixed tokens, other modes get prefixed tokens.
 */
export function generateTimeTokens(
	time: DesignSystem['time'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(time.modes);
	const allTokens: TokenValue[] = [];

	// Generate tokens for all modes - they all go to :root
	for (const mode of time.modes) {
		const isDefault = mode === defaultMode;
		allTokens.push(...generateTokensForMode(mode, isDefault, config));
	}

	return {
		defaultTokens: allTokens,
		overrideTokens: {}, // Time modes don't create CSS override blocks
		modeInfo: {
			default: defaultMode.name,
			overrides: [], // No overrides - all modes output together
		},
	};
}
