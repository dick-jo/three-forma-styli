import { describe, it, expect } from 'vitest';
import { generateGapTokens } from './gap.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

describe('generateGapTokens', () => {
	const basicSpacing: DesignSystem['spacing'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					unit: 'px',
					base: 8,
					min: 4,
					range: 12,
				},
			},
		],
	};

	const basicGap: DesignSystem['gap'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					min: 'min', // References sp-min
					s: 1, // References sp-1
					l: 2, // References sp-2
					max: 3, // References sp-3
				},
			},
		],
	};

	it('generates gap tokens with resolved values', () => {
		const result = generateGapTokens(basicGap, basicSpacing, defaultGeneratorConfig);

		const gapMin = result.defaultTokens.find((t) => t.name === 'gap-min');
		const gapS = result.defaultTokens.find((t) => t.name === 'gap-s');
		const gapL = result.defaultTokens.find((t) => t.name === 'gap-l');
		const gapMax = result.defaultTokens.find((t) => t.name === 'gap-max');

		expect(gapMin).toBeDefined();
		expect(gapS).toBeDefined();
		expect(gapL).toBeDefined();
		expect(gapMax).toBeDefined();
	});

	it('resolves "min" reference to spacing min value', () => {
		const result = generateGapTokens(basicGap, basicSpacing, defaultGeneratorConfig);

		const gapMin = result.defaultTokens.find((t) => t.name === 'gap-min');
		expect(gapMin?.value).toBe('4px'); // spacing.min = 4
		expect(gapMin?.rawValue).toBe(4);
		expect(gapMin?.reference).toBe('sp-min');
	});

	it('resolves numeric references using spacing base multiplier', () => {
		const result = generateGapTokens(basicGap, basicSpacing, defaultGeneratorConfig);

		const gapS = result.defaultTokens.find((t) => t.name === 'gap-s');
		const gapL = result.defaultTokens.find((t) => t.name === 'gap-l');
		const gapMax = result.defaultTokens.find((t) => t.name === 'gap-max');

		// s: 1 -> 1 * 8 = 8px
		expect(gapS?.value).toBe('8px');
		expect(gapS?.rawValue).toBe(8);
		expect(gapS?.reference).toBe('sp-1');

		// l: 2 -> 2 * 8 = 16px
		expect(gapL?.value).toBe('16px');
		expect(gapL?.rawValue).toBe(16);
		expect(gapL?.reference).toBe('sp-2');

		// max: 3 -> 3 * 8 = 24px
		expect(gapMax?.value).toBe('24px');
		expect(gapMax?.rawValue).toBe(24);
		expect(gapMax?.reference).toBe('sp-3');
	});

	it('uses spacing unit when gap unit not specified', () => {
		const result = generateGapTokens(basicGap, basicSpacing, defaultGeneratorConfig);

		const gapS = result.defaultTokens.find((t) => t.name === 'gap-s');
		expect(gapS?.unit).toBe('px');
	});

	it('respects custom gap unit when specified', () => {
		const gapWithUnit: DesignSystem['gap'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'rem',
						min: 'min',
						s: 1,
						l: 2,
						max: 3,
					},
				},
			],
		};

		const result = generateGapTokens(gapWithUnit, basicSpacing, defaultGeneratorConfig);

		const gapS = result.defaultTokens.find((t) => t.name === 'gap-s');
		expect(gapS?.unit).toBe('rem');
		expect(gapS?.value).toBe('8rem'); // Still uses spacing base, but rem unit
	});

	it('sets correct family on all tokens', () => {
		const result = generateGapTokens(basicGap, basicSpacing, defaultGeneratorConfig);

		result.defaultTokens.forEach((token) => {
			expect(token.family).toBe('gap');
		});
	});

	it('respects custom prefix from config', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				gap: 'g',
			},
		};

		const result = generateGapTokens(basicGap, basicSpacing, customConfig);

		const gapS = result.defaultTokens.find((t) => t.name === 'g-s');
		expect(gapS).toBeDefined();
	});

	describe('mode handling', () => {
		const multiModeSpacing: DesignSystem['spacing'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: { unit: 'px', base: 8, min: 4, range: 12 },
				},
				{
					name: 'small',
					tokens: { unit: 'px', base: 4, min: 2, range: 12 },
				},
				{
					name: 'large',
					tokens: { unit: 'px', base: 16, min: 8, range: 12 },
				},
			],
		};

		const multiModeGap: DesignSystem['gap'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: { min: 'min', s: 1, l: 2, max: 3 },
				},
				{
					name: 'small',
					tokens: { min: 'min', s: 1, l: 2, max: 3 },
				},
				{
					name: 'large',
					tokens: { min: 'min', s: 1, l: 2, max: 3 },
				},
			],
		};

		it('identifies correct default mode', () => {
			const result = generateGapTokens(multiModeGap, multiModeSpacing, defaultGeneratorConfig);
			expect(result.modeInfo.default).toBe('default');
		});

		it('identifies override modes', () => {
			const result = generateGapTokens(multiModeGap, multiModeSpacing, defaultGeneratorConfig);
			expect(result.modeInfo.overrides).toContain('small');
			expect(result.modeInfo.overrides).toContain('large');
		});

		it('matches gap modes to spacing modes by name', () => {
			const result = generateGapTokens(multiModeGap, multiModeSpacing, defaultGeneratorConfig);

			// small gap mode should use small spacing mode (base: 4)
			const smallGapS = result.overrideTokens['small'].find((t) => t.name === 'gap-s');
			expect(smallGapS?.value).toBe('4px'); // 1 * 4

			// large gap mode should use large spacing mode (base: 16)
			const largeGapS = result.overrideTokens['large'].find((t) => t.name === 'gap-s');
			expect(largeGapS?.value).toBe('16px'); // 1 * 16
		});

		it('allows explicit spacingMode reference', () => {
			const gapWithExplicitSpacing: DesignSystem['gap'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { min: 'min', s: 1, l: 2, max: 3 },
					},
					{
						name: 'compact',
						tokens: {
							spacingMode: 'small', // Explicitly use small spacing
							min: 'min',
							s: 1,
							l: 2,
							max: 3,
						},
					},
				],
			};

			const result = generateGapTokens(gapWithExplicitSpacing, multiModeSpacing, defaultGeneratorConfig);

			// compact mode explicitly references small spacing
			const compactGapS = result.overrideTokens['compact'].find((t) => t.name === 'gap-s');
			expect(compactGapS?.value).toBe('4px'); // Uses small spacing (base: 4)
		});

		it('falls back to default spacing mode when no match found', () => {
			const gapWithNoMatch: DesignSystem['gap'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { min: 'min', s: 1, l: 2, max: 3 },
					},
					{
						name: 'mystery', // No matching spacing mode
						tokens: { min: 'min', s: 1, l: 2, max: 3 },
					},
				],
			};

			const result = generateGapTokens(gapWithNoMatch, multiModeSpacing, defaultGeneratorConfig);

			// mystery mode should fall back to default spacing (base: 8)
			const mysteryGapS = result.overrideTokens['mystery'].find((t) => t.name === 'gap-s');
			expect(mysteryGapS?.value).toBe('8px');
		});
	});
});
