import { describe, it, expect } from 'vitest';
import { generateColorTokens } from './colors.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

const defaultAlphaSchedule: Readonly<Record<string, number>> = {
	min: 0.07,
	'lo-x': 0.125,
	lo: 0.25,
	hi: 0.68,
	'hi-x': 0.85,
	max: 0.93,
};

describe('generateColorTokens', () => {
	const basicColors: DesignSystem['colors'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					bg: { mode: 'oklch', l: 0.26, c: 0, h: 180 },
					primary: { mode: 'oklch', l: 0.8, c: 0.12, h: 296 },
					ink: { mode: 'oklch', l: 0.93, c: 0.04, h: 299 },
					ev: { mode: 'oklch', l: 0.29, c: 0, h: 286 },
					neutral: { mode: 'oklch', l: 0.93, c: 0.04, h: 299 },
					positive: { mode: 'oklch', l: 0.76, c: 0.2, h: 150 },
					negative: { mode: 'oklch', l: 0.69, c: 0.21, h: 7 },
				},
			},
		],
	};

	it('generates base color tokens', () => {
		const result = generateColorTokens(basicColors, defaultGeneratorConfig, defaultAlphaSchedule);

		const bgToken = result.defaultTokens.find((t) => t.name === 'clr-bg');
		const primaryToken = result.defaultTokens.find((t) => t.name === 'clr-primary');

		expect(bgToken).toBeDefined();
		expect(bgToken?.family).toBe('color');
		expect(primaryToken).toBeDefined();
	});

	it('generates alpha variants for each color', () => {
		const result = generateColorTokens(basicColors, defaultGeneratorConfig, defaultAlphaSchedule);

		// Check that bg has all alpha variants
		const bgAlphaMin = result.defaultTokens.find((t) => t.name === 'clr-bg-a-min');
		const bgAlphaLo = result.defaultTokens.find((t) => t.name === 'clr-bg-a-lo');
		const bgAlphaHi = result.defaultTokens.find((t) => t.name === 'clr-bg-a-hi');
		const bgAlphaMax = result.defaultTokens.find((t) => t.name === 'clr-bg-a-max');

		expect(bgAlphaMin).toBeDefined();
		expect(bgAlphaLo).toBeDefined();
		expect(bgAlphaHi).toBeDefined();
		expect(bgAlphaMax).toBeDefined();
	});

	it('includes alpha metadata on alpha variants', () => {
		const result = generateColorTokens(basicColors, defaultGeneratorConfig, defaultAlphaSchedule);

		const bgAlphaLo = result.defaultTokens.find((t) => t.name === 'clr-bg-a-lo');

		expect(bgAlphaLo?.metadata?.isAlphaVariant).toBe(true);
		expect(bgAlphaLo?.metadata?.alphaLevel).toBe('lo');
		expect(bgAlphaLo?.metadata?.baseColor).toBe('bg');
	});

	it('stores rawValue for alpha variants', () => {
		const result = generateColorTokens(basicColors, defaultGeneratorConfig, defaultAlphaSchedule);

		const bgAlphaMin = result.defaultTokens.find((t) => t.name === 'clr-bg-a-min');
		const bgAlphaMax = result.defaultTokens.find((t) => t.name === 'clr-bg-a-max');

		expect(bgAlphaMin?.rawValue).toBe(0.07);
		expect(bgAlphaMax?.rawValue).toBe(0.93);
	});

	it('generates correct number of tokens (base + 6 alpha variants per color)', () => {
		const result = generateColorTokens(basicColors, defaultGeneratorConfig, defaultAlphaSchedule);

		// 7 colors * 7 tokens each (1 base + 6 alpha) = 49 tokens
		expect(result.defaultTokens).toHaveLength(49);
	});

	it('respects custom color prefix', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			prefixes: {
				...defaultGeneratorConfig.prefixes,
				color: 'color',
			},
		};

		const result = generateColorTokens(basicColors, customConfig, defaultAlphaSchedule);

		const bgToken = result.defaultTokens.find((t) => t.name === 'color-bg');
		expect(bgToken).toBeDefined();
	});

	it('respects custom alpha modifier', () => {
		const customConfig = {
			...defaultGeneratorConfig,
			colorFormat: {
				...defaultGeneratorConfig.colorFormat,
				alphaModifier: 'tr',
			},
		};

		const result = generateColorTokens(basicColors, customConfig, defaultAlphaSchedule);

		const bgAlphaLo = result.defaultTokens.find((t) => t.name === 'clr-bg-tr-lo');
		expect(bgAlphaLo).toBeDefined();
	});

	describe('mode handling', () => {
		const multiModeColors: DesignSystem['colors'] = {
			modes: [
				{
					name: 'light',
					isDefault: true,
					tokens: {
						bg: { mode: 'oklch', l: 0.98, c: 0, h: 0 },
						primary: { mode: 'oklch', l: 0.6, c: 0.2, h: 250 },
						ink: { mode: 'oklch', l: 0.15, c: 0, h: 0 },
						ev: { mode: 'oklch', l: 0.95, c: 0, h: 0 },
						neutral: { mode: 'oklch', l: 0.5, c: 0, h: 0 },
						positive: { mode: 'oklch', l: 0.6, c: 0.2, h: 150 },
						negative: { mode: 'oklch', l: 0.6, c: 0.2, h: 30 },
					},
				},
				{
					name: 'dark',
					isDefault: false,
					tokens: {
						bg: { mode: 'oklch', l: 0.15, c: 0, h: 0 },
						ink: { mode: 'oklch', l: 0.95, c: 0, h: 0 },
					},
				},
			],
		};

		it('identifies correct default mode', () => {
			const result = generateColorTokens(
				multiModeColors,
				defaultGeneratorConfig,
				defaultAlphaSchedule
			);

			expect(result.modeInfo.default).toBe('light');
		});

		it('identifies override modes', () => {
			const result = generateColorTokens(
				multiModeColors,
				defaultGeneratorConfig,
				defaultAlphaSchedule
			);

			expect(result.modeInfo.overrides).toContain('dark');
		});

		it('only generates tokens for explicitly defined colors in override modes', () => {
			const result = generateColorTokens(
				multiModeColors,
				defaultGeneratorConfig,
				defaultAlphaSchedule
			);

			// Dark mode only defines bg and ink, so only those should be in overrideTokens
			const darkTokens = result.overrideTokens['dark'];
			expect(darkTokens).toBeDefined();

			// Should have bg + 6 alpha + ink + 6 alpha = 14 tokens
			expect(darkTokens.length).toBe(14);

			// Should have bg tokens
			const darkBg = darkTokens.find((t) => t.name === 'clr-bg');
			expect(darkBg).toBeDefined();

			// Should have ink tokens
			const darkInk = darkTokens.find((t) => t.name === 'clr-ink');
			expect(darkInk).toBeDefined();

			// Should NOT have primary in dark override (it uses light's primary)
			const darkPrimary = darkTokens.find((t) => t.name === 'clr-primary');
			expect(darkPrimary).toBeUndefined();
		});
	});

	describe('selected Alpha scale', () => {
		it('applies one resolved scale consistently across color modes', () => {
			const colors: DesignSystem['colors'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: {
							bg: { mode: 'oklch', l: 0.26, c: 0, h: 180 },
							primary: { mode: 'oklch', l: 0.8, c: 0.12, h: 296 },
							ink: { mode: 'oklch', l: 0.93, c: 0.04, h: 299 },
							ev: { mode: 'oklch', l: 0.29, c: 0, h: 286 },
							neutral: { mode: 'oklch', l: 0.93, c: 0.04, h: 299 },
							positive: { mode: 'oklch', l: 0.76, c: 0.2, h: 150 },
							negative: { mode: 'oklch', l: 0.69, c: 0.21, h: 7 },
						},
					},
				],
			};
			const selected = {
				non: 0,
				min: 0.1,
				'lo-x': 0.2,
				lo: 0.3,
				hi: 0.7,
				'hi-x': 0.8,
				max: 0.9,
			};

			const result = generateColorTokens(colors, defaultGeneratorConfig, selected);

			const bgAlphaMin = result.defaultTokens.find((t) => t.name === 'clr-bg-a-min');
			expect(bgAlphaMin?.rawValue).toBe(0.1);
		});
	});
});
