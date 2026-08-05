import { describe, expect, it } from 'vitest';
import type { PartialDesignSystem } from '../types.js';
import { generate, ValidationError } from './index.js';

const color = { mode: 'oklch' as const, l: 0.5, c: 0.1, h: 260 };
const alpha: NonNullable<PartialDesignSystem['alpha']> = {
	defaultScale: 'standard',
	scales: {
		standard: {
			values: { min: 0.1, 'lo-x': 0.2, lo: 0.3, hi: 0.6, 'hi-x': 0.8, max: 0.9 },
		},
	},
};
const spacing: NonNullable<PartialDesignSystem['spacing']> = {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'px', base: 8, min: 4, range: 4 },
		},
	],
};

function colors(
	modes: NonNullable<PartialDesignSystem['colors']>['modes']
): NonNullable<PartialDesignSystem['colors']> {
	return { modes };
}

describe('generator input validation', () => {
	it('rejects duplicate mode names before generation can overwrite them', () => {
		expect(() =>
			generate({
				spacing: {
					modes: [
						...spacing.modes,
						{ name: 'default', tokens: { unit: 'px', base: 6, min: 3, range: 4 } },
					],
				},
			})
		).toThrowError(/duplicate mode name "default"/);
	});

	it('rejects multiple defaults within a token family', () => {
		expect(() =>
			generate({
				spacing: {
					modes: [
						...spacing.modes,
						{
							name: 'large',
							isDefault: true,
							tokens: { unit: 'px', base: 10, min: 5, range: 4 },
						},
					],
				},
			})
		).toThrowError(/at most one default mode/);
	});

	it('rejects mode, color token, and alpha names that cannot safely enter CSS identifiers', () => {
		expect(() =>
			generate({
				alpha,
				colors: colors([{ name: 'dark mode', isDefault: true, tokens: { bg: color } }]),
			})
		).toThrowError(/not CSS-token safe/);

		expect(() =>
			generate({
				alpha,
				colors: colors([{ name: 'default', isDefault: true, tokens: { 'brand primary': color } }]),
			})
		).toThrowError(/not CSS-token safe/);

		expect(() =>
			generate({
				alpha: {
					defaultScale: 'low opacity',
					scales: { 'low opacity': alpha.scales.standard! },
				},
			})
		).toThrowError(/CSS-token-safe scale identity/);
	});

	it('rejects non-finite and out-of-range color values without altering wide-gamut chroma', () => {
		expect(() =>
			generate({
				alpha,
				colors: colors([
					{
						name: 'default',
						isDefault: true,
						tokens: { bg: { ...color, l: Number.NaN } },
					},
				]),
			})
		).toThrowError(/\.l must be a finite number/);

		expect(() =>
			generate({
				alpha,
				colors: colors([
					{ name: 'default', isDefault: true, tokens: { bg: { ...color, l: 1.1 } } },
				]),
			})
		).toThrowError(/\.l must be between 0 and 1/);

		expect(() =>
			generate({
				alpha,
				colors: colors([
					{ name: 'default', isDefault: true, tokens: { bg: { ...color, alpha: 0.5 } } },
				]),
			})
		).toThrowError(/define transparency through the top-level alpha system/);

		expect(() =>
			generate({
				alpha,
				colors: colors([
					{ name: 'default', isDefault: true, tokens: { vivid: { ...color, c: 0.45 } } },
				]),
			})
		).not.toThrow();
	});

	it('validates an optional reusable luminance policy against the canonical default palette', () => {
		const valid = {
			luminance: {
				minimumLuminanceDelta: 0.4,
				backgroundColors: ['canvas'],
				foregroundColors: ['ink'],
			},
			modes: [
				{
					name: 'night',
					isDefault: true,
					tokens: { canvas: { ...color, l: 0.1 }, ink: { ...color, l: 0.9 } },
				},
				{ name: 'day', tokens: { canvas: { ...color, l: 0.95 } } },
			],
		} satisfies NonNullable<PartialDesignSystem['colors']>;
		expect(() => generate({ alpha, colors: valid })).not.toThrow();

		expect(() =>
			generate({
				alpha,
				colors: {
					...valid,
					modes: [...valid.modes, { name: 'brand', tokens: { accent: color } }],
				},
			})
		).toThrowError(/introduces "accent".*not declared by default mode "night"/);
		expect(() =>
			generate({
				alpha,
				colors: {
					...valid,
					luminance: { ...valid.luminance, foregroundColors: ['accent'] },
				},
			})
		).toThrowError(/references undeclared default color identity "accent"/);
		expect(() =>
			generate({
				alpha,
				colors: {
					...valid,
					luminance: {
						...valid.luminance,
						foregroundColors: ['canvas'],
					},
				},
			})
		).toThrowError(/assigns "canvas" to both color groups/);
	});

	it('validates and expands only declared color identity groups', () => {
		expect(() =>
			generate({
				alpha,
				colors: {
					...colors([
						{ name: 'default', isDefault: true, tokens: { bg: color, 'network-base': color } },
					]),
					groups: {
						core: { identities: ['bg'] },
						network: { match: { prefix: 'network-' } },
					},
				},
			})
		).not.toThrow();
		expect(() =>
			generate({
				alpha,
				colors: {
					...colors([{ name: 'default', isDefault: true, tokens: { bg: color } }]),
					groups: { missing: { identities: ['nope'] } },
				},
			})
		).toThrow(/unknown color/);
		expect(() =>
			generate({
				alpha,
				colors: {
					...colors([{ name: 'default', isDefault: true, tokens: { bg: color } }]),
					groups: { empty: { match: { prefix: 'network-' } } },
				},
			})
		).toThrow(/does not match/);
	});

	it('rejects NaN in numeric schedules and unsafe CSS units', () => {
		expect(() =>
			generate({
				spacing: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'px', base: Number.NaN, min: 4, range: 4 },
						},
					],
				},
			})
		).toThrowError(/base must be a positive number/);

		expect(() =>
			generate({
				spacing: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { unit: 'px; color: red', base: 8, min: 4, range: 4 },
						},
					],
				},
			})
		).toThrowError(/CSS-safe unit/);
	});

	it('rejects unknown explicit spacing modes and out-of-range spacing references', () => {
		expect(() =>
			generate({
				spacing,
				gap: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { spacingMode: 'missing', min: 'min', s: 1, l: 2, max: 3 },
						},
					],
				},
			})
		).toThrowError(/unknown spacing mode "missing"/);

		expect(() =>
			generate({
				spacing,
				gap: {
					modes: [
						{
							name: 'default',
							isDefault: true,
							tokens: { min: 'min', s: 1, l: 2, max: 5 },
						},
					],
				},
			})
		).toThrowError(/integer from 1 to 4/);
	});

	it('rejects generated token collisions caused by authored names or custom prefixes', () => {
		expect(() =>
			generate(
				{
					alpha,
					colors: colors([{ name: 'default', isDefault: true, tokens: { min: color } }]),
					spacing,
				},
				{ prefixes: { color: 'x', spacing: 'x' } }
			)
		).toThrowError(/Generated token "--x-min" collides/);
	});

	it('rejects malformed generator namespaces', () => {
		expect(() => generate({ spacing }, { prefixes: { spacing: 'bad prefix' } })).toThrowError(
			/Generator prefix "spacing"/
		);
	});

	it('reports a missing typography base as a ValidationError rather than a TypeError', () => {
		const invalid = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.125, range: 4 },
				},
			],
			fonts: {
				sans: { family: 'system-ui', verification: 'unavailable' },
			},
			roles: {
				prose: { font: 'sans', weights: { base: 400 } },
			},
		} as unknown as NonNullable<PartialDesignSystem['typography']>;

		expect(() => generate({ typography: invalid })).toThrowError(ValidationError);
		expect(() => generate({ typography: invalid })).toThrowError(/must define size base/);
	});
});
