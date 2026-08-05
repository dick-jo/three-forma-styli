import type { AlphaPosition, AlphaScale, AlphaScaleValues, AlphaSystem } from '../types.js';
import { ALPHA_POSITIONS } from './grammar.js';

export interface LinearAlphaScaleInput {
	distribution: 'linear';
	/** Optional first active value. Omit to divide zero-to-max evenly. */
	min?: number;
	/** Greatest intentional non-full alpha. Must remain below 1. */
	max: number;
}

function rounded(value: number): number {
	return Number(value.toFixed(6));
}

/**
 * Derive the ordinary explicit alpha-scale shape from a compact strategy.
 * Derivation affects authoring only; every downstream contract receives exact values.
 */
export function deriveAlphaScale(input: LinearAlphaScaleInput): AlphaScale {
	const start = input.min ?? input.max / ALPHA_POSITIONS.length;
	const step = input.min === undefined ? start : (input.max - start) / (ALPHA_POSITIONS.length - 1);
	const values = Object.fromEntries(
		ALPHA_POSITIONS.map((position, index) => [position, rounded(start + step * index)])
	) as unknown as AlphaScaleValues;
	return { values };
}

/** Preserve literal named-scale identities without adding project vocabulary. */
export function defineAlpha<
	const Scales extends Readonly<Record<string, AlphaScale>>,
	const DefaultScale extends Extract<keyof Scales, string>,
>(system: {
	defaultScale: DefaultScale;
	scales: Scales;
}): AlphaSystem & {
	defaultScale: DefaultScale;
	scales: Scales;
} {
	return system;
}

export type { AlphaPosition };
