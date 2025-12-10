import { describe, it, expect } from 'vitest';
import { generateBorderRadiusTokens, generateBorderWidthTokens } from './border.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

describe('generateBorderRadiusTokens', () => {
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

	const basicBorderRadius: DesignSystem['border']['radius'] = {
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

	it('generates border radius tokens with resolved values', () => {
		const result = generateBorderRadiusTokens(basicBorderRadius, basicSpacing, defaultGeneratorConfig);

		const bdrMin = result.defaultTokens.find((t) => t.name === 'bdr-min');
		const bdrS = result.defaultTokens.find((t) => t.name === 'bdr-s');
		const bdrL = result.defaultTokens.find((t) => t.name === 'bdr-l');
		const bdrMax = result.defaultTokens.find((t) => t.name === 'bdr-max');

		expect(bdrMin).toBeDefined();
		expect(bdrS).toBeDefined();
		expect(bdrL).toBeDefined();
		expect(bdrMax).toBeDefined();
	});

	it('resolves "min" reference to spacing min value', () => {
		const result = generateBorderRadiusTokens(basicBorderRadius, basicSpacing, defaultGeneratorConfig);

		const bdrMin = result.defaultTokens.find((t) => t.name === 'bdr-min');
		expect(bdrMin?.value).toBe('4px');
		expect(bdrMin?.rawValue).toBe(4);
		expect(bdrMin?.reference).toBe('sp-min');
	});

	it('resolves numeric references using spacing base multiplier', () => {
		const result = generateBorderRadiusTokens(basicBorderRadius, basicSpacing, defaultGeneratorConfig);

		const bdrS = result.defaultTokens.find((t) => t.name === 'bdr-s');
		const bdrL = result.defaultTokens.find((t) => t.name === 'bdr-l');

		expect(bdrS?.value).toBe('8px'); // 1 * 8
		expect(bdrS?.reference).toBe('sp-1');

		expect(bdrL?.value).toBe('16px'); // 2 * 8
		expect(bdrL?.reference).toBe('sp-2');
	});

	it('sets correct family on all tokens', () => {
		const result = generateBorderRadiusTokens(basicBorderRadius, basicSpacing, defaultGeneratorConfig);

		result.defaultTokens.forEach((token) => {
			expect(token.family).toBe('borderRadius');
		});
	});

	it('respects custom prefix from config', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				borderRadius: 'radius',
			},
		};

		const result = generateBorderRadiusTokens(basicBorderRadius, basicSpacing, customConfig);

		const radiusS = result.defaultTokens.find((t) => t.name === 'radius-s');
		expect(radiusS).toBeDefined();
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
			],
		};

		const multiModeBorderRadius: DesignSystem['border']['radius'] = {
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
			],
		};

		it('matches border radius modes to spacing modes by name', () => {
			const result = generateBorderRadiusTokens(
				multiModeBorderRadius,
				multiModeSpacing,
				defaultGeneratorConfig
			);

			// small border radius mode should use small spacing mode (base: 4)
			const smallBdrS = result.overrideTokens['small'].find((t) => t.name === 'bdr-s');
			expect(smallBdrS?.value).toBe('4px'); // 1 * 4
		});
	});
});

describe('generateBorderWidthTokens', () => {
	const basicBorderWidth: DesignSystem['border']['width'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					unit: 'px',
					value: 1,
				},
			},
		],
	};

	it('generates a single border width token', () => {
		const result = generateBorderWidthTokens(basicBorderWidth, defaultGeneratorConfig);

		expect(result.defaultTokens).toHaveLength(1);

		const bdw = result.defaultTokens[0];
		expect(bdw.name).toBe('bdw');
		expect(bdw.value).toBe('1px');
		expect(bdw.rawValue).toBe(1);
		expect(bdw.unit).toBe('px');
		expect(bdw.family).toBe('borderWidth');
	});

	it('respects custom prefix from config', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				borderWidth: 'border-width',
			},
		};

		const result = generateBorderWidthTokens(basicBorderWidth, customConfig);

		expect(result.defaultTokens[0].name).toBe('border-width');
	});

	describe('mode handling', () => {
		const multiModeBorderWidth: DesignSystem['border']['width'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: { unit: 'px', value: 1 },
				},
				{
					name: 'small',
					tokens: { unit: 'px', value: 0.5 },
				},
				{
					name: 'large',
					tokens: { unit: 'px', value: 2 },
				},
			],
		};

		it('identifies correct default mode', () => {
			const result = generateBorderWidthTokens(multiModeBorderWidth, defaultGeneratorConfig);
			expect(result.modeInfo.default).toBe('default');
		});

		it('identifies override modes', () => {
			const result = generateBorderWidthTokens(multiModeBorderWidth, defaultGeneratorConfig);
			expect(result.modeInfo.overrides).toContain('small');
			expect(result.modeInfo.overrides).toContain('large');
		});

		it('generates correct values for override modes', () => {
			const result = generateBorderWidthTokens(multiModeBorderWidth, defaultGeneratorConfig);

			const smallBdw = result.overrideTokens['small'][0];
			const largeBdw = result.overrideTokens['large'][0];

			expect(smallBdw.value).toBe('0.5px');
			expect(largeBdw.value).toBe('2px');
		});
	});
});
