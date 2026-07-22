import { describe, expect, it } from 'vitest';
import { defineTypography, deriveTypographyRange } from './authoring.js';

const scale = { unit: 'rem', base: 0.75, min: 0.625, increment: 0.125, range: 12 };

describe('defineTypography', () => {
	it('preserves explicit arbitrary role and variant names without adding policy', () => {
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
					base: { fontSize: 3, weight: 'regular', lineHeight: 1.4, letterSpacing: 0 },
					variants: {
						footnote: { fontSize: 'min', weight: 'regular', lineHeight: 1.5, letterSpacing: 0.01 },
					},
					weights: { regular: 400 },
				},
			},
		});

		expect(Object.keys(typography.roles)).toEqual(['legal']);
		expect(Object.keys(typography.roles.legal.variants)).toEqual(['footnote']);
		expect(typography.roles.legal.base.fontSize).toBe(3);
	});
});

describe('deriveTypographyRange', () => {
	it('derives caller-named variants around an unsuffixed base', () => {
		const range = deriveTypographyRange({
			scale,
			order: ['compact', 'reading', 'base', 'roomy', 'display'],
			anchors: {
				compact: { fontSize: 'min', weight: 'regular', lineHeight: 1.4, letterSpacing: 0.01 },
				base: { fontSize: 2, weight: 'regular', lineHeight: 1.3, letterSpacing: 0 },
				display: { fontSize: 4, weight: 'regular', lineHeight: 1.2, letterSpacing: -0.01 },
			},
			derived: {
				reading: { between: ['compact', 'base'] },
				roomy: { between: ['base', 'display'] },
			},
		});

		expect(range.base).toEqual({
			fontSize: 2,
			weight: 'regular',
			lineHeight: 1.3,
			letterSpacing: 0,
		});
		expect(range.displayOrder).toEqual(['compact', 'reading', 'base', 'roomy', 'display']);
		expect(range.variants).toEqual({
			compact: { fontSize: 'min', weight: 'regular', lineHeight: 1.4, letterSpacing: 0.01 },
			reading: { fontSize: 1, weight: 'regular', lineHeight: 1.35, letterSpacing: 0.005 },
			roomy: { fontSize: 3, weight: 'regular', lineHeight: 1.25, letterSpacing: -0.005 },
			display: { fontSize: 4, weight: 'regular', lineHeight: 1.2, letterSpacing: -0.01 },
		});
	});

	it('requires an exact, non-duplicated output order', () => {
		expect(() =>
			deriveTypographyRange({
				scale,
				order: ['base', 'base'],
				anchors: { base: { fontSize: 2, weight: 'regular', lineHeight: 1.2, letterSpacing: 0 } },
				derived: {},
			})
		).toThrow('must not contain duplicate names');
	});

	it('fails when the atomic scale cannot provide a distinct derived step', () => {
		expect(() =>
			deriveTypographyRange({
				scale,
				order: ['near', 'base', 'far'],
				anchors: {
					base: { fontSize: 1, weight: 'regular', lineHeight: 1.2, letterSpacing: 0 },
					far: { fontSize: 2, weight: 'regular', lineHeight: 1.1, letterSpacing: 0 },
				},
				derived: { near: { between: ['base', 'far'] } },
			})
		).toThrow('Cannot derive a distinct font-size reference');
	});

	it('never silently chooses non-interpolable settings from one anchor', () => {
		expect(() =>
			deriveTypographyRange({
				scale,
				order: ['base', 'middle', 'display'],
				anchors: {
					base: {
						fontSize: 2,
						weight: 'regular',
						lineHeight: 1.3,
						letterSpacing: 0,
						fontKerning: 'normal',
					},
					display: {
						fontSize: 4,
						weight: 'regular',
						lineHeight: 1.1,
						letterSpacing: -0.01,
						fontKerning: 'none',
					},
				},
				derived: { middle: { between: ['base', 'display'] } },
			})
		).toThrow('provide settings explicitly');

		const range = deriveTypographyRange({
			scale,
			order: ['base', 'middle', 'display'],
			anchors: {
				base: {
					fontSize: 2,
					weight: 'regular',
					lineHeight: 1.3,
					letterSpacing: 0,
					fontKerning: 'normal',
				},
				display: {
					fontSize: 4,
					weight: 'regular',
					lineHeight: 1.1,
					letterSpacing: -0.01,
					fontKerning: 'none',
				},
			},
			derived: {
				middle: {
					between: ['base', 'display'],
					settings: { fontKerning: 'auto' },
				},
			},
		});
		expect(range.variants.middle.fontKerning).toBe('auto');
	});

	it('never silently chooses a weight from disagreeing anchors', () => {
		expect(() =>
			deriveTypographyRange({
				scale,
				order: ['base', 'middle', 'display'],
				anchors: {
					base: { fontSize: 2, weight: 'lo', lineHeight: 1.3, letterSpacing: 0 },
					display: { fontSize: 4, weight: 'max', lineHeight: 1.1, letterSpacing: -0.01 },
				},
				derived: { middle: { between: ['base', 'display'] } },
			})
		).toThrow('provide weight explicitly');

		const range = deriveTypographyRange({
			scale,
			order: ['base', 'middle', 'display'],
			anchors: {
				base: { fontSize: 2, weight: 'lo', lineHeight: 1.3, letterSpacing: 0 },
				display: { fontSize: 4, weight: 'max', lineHeight: 1.1, letterSpacing: -0.01 },
			},
			derived: { middle: { between: ['base', 'display'], weight: 'hi' } },
		});
		expect(range.variants.middle.weight).toBe('hi');
	});
});
