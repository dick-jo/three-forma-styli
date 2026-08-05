import { describe, expect, it } from 'vitest';
import { defineAlpha, deriveAlphaScale } from './authoring.js';
import { ALPHA_POSITIONS } from './grammar.js';

describe('alpha authoring', () => {
	it('derives a zero-to-max linear scale without hiding resolved values', () => {
		expect(deriveAlphaScale({ distribution: 'linear', max: 0.9 })).toEqual({
			values: {
				min: 0.15,
				'lo-x': 0.3,
				lo: 0.45,
				hi: 0.6,
				'hi-x': 0.75,
				max: 0.9,
			},
		});
	});

	it('interpolates between explicit active endpoints', () => {
		expect(deriveAlphaScale({ distribution: 'linear', min: 0.1, max: 0.9 }).values).toEqual({
			min: 0.1,
			'lo-x': 0.26,
			lo: 0.42,
			hi: 0.58,
			'hi-x': 0.74,
			max: 0.9,
		});
	});

	it('preserves literal named-scale identities', () => {
		const alpha = defineAlpha({
			defaultScale: 'standard',
			scales: {
				standard: deriveAlphaScale({ distribution: 'linear', max: 0.9 }),
				linear: deriveAlphaScale({ distribution: 'linear', max: 0.8 }),
			},
		});
		expect(alpha.defaultScale).toBe('standard');
		expect(Object.keys(alpha.scales)).toEqual(['standard', 'linear']);
		expect(ALPHA_POSITIONS).toEqual(['min', 'lo-x', 'lo', 'hi', 'hi-x', 'max']);
	});
});
