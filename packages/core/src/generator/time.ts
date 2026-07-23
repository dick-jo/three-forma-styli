/**
 * Time token generator
 *
 * Generates time tokens using multiplicative formula: t-{n} = base * n
 *
 * The default scale gets unprefixed tokens (--t-1, --t-2, etc.)
 * Other scales get their name as prefix (--t-anim-1, --t-anim-2, etc.)
 */

import type { DesignSystem, TimeScale } from '../types.js';
import type { TokenValue, GeneratorConfig, TimeGeneratorResult } from './types.js';
import { getDefaultEntry } from './utils.js';

/**
 * Generate tokens for a single time scale.
 */
function generateTokensForMode(
	scale: TimeScale & { name: string },
	isDefaultScale: boolean,
	config: GeneratorConfig
): TokenValue[] {
	const basePrefix = config.prefixes.time;
	const { unit, base, min, range } = scale.tokens;
	const tokens: TokenValue[] = [];

	const prefix = isDefaultScale ? basePrefix : `${basePrefix}-${scale.name}`;

	// min token
	tokens.push({
		family: 'time',
		name: `${prefix}-min`,
		value: `${min}${unit}`,
		rawValue: min,
		unit,
		metadata: {
			timeScale: scale.name,
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
				timeScale: scale.name,
			},
		});
	}

	return tokens;
}

/**
 * Generate all time tokens from a DesignSystem
 *
 * Unlike mode generators, every time scale outputs to :root.
 */
export function generateTimeTokens(
	time: DesignSystem['time'],
	config: GeneratorConfig
): TimeGeneratorResult {
	const defaultScale = getDefaultEntry(time.scales);
	const allTokens: TokenValue[] = [];

	for (const scale of time.scales) {
		allTokens.push(...generateTokensForMode(scale, scale === defaultScale, config));
	}

	return {
		defaultTokens: allTokens,
		scaleInfo: {
			default: defaultScale.name,
			names: time.scales.map((scale) => scale.name),
		},
	};
}
