import { ALPHA_POSITIONS, ALPHA_POSITIONS_WITH_NON } from '../alpha/index.js';
import type { AlphaScaleValues, AlphaSystem } from '../types.js';
import type { AlphaContract, GeneratorResult, TokenValue } from './types.js';

export function resolvedAlphaValues(values: AlphaScaleValues) {
	return { non: 0, ...values } as const;
}

export function alphaScaleValues(alpha: AlphaSystem, scaleName: string): AlphaScaleValues {
	const scale = alpha.scales[scaleName];
	if (!scale) throw new Error(`Unknown alpha scale "${scaleName}".`);
	return scale.values;
}

function tokenName(scaleName: string, defaultScale: string, position: string): string {
	return scaleName === defaultScale ? `a-${position}` : `a-${scaleName}-${position}`;
}

export function generateAlphaTokens(
	alpha: AlphaSystem
): GeneratorResult & { contract: AlphaContract } {
	const tokens: TokenValue[] = [];
	const scales: AlphaContract['scales'] = {};
	for (const [scaleName, scale] of Object.entries(alpha.scales)) {
		const resolved = resolvedAlphaValues(scale.values);
		const contractValues = {} as AlphaContract['scales'][string]['values'];
		for (const position of ALPHA_POSITIONS_WITH_NON) {
			const value = resolved[position];
			const name = tokenName(scaleName, alpha.defaultScale, position);
			tokens.push({ family: 'alpha', name, value: String(value), rawValue: value });
			contractValues[position] = { value, token: name, css: `var(--${name})` };
		}
		scales[scaleName] = { values: contractValues };
	}
	return {
		defaultTokens: tokens,
		overrideTokens: {},
		modeInfo: { default: '', overrides: [] },
		contract: {
			defaultScale: alpha.defaultScale,
			positions: [...ALPHA_POSITIONS],
			scales,
		},
	};
}
