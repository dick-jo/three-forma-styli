import { describe, expect, it } from 'vitest';
import { defineTypography, deriveTypographySizes } from './authoring.js';

const scale = { unit: 'rem', base: 0.75, min: 0.625, increment: 0.125, range: 12 };

describe('defineTypography', () => {
	it('normalizes fixed size ranges while preserving arbitrary roles and categorical variants', () => {
		const typography = defineTypography({
			modes: [{ name: 'default', isDefault: true, tokens: scale }],
			fonts: {
				editorial: {
					family: 'Editorial',
					fallbacks: ['serif'],
					verification: 'unavailable',
				},
			},
			roles: {
				legal: {
					font: 'editorial',
					weights: 400,
					sizes: {
						min: { fontSize: 'min', lineHeight: 1.5, letterSpacing: 0.01 },
						base: { fontSize: 3, lineHeight: 1.4, letterSpacing: 0 },
					},
					variants: { legalese: { letterSpacing: 0.02 } },
				},
			},
		});

		expect(Object.keys(typography.roles)).toEqual(['legal']);
		expect(Object.keys(typography.roles.legal.sizes)).toEqual(['min', 'base']);
		expect(Object.keys(typography.roles.legal.variants ?? {})).toEqual(['legalese']);
		expect(typography.roles.legal.sizes.base).toMatchObject({ fontSize: 3, weight: 'base' });
	});

	it('enforces sparse size and role-local weight grammar', () => {
		const base = {
			modes: [{ name: 'default', isDefault: true as const, tokens: scale }],
			fonts: { ui: { family: 'UI', verification: 'unavailable' as const } },
		};
		expect(() =>
			defineTypography({
				...base,
				roles: {
					bad: {
						font: 'ui',
						weights: 400,
						sizes: {
							base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 },
							s: { fontSize: 1, lineHeight: 1.3, letterSpacing: 0 },
						},
					},
				},
			})
		).toThrow('size s requires min');
		expect(() =>
			defineTypography({
				...base,
				roles: {
					bad: {
						font: 'ui',
						weight: 'min',
						weights: { min: 700, max: 400 },
						sizes: { base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 } },
					},
				},
			})
		).toThrow('weights must be unique increasing');
		expect(() =>
			defineTypography({
				...base,
				roles: {
					bad: {
						font: 'ui',
						weights: 400,
						sizes: { base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 } },
						variants: { display: { fontSize: 6 } },
					},
				},
			} as never)
		).toThrow('contains unsupported field: fontSize');
	});
});

describe('deriveTypographySizes', () => {
	it('derives only the fixed role-local size range', () => {
		const sizes = deriveTypographySizes({
			scale,
			anchors: {
				min: { fontSize: 'min', weight: 'min', lineHeight: 1.4, letterSpacing: 0.01 },
				base: { fontSize: 2, weight: 'min', lineHeight: 1.3, letterSpacing: 0 },
				max: { fontSize: 4, weight: 'max', lineHeight: 1.1, letterSpacing: -0.01 },
			},
			derived: {
				s: { between: ['min', 'base'] },
				l: { between: ['base', 'max'], weight: 'hi' },
			},
		});
		expect(sizes).toEqual({
			min: { fontSize: 'min', weight: 'min', lineHeight: 1.4, letterSpacing: 0.01 },
			s: { fontSize: 1, weight: 'min', lineHeight: 1.35, letterSpacing: 0.005 },
			base: { fontSize: 2, weight: 'min', lineHeight: 1.3, letterSpacing: 0 },
			l: { fontSize: 3, weight: 'hi', lineHeight: 1.2, letterSpacing: -0.005 },
			max: { fontSize: 4, weight: 'max', lineHeight: 1.1, letterSpacing: -0.01 },
		});
	});

	it('fails instead of guessing a disputed weight or impossible atomic step', () => {
		expect(() =>
			deriveTypographySizes({
				scale,
				anchors: {
					base: { fontSize: 2, weight: 'min', lineHeight: 1.3, letterSpacing: 0 },
					max: { fontSize: 4, weight: 'max', lineHeight: 1.1, letterSpacing: -0.01 },
				},
				derived: { l: { between: ['base', 'max'] } },
			})
		).toThrow('provide weight explicitly');
		expect(() =>
			deriveTypographySizes({
				scale,
				anchors: {
					base: { fontSize: 1, lineHeight: 1.2, letterSpacing: 0 },
					max: { fontSize: 2, lineHeight: 1.1, letterSpacing: 0 },
				},
				derived: { l: { between: ['base', 'max'] } },
			})
		).toThrow('Cannot derive a distinct font-size reference');
		expect(() =>
			deriveTypographySizes({
				scale,
				anchors: {
					base: { fontSize: 2, lineHeight: 1.2, letterSpacing: 0 },
					max: { fontSize: 4, lineHeight: 1, letterSpacing: 0 },
				},
				derived: { max: { between: ['base', 'max'] } },
			} as never)
		).toThrow('cannot be both an anchor and a derived size');
	});
});
