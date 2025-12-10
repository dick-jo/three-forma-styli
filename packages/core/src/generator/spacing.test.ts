import { describe, it, expect } from 'vitest';
import { generateSpacingTokens } from './spacing.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

describe('generateSpacingTokens', () => {
	const basicSpacing: DesignSystem['spacing'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					unit: 'px',
					base: 8,
					min: 4,
					range: 5,
				},
			},
		],
	};

	it('generates min token', () => {
		const result = generateSpacingTokens(basicSpacing, defaultGeneratorConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'sp-min');
		expect(minToken).toBeDefined();
		expect(minToken?.value).toBe('4px');
		expect(minToken?.rawValue).toBe(4);
		expect(minToken?.unit).toBe('px');
		expect(minToken?.family).toBe('spacing');
	});

	it('generates correct number of tokens (min + range)', () => {
		const result = generateSpacingTokens(basicSpacing, defaultGeneratorConfig);

		// min + 1 through 5 = 6 tokens
		expect(result.defaultTokens).toHaveLength(6);
	});

	it('uses multiplicative formula: sp-{n} = base * n', () => {
		const result = generateSpacingTokens(basicSpacing, defaultGeneratorConfig);

		const sp1 = result.defaultTokens.find((t) => t.name === 'sp-1');
		const sp2 = result.defaultTokens.find((t) => t.name === 'sp-2');
		const sp3 = result.defaultTokens.find((t) => t.name === 'sp-3');
		const sp5 = result.defaultTokens.find((t) => t.name === 'sp-5');

		expect(sp1?.value).toBe('8px'); // 8 * 1
		expect(sp2?.value).toBe('16px'); // 8 * 2
		expect(sp3?.value).toBe('24px'); // 8 * 3
		expect(sp5?.value).toBe('40px'); // 8 * 5

		expect(sp1?.rawValue).toBe(8);
		expect(sp2?.rawValue).toBe(16);
		expect(sp3?.rawValue).toBe(24);
		expect(sp5?.rawValue).toBe(40);
	});

	it('handles rem units', () => {
		const remSpacing: DesignSystem['spacing'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'rem',
						base: 0.5,
						min: 0.25,
						range: 3,
					},
				},
			],
		};

		const result = generateSpacingTokens(remSpacing, defaultGeneratorConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'sp-min');
		const sp1 = result.defaultTokens.find((t) => t.name === 'sp-1');
		const sp2 = result.defaultTokens.find((t) => t.name === 'sp-2');

		expect(minToken?.value).toBe('0.25rem');
		expect(sp1?.value).toBe('0.5rem');
		expect(sp2?.value).toBe('1rem');
	});

	it('respects custom prefix from config', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				spacing: 'space',
			},
		};

		const result = generateSpacingTokens(basicSpacing, customConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'space-min');
		const sp1 = result.defaultTokens.find((t) => t.name === 'space-1');

		expect(minToken).toBeDefined();
		expect(sp1).toBeDefined();
	});

	describe('mode handling', () => {
		const multiModeSpacing: DesignSystem['spacing'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'px',
						base: 8,
						min: 4,
						range: 3,
					},
				},
				{
					name: 'small',
					tokens: {
						unit: 'px',
						base: 4,
						min: 2,
						range: 3,
					},
				},
				{
					name: 'large',
					tokens: {
						unit: 'px',
						base: 16,
						min: 8,
						range: 3,
					},
				},
			],
		};

		it('identifies correct default mode', () => {
			const result = generateSpacingTokens(multiModeSpacing, defaultGeneratorConfig);

			expect(result.modeInfo.default).toBe('default');
		});

		it('identifies override modes', () => {
			const result = generateSpacingTokens(multiModeSpacing, defaultGeneratorConfig);

			expect(result.modeInfo.overrides).toHaveLength(2);
			expect(result.modeInfo.overrides).toContain('small');
			expect(result.modeInfo.overrides).toContain('large');
		});

		it('generates tokens for override modes', () => {
			const result = generateSpacingTokens(multiModeSpacing, defaultGeneratorConfig);

			expect(result.overrideTokens['small']).toBeDefined();
			expect(result.overrideTokens['large']).toBeDefined();

			const smallSp1 = result.overrideTokens['small'].find((t) => t.name === 'sp-1');
			const largeSp1 = result.overrideTokens['large'].find((t) => t.name === 'sp-1');

			expect(smallSp1?.value).toBe('4px'); // 4 * 1
			expect(largeSp1?.value).toBe('16px'); // 16 * 1
		});

		it('uses first mode as default when no isDefault specified', () => {
			const noDefaultSpacing: DesignSystem['spacing'] = {
				modes: [
					{
						name: 'first',
						tokens: {
							unit: 'px',
							base: 8,
							min: 4,
							range: 3,
						},
					},
					{
						name: 'second',
						tokens: {
							unit: 'px',
							base: 4,
							min: 2,
							range: 3,
						},
					},
				],
			};

			const result = generateSpacingTokens(noDefaultSpacing, defaultGeneratorConfig);

			expect(result.modeInfo.default).toBe('first');
			expect(result.modeInfo.overrides).toContain('second');
		});
	});
});
