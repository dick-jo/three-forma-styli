import { describe, expect, it } from 'vitest';
import { generateTypographyTokens } from './typography.js';
import { generate, ValidationError } from './index.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

const basicTypography: DesignSystem['typography'] = {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'rem', base: 1, min: 0.625, increment: 0.125, range: 8 },
		},
	],
};

const semanticTypography: DesignSystem['typography'] = {
	...basicTypography,
	fonts: {
		editorial: {
			family: 'Editorial Variable',
			fallbacks: ['serif'],
			verification: 'prepared',
			capabilities: {
				faces: [
					{
						style: 'normal',
						weights: { min: 300, max: 800 },
						features: ['kern', 'liga'],
						axes: { GRAD: { min: -50, default: 0, max: 100 } },
					},
					{ style: 'italic', weights: [400, 700], features: ['kern', 'liga'] },
				],
			},
		},
	},
	roles: {
		copy: {
			font: 'editorial',
			textTransform: 'uppercase',
			sizes: {
				min: {
					fontSize: 1,
					weight: 'min',
					lineHeight: 1.2,
					letterSpacing: 0.01,
					textTransform: 'lowercase',
				},
				base: {
					fontSize: 2,
					weight: 'min',
					lineHeight: 1.3,
					letterSpacing: 0,
					features: { liga: true },
				},
				max: { fontSize: 7, weight: 'max', lineHeight: 1, letterSpacing: -0.02 },
			},
			weights: { min: 400, max: 700 },
			styles: {
				normal: { weights: ['min', 'max'] },
				italic: { weights: ['min', 'max'] },
			},
		},
	},
};

describe('generateTypographyTokens', () => {
	it('preserves atomic fs generation', () => {
		const result = generateTypographyTokens(basicTypography, defaultGeneratorConfig);
		expect(result.defaultTokens).toHaveLength(9);
		expect(result.defaultTokens[0]).toMatchObject({
			name: 'fs-min',
			value: '0.625rem',
			rawValue: 0.625,
		});
		expect(result.defaultTokens.find((token) => token.name === 'fs-3')?.value).toBe('1.25rem');
	});

	it('supports independent atomic typography modes', () => {
		const typography: DesignSystem['typography'] = {
			modes: [
				...basicTypography.modes,
				{
					name: 'compact',
					tokens: { unit: 'rem', base: 0.875, min: 0.5, increment: 0.1, range: 8 },
				},
			],
		};
		const result = generateTypographyTokens(typography, defaultGeneratorConfig);
		expect(result.overrideTokens.compact.find((token) => token.name === 'fs-2')?.value).toBe(
			'0.975rem'
		);
	});

	it('emits an unsuffixed base and the fixed role-local size range', () => {
		const result = generateTypographyTokens(semanticTypography, defaultGeneratorConfig);
		const tokens = Object.fromEntries(
			result.defaultTokens.map((token) => [token.name, token.value])
		);

		expect(tokens['text-copy-font-family']).toBe('"Editorial Variable", serif');
		expect(tokens['text-copy-font-size']).toBe('var(--fs-2)');
		expect(tokens['text-copy-font-weight']).toBe('var(--text-copy-font-weight-min)');
		expect(tokens['text-copy-line-height']).toBe('1.3');
		expect(tokens['text-copy-letter-spacing']).toBe('0');
		expect(tokens['text-copy-text-transform']).toBe('uppercase');
		expect(tokens['text-copy-min-font-size']).toBe('var(--fs-1)');
		expect(tokens['text-copy-min-text-transform']).toBe('lowercase');
		expect(tokens['text-copy-max-letter-spacing']).toBe('-0.02em');
		expect(tokens['text-copy-m-font-size']).toBeUndefined();
		expect(tokens['ff-editorial']).toBeUndefined();
	});

	it('rebinds semantic size aliases inside atomic modes so descendant scopes resolve them', () => {
		const typography: DesignSystem['typography'] = {
			...semanticTypography,
			modes: [
				...semanticTypography.modes,
				{
					name: 'compact',
					tokens: { unit: 'rem', base: 0.875, min: 0.5, increment: 0.1, range: 8 },
				},
			],
		};
		const result = generateTypographyTokens(typography, defaultGeneratorConfig);
		expect(
			Object.fromEntries(result.overrideTokens.compact.map((token) => [token.name, token.value]))
		).toMatchObject({
			'text-copy-font-size': 'var(--fs-2)',
			'text-copy-min-font-size': 'var(--fs-1)',
			'text-copy-max-font-size': 'var(--fs-7)',
		});
		expect(
			result.overrideTokens.compact.filter((token) => token.name.startsWith('text-'))
		).toHaveLength(3);
		expect(
			result.overrideTokens.compact.some(
				(token) => token.name.startsWith('text-') && !token.name.endsWith('-font-size')
			)
		).toBe(false);
	});

	it('applies explicit role-local tuple overrides inside a typography mode', () => {
		const typography = structuredClone(semanticTypography);
		typography.modes.push({
			name: 'display',
			tokens: { unit: 'rem', base: 1.5, min: 1, increment: 0.5, range: 12 },
		});
		typography.roles!.copy.modeOverrides = {
			display: {
				sizes: {
					base: {
						fontSize: 4,
						weight: 'max',
						lineHeight: 0.85,
						letterSpacing: -0.015,
						textTransform: 'capitalize',
					},
					max: { fontSize: 10, lineHeight: 0.8, letterSpacing: -0.03 },
				},
			},
		};

		const result = generateTypographyTokens(typography, defaultGeneratorConfig);
		const tokens = Object.fromEntries(
			result.overrideTokens.display.map((token) => [token.name, token.value])
		);
		expect(tokens).toMatchObject({
			'text-copy-font-size': 'var(--fs-4)',
			'text-copy-font-weight': 'var(--text-copy-font-weight-max)',
			'text-copy-line-height': '0.85',
			'text-copy-letter-spacing': '-0.015em',
			'text-copy-text-transform': 'capitalize',
			'text-copy-min-font-size': 'var(--fs-1)',
			'text-copy-max-font-size': 'var(--fs-10)',
			'text-copy-max-font-weight': 'var(--text-copy-font-weight-max)',
			'text-copy-max-line-height': '0.8',
			'text-copy-max-letter-spacing': '-0.03em',
		});
	});

	it('strictly validates semantic tuple mode overrides', () => {
		const withMode = () => {
			const typography = structuredClone(semanticTypography);
			typography.modes.push({
				name: 'display',
				tokens: { unit: 'rem', base: 1.5, min: 1, increment: 0.5, range: 12 },
			});
			return typography;
		};

		const unknownMode = withMode();
		unknownMode.roles!.copy.modeOverrides = { stage: { sizes: { base: { lineHeight: 0.8 } } } };
		expect(() => generate({ typography: unknownMode })).toThrow(
			'references unknown typography mode "stage"'
		);

		const defaultMode = withMode();
		defaultMode.roles!.copy.modeOverrides = {
			default: { sizes: { base: { lineHeight: 0.8 } } },
		};
		expect(() => generate({ typography: defaultMode })).toThrow(
			'must not redefine default mode "default"'
		);

		const unknownVariant = withMode();
		unknownVariant.roles!.copy.modeOverrides = {
			display: { sizes: { billboard: { lineHeight: 0.8 } } as never },
		};
		expect(() => generate({ typography: unknownVariant })).toThrow(
			'references unknown size "billboard"'
		);

		const unavailableWeight = withMode();
		unavailableWeight.roles!.copy.modeOverrides = {
			display: { sizes: { base: { weight: 'ultra' } } },
		};
		expect(() => generate({ typography: unavailableWeight })).toThrow(
			'weight "ultra" must be exposed by the role'
		);

		const beyondMode = withMode();
		beyondMode.roles!.copy.modeOverrides = {
			display: { sizes: { base: { fontSize: 13 } } },
		};
		expect(() => generate({ typography: beyondMode })).toThrow(
			'mode "display" only generates through fs-12'
		);

		const invalidTransform = withMode();
		invalidTransform.roles!.copy.modeOverrides = {
			display: {
				sizes: {
					base: { textTransform: 'sideways' as never },
				},
			},
		};
		expect(() => generate({ typography: invalidTransform })).toThrow(
			'textTransform is unsupported'
		);
	});

	it('does not invent semantic rebindings for an atomic-only typography system', () => {
		const typography: DesignSystem['typography'] = {
			modes: [
				...basicTypography.modes,
				{
					name: 'compact',
					tokens: { unit: 'rem', base: 0.875, min: 0.5, increment: 0.1, range: 8 },
				},
			],
		};
		const result = generateTypographyTokens(typography, defaultGeneratorConfig);
		expect(result.overrideTokens.compact.every((token) => token.name.startsWith('fs-'))).toBe(true);
	});

	it('strictly rejects a role weight unavailable in a prepared static face', () => {
		const typography = structuredClone(semanticTypography);
		typography.fonts!.editorial.capabilities!.faces = [{ style: 'normal', weights: [400, 500] }];
		expect(() => generate({ typography })).toThrowError(ValidationError);
		expect(() => generate({ typography })).toThrow(
			'style "normal" weight "max" (700) is unavailable in font "editorial"; available normal weights: 400, 500'
		);
	});

	it('strictly rejects an unavailable italic weight without filtering it', () => {
		const typography = structuredClone(semanticTypography);
		typography.fonts!.editorial.capabilities!.faces[1].weights = [400];
		expect(() => generate({ typography })).toThrow(
			'style "italic" weight "max" (700) is unavailable in font "editorial"; available italic weights: 400'
		);
	});

	it('rejects a default style and weight combination the face cannot supply', () => {
		const typography = structuredClone(semanticTypography);
		typography.roles!.copy.defaultStyle = 'italic';
		typography.roles!.copy.styles!.italic = {
			weights: ['min'],
		};
		expect(() => generate({ typography })).toThrow(
			'size "max" weight "max" is unavailable for defaultStyle "italic"'
		);
	});

	it('rejects empty and overlapping manually supplied font capabilities', () => {
		const empty = structuredClone(semanticTypography);
		empty.fonts!.editorial.capabilities!.faces = [];
		expect(() => generate({ typography: empty })).toThrow('must contain at least one face');

		const overlap = structuredClone(semanticTypography);
		overlap.fonts!.editorial.capabilities!.faces = [
			{ style: 'normal', weights: { min: 300, max: 600 } },
			{ style: 'normal', weights: [600, 700] },
		];
		expect(() => generate({ typography: overlap })).toThrow(
			'capability faces 0 and 1 overlap for style "normal"'
		);
	});

	it('enforces honest min and max aliases without requiring a fixed schedule', () => {
		const typography = structuredClone(semanticTypography);
		typography.roles!.copy.weights = { min: 700, max: 400 };
		typography.roles!.copy.styles = { normal: { weights: ['min', 'max'] } };
		expect(() => generate({ typography })).toThrow('weight min must be its actual minimum');
	});

	it('rejects non-grammar size identities and references beyond the smallest mode', () => {
		const unsafe = structuredClone(semanticTypography);
		(unsafe.roles!.copy.sizes as Record<string, unknown>)['weight-max'] = {
			fontSize: 2,
			weight: 'min',
			lineHeight: 1.2,
			letterSpacing: 0,
		};
		expect(() => generate({ typography: unsafe })).toThrow(
			'sizes must use only min / s / base / l / max'
		);

		const beyond = structuredClone(semanticTypography);
		beyond.roles!.copy.sizes.max!.fontSize = 9;
		expect(() => generate({ typography: beyond })).toThrow('only generates through fs-8');
	});

	it('rejects flattened role and variant names that would overwrite output', () => {
		const typography = structuredClone(semanticTypography);
		typography.roles!['copy-min'] = {
			...structuredClone(typography.roles!.copy),
		};
		expect(() => generate({ typography })).toThrow('generated name "copy-min" collides');
	});

	it('derives canonical role-local size presentation order', () => {
		expect(
			generate({ typography: semanticTypography }).typography?.roles.copy.displayOrder
		).toEqual(['min', 'base', 'max']);
	});

	it('validates OpenType features and custom axes against every exposed face', () => {
		const unsupported = structuredClone(semanticTypography);
		unsupported.roles!.copy.sizes.base.features = { ss01: true };
		expect(() => generate({ typography: unsupported })).toThrow('feature "ss01" is unavailable');

		const axis = structuredClone(semanticTypography);
		axis.roles!.copy.styles = { normal: { weights: ['min', 'max'] } };
		axis.roles!.copy.sizes.base.variations = { GRAD: 200 };
		expect(() => generate({ typography: axis })).toThrow('variation "GRAD" (200) is unavailable');
	});

	it('requires explicit font verification and validates runtime longhand settings', () => {
		const missingVerification = structuredClone(semanticTypography) as unknown as {
			fonts: Record<string, Record<string, unknown>>;
		};
		delete missingVerification.fonts.editorial.verification;
		expect(() => generate({ typography: missingVerification as never })).toThrow(
			'must explicitly declare verification'
		);

		const invalidKerning = structuredClone(semanticTypography) as unknown as {
			roles: Record<string, { sizes: { base: Record<string, unknown> } }>;
		};
		invalidKerning.roles.copy.sizes.base.fontKerning = 'banana';
		expect(() => generate({ typography: invalidKerning as never })).toThrow('fontKerning must be');

		const invalidOpticalSizing = structuredClone(semanticTypography) as unknown as {
			roles: Record<string, { sizes: { base: Record<string, unknown> } }>;
		};
		invalidOpticalSizing.roles.copy.sizes.base.fontOpticalSizing = 'banana';
		expect(() => generate({ typography: invalidOpticalSizing as never })).toThrow(
			'fontOpticalSizing must be'
		);
	});

	it('reports the typography mode as the size default in a typography-only IR', () => {
		const ir = generate({ typography: basicTypography });
		expect(ir.modes.size.default).toBe('default');
	});

	it('rejects an atomic minimum that is not below base', () => {
		const typography = structuredClone(basicTypography);
		typography.modes[0].tokens.min = 1;
		expect(() => generate({ typography })).toThrow('smaller than base');
	});
});
