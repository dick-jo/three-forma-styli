import { oklch } from 'culori';
import { describe, expect, it } from 'vitest';
import { defineAlpha, deriveAlphaScale } from '../alpha/index.js';
import { generate, ValidationError } from './index.js';

const standard = {
	values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
} as const;

describe('alpha generation', () => {
	it('emits terse default tokens and qualified additional scales', () => {
		const ir = generate({
			alpha: defineAlpha({
				defaultScale: 'standard',
				scales: { standard, linear: deriveAlphaScale({ distribution: 'linear', max: 0.9 }) },
			}),
		});
		expect(ir.tokens['a-non']?.rawValue).toBe(0);
		expect(ir.tokens['a-min']?.rawValue).toBe(0.07);
		expect(ir.tokens['a-linear-min']?.rawValue).toBe(0.15);
		expect(ir.tokens['a-standard-min']).toBeUndefined();
		expect(ir.alpha?.defaultScale).toBe('standard');
		expect(ir.alpha?.scales.linear?.values.max.css).toBe('var(--a-linear-max)');
	});

	it('derives color ramps from the selected named scale', () => {
		const ir = generate({
			alpha: defineAlpha({
				defaultScale: 'standard',
				scales: { standard, linear: deriveAlphaScale({ distribution: 'linear', max: 0.9 }) },
			}),
			colors: {
				alphaScale: 'linear',
				modes: [{ name: 'dark', isDefault: true, tokens: { pri: oklch('oklch(0.7 0.2 20)')! } }],
			},
		});
		expect(ir.tokens['clr-pri-a-non']?.rawValue).toBe(0);
		expect(ir.tokens['clr-pri-a-min']?.rawValue).toBe(0.15);
		expect(ir.tokens['clr-pri-a-max']?.rawValue).toBe(0.9);
	});

	it('rejects incomplete and reversed scales', () => {
		expect(() =>
			generate({
				alpha: {
					defaultScale: 'bad',
					scales: { bad: { values: { ...standard.values, hi: 0.1 } } },
				},
			})
		).toThrow(ValidationError);

		expect(() =>
			generate({
				alpha: {
					defaultScale: 'bad',
					scales: { bad: { values: { ...standard.values, extra: 0.95 } } },
				} as never,
			})
		).toThrow(/must define exactly/);
	});
});
