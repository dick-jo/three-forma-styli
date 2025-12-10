import { describe, it, expect } from 'vitest';
import { generateTypographyTokens } from './typography.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

describe('generateTypographyTokens', () => {
	const basicTypography: DesignSystem['typography'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					unit: 'rem',
					base: 1,
					min: 0.625,
					increment: 0.125,
					range: 5,
				},
			},
		],
	};

	it('generates min token', () => {
		const result = generateTypographyTokens(basicTypography, defaultGeneratorConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'fs-min');
		expect(minToken).toBeDefined();
		expect(minToken?.value).toBe('0.625rem');
		expect(minToken?.rawValue).toBe(0.625);
		expect(minToken?.unit).toBe('rem');
		expect(minToken?.family).toBe('typography');
	});

	it('generates correct number of tokens (min + range)', () => {
		const result = generateTypographyTokens(basicTypography, defaultGeneratorConfig);

		// min + 1 through 5 = 6 tokens
		expect(result.defaultTokens).toHaveLength(6);
	});

	it('uses additive formula: fs-{n} = base + ((n - 1) * increment)', () => {
		const result = generateTypographyTokens(basicTypography, defaultGeneratorConfig);

		const fs1 = result.defaultTokens.find((t) => t.name === 'fs-1');
		const fs2 = result.defaultTokens.find((t) => t.name === 'fs-2');
		const fs3 = result.defaultTokens.find((t) => t.name === 'fs-3');
		const fs5 = result.defaultTokens.find((t) => t.name === 'fs-5');

		// fs-1 = base = 1
		expect(fs1?.value).toBe('1rem');
		expect(fs1?.rawValue).toBe(1);

		// fs-2 = base + (1 * increment) = 1 + 0.125 = 1.125
		expect(fs2?.value).toBe('1.125rem');
		expect(fs2?.rawValue).toBe(1.125);

		// fs-3 = base + (2 * increment) = 1 + 0.25 = 1.25
		expect(fs3?.value).toBe('1.25rem');
		expect(fs3?.rawValue).toBe(1.25);

		// fs-5 = base + (4 * increment) = 1 + 0.5 = 1.5
		expect(fs5?.value).toBe('1.5rem');
		expect(fs5?.rawValue).toBe(1.5);
	});

	it('handles px units', () => {
		const pxTypography: DesignSystem['typography'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'px',
						base: 16,
						min: 10,
						increment: 2,
						range: 3,
					},
				},
			],
		};

		const result = generateTypographyTokens(pxTypography, defaultGeneratorConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'fs-min');
		const fs1 = result.defaultTokens.find((t) => t.name === 'fs-1');
		const fs2 = result.defaultTokens.find((t) => t.name === 'fs-2');
		const fs3 = result.defaultTokens.find((t) => t.name === 'fs-3');

		expect(minToken?.value).toBe('10px');
		expect(fs1?.value).toBe('16px');
		expect(fs2?.value).toBe('18px'); // 16 + 2
		expect(fs3?.value).toBe('20px'); // 16 + 4
	});

	it('respects custom prefix from config', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				typography: 'font',
			},
		};

		const result = generateTypographyTokens(basicTypography, customConfig);

		const minToken = result.defaultTokens.find((t) => t.name === 'font-min');
		const fs1 = result.defaultTokens.find((t) => t.name === 'font-1');

		expect(minToken).toBeDefined();
		expect(fs1).toBeDefined();
	});

	it('formats numbers without trailing zeros', () => {
		const typography: DesignSystem['typography'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'rem',
						base: 1,
						min: 0.5,
						increment: 0.5,
						range: 2,
					},
				},
			],
		};

		const result = generateTypographyTokens(typography, defaultGeneratorConfig);

		const fs1 = result.defaultTokens.find((t) => t.name === 'fs-1');
		const fs2 = result.defaultTokens.find((t) => t.name === 'fs-2');

		expect(fs1?.value).toBe('1rem'); // Not '1.0000rem'
		expect(fs2?.value).toBe('1.5rem'); // Not '1.5000rem'
	});

	describe('mode handling', () => {
		const multiModeTypography: DesignSystem['typography'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'rem',
						base: 1,
						min: 0.625,
						increment: 0.125,
						range: 3,
					},
				},
				{
					name: 'small',
					tokens: {
						unit: 'rem',
						base: 0.875,
						min: 0.5,
						increment: 0.125,
						range: 3,
					},
				},
				{
					name: 'large',
					tokens: {
						unit: 'rem',
						base: 1.25,
						min: 0.75,
						increment: 0.25,
						range: 3,
					},
				},
			],
		};

		it('identifies correct default mode', () => {
			const result = generateTypographyTokens(multiModeTypography, defaultGeneratorConfig);

			expect(result.modeInfo.default).toBe('default');
		});

		it('identifies override modes', () => {
			const result = generateTypographyTokens(multiModeTypography, defaultGeneratorConfig);

			expect(result.modeInfo.overrides).toHaveLength(2);
			expect(result.modeInfo.overrides).toContain('small');
			expect(result.modeInfo.overrides).toContain('large');
		});

		it('generates tokens for override modes with correct values', () => {
			const result = generateTypographyTokens(multiModeTypography, defaultGeneratorConfig);

			const smallFs1 = result.overrideTokens['small'].find((t) => t.name === 'fs-1');
			const largeFs1 = result.overrideTokens['large'].find((t) => t.name === 'fs-1');

			expect(smallFs1?.value).toBe('0.875rem');
			expect(largeFs1?.value).toBe('1.25rem');

			// Large mode: fs-2 = 1.25 + 0.25 = 1.5
			const largeFs2 = result.overrideTokens['large'].find((t) => t.name === 'fs-2');
			expect(largeFs2?.value).toBe('1.5rem');
		});
	});
});
