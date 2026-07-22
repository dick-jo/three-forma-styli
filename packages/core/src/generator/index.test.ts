import { describe, expect, it } from 'vitest';
import type { PartialDesignSystem } from '../types.js';
import { generate, ValidationError } from './index.js';

const alphaSchedule = { min: 0.1, max: 0.9 };

function colorsWithOverride(name: string): NonNullable<PartialDesignSystem['colors']> {
	return {
		alphaSchedule,
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { bg: { mode: 'oklch', l: 0.2, c: 0, h: 0 } },
			},
			{
				name,
				tokens: { bg: { mode: 'oklch', l: 0.9, c: 0, h: 0 } },
			},
		],
	};
}

describe('generate mode identity', () => {
	it('rejects an override name shared by color and size categories', () => {
		expect(() =>
			generate({
				colors: colorsWithOverride('compact'),
				spacing: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'px', base: 8, min: 4, range: 4 },
						},
						{
							name: 'compact',
							tokens: { unit: 'px', base: 6, min: 3, range: 4 },
						},
					],
				},
			})
		).toThrowError(ValidationError);
	});

	it('allows one size-mode name to coordinate multiple size families', () => {
		const result = generate({
			spacing: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'px', base: 8, min: 4, range: 4 },
					},
					{
						name: 'compact',
						tokens: { unit: 'px', base: 6, min: 3, range: 4 },
					},
				],
			},
			border: {
				radius: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { min: 'min', s: 1, l: 2, max: 3 },
						},
						{
							name: 'compact',
							tokens: { min: 'min', s: 1, l: 2, max: 3 },
						},
					],
				},
				width: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'px', value: 1 },
						},
					],
				},
			},
		});

		expect(result.modes.size.overrides).toEqual(['compact']);
		expect(result.overrideTokens.compact).toBeDefined();
	});
});
