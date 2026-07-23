import { describe, expect, it } from 'vitest';
import {
	generateRuntimeColorTheme,
	enforceRuntimeColorTheme,
	parseRuntimeColorTheme,
	RuntimeColorThemeValidationError,
	RuntimeLuminanceConstraintError,
} from './index.js';
import { applyAlpha, oklchToCss } from '../utils.js';

const theme = {
	polarity: 'negative',
	colors: {
		canvas: { l: 0.18, c: 0.012, h: 260 },
		ink: { l: 0.91, c: 0.3, h: 145.25 },
	},
} as const;

const config = {
	colorNames: ['canvas', 'ink'],
	alphaSchedule: { non: 0, lo: 0.125, max: 1 },
	luminance: {
		minimumLuminanceDelta: 0.6,
		backgroundColors: ['canvas'],
		foregroundColors: ['ink'],
	},
	prefixes: { color: 'color' },
	colorFormat: { alphaModifier: 'alpha' },
} as const;

describe('parseRuntimeColorTheme', () => {
	it('parses and freezes the exact serializable theme contract', () => {
		const input = structuredClone(theme);
		const result = parseRuntimeColorTheme(input, config);

		expect(result).toEqual(theme);
		expect(result).not.toBe(input);
		expect(result.colors.ink).not.toBe(input.colors.ink);
		expect(Object.getPrototypeOf(result.colors)).toBeNull();
		expect(Object.isFrozen(result)).toBe(true);
		expect(Object.isFrozen(result.colors)).toBe(true);
		expect(Object.isFrozen(result.colors.ink)).toBe(true);
	});

	it.each([
		['a null root', null, 'theme must be a plain object'],
		['an array root', [], 'theme must be a plain object'],
		[
			'an inherited root',
			Object.assign(Object.create({ inherited: true }), theme),
			'theme must be a plain object',
		],
		['an unknown root field', { ...theme, mode: 'dark' }, 'theme.mode is not allowed'],
		['a missing root field', { colors: theme.colors }, 'theme.polarity is required'],
		['an invalid polarity', { ...theme, polarity: 'dark' }, 'theme.polarity must be either'],
		[
			'a missing declared color',
			{ ...theme, colors: { canvas: theme.colors.canvas } },
			'theme.colors.ink is required',
		],
		[
			'an undeclared color',
			{ ...theme, colors: { ...theme.colors, accent: theme.colors.ink } },
			'theme.colors.accent is not allowed',
		],
		[
			'an unknown color channel',
			{
				...theme,
				colors: { ...theme.colors, ink: { ...theme.colors.ink, alpha: 0.5 } },
			},
			'theme.colors.ink.alpha is not allowed',
		],
		[
			'a missing color channel',
			{ ...theme, colors: { ...theme.colors, ink: { l: 0.91, c: 0.3 } } },
			'theme.colors.ink.h is required',
		],
		[
			'a non-finite channel',
			{ ...theme, colors: { ...theme.colors, ink: { ...theme.colors.ink, c: Infinity } } },
			'theme.colors.ink.c must be a finite number',
		],
		[
			'out-of-range lightness',
			{ ...theme, colors: { ...theme.colors, ink: { ...theme.colors.ink, l: 1.01 } } },
			'theme.colors.ink.l must be between 0 and 1',
		],
		[
			'negative chroma',
			{ ...theme, colors: { ...theme.colors, ink: { ...theme.colors.ink, c: -0.01 } } },
			'theme.colors.ink.c must be non-negative',
		],
		[
			'out-of-range hue',
			{ ...theme, colors: { ...theme.colors, ink: { ...theme.colors.ink, h: 361 } } },
			'theme.colors.ink.h must be between 0 and 360',
		],
	])('rejects %s', (_label, input, message) => {
		expect(() => parseRuntimeColorTheme(input, config)).toThrowError(message);
	});

	it('reports the failing path on its public error type', () => {
		try {
			parseRuntimeColorTheme({ ...theme, polarity: 'dark' }, config);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(RuntimeColorThemeValidationError);
			expect((error as RuntimeColorThemeValidationError).path).toBe('theme.polarity');
		}
	});

	it('rejects prototype-pollution and CSS-injection payloads decoded from JSON', () => {
		const rootPollution = JSON.parse(
			'{"polarity":"negative","colors":{"canvas":{"l":0.18,"c":0,"h":0},"ink":{"l":0.91,"c":0,"h":0}},"__proto__":{"polluted":true}}'
		);
		const colorPollution = JSON.parse(
			'{"polarity":"negative","colors":{"canvas":{"l":0.18,"c":0,"h":0,"__proto__":{"polluted":true}},"ink":{"l":0.91,"c":0,"h":0}}}'
		);
		const cssInjection = JSON.parse(
			'{"polarity":"negative","colors":{"canvas":{"l":0.18,"c":0,"h":0},"ink":{"l":0.91,"c":0,"h":"0);color:red"}}}'
		);

		expect(() => parseRuntimeColorTheme(rootPollution, config)).toThrowError(
			'theme.__proto__ is not allowed'
		);
		expect(() => parseRuntimeColorTheme(colorPollution, config)).toThrowError(
			'theme.colors.canvas.__proto__ is not allowed'
		);
		expect(() => parseRuntimeColorTheme(cssInjection, config)).toThrowError(
			'theme.colors.ink.h must be a finite number'
		);
		expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
	});

	it('safely supports token names that collide with Object prototype members', () => {
		const result = generateRuntimeColorTheme(
			JSON.parse(
				'{"polarity":"negative","colors":{"canvas":{"l":0.1,"c":0,"h":0},"constructor":{"l":0.9,"c":0,"h":0}}}'
			),
			{
				colorNames: ['canvas', 'constructor'],
				luminance: {
					minimumLuminanceDelta: 0.5,
					backgroundColors: ['canvas'],
					foregroundColors: ['constructor'],
				},
			}
		);

		expect(Object.getPrototypeOf(result.theme.colors)).toBeNull();
		expect(Object.getPrototypeOf(result.customProperties)).toBeNull();
		expect(result.customProperties['--clr-constructor']).toBe('oklch(0.9000 0.0000 0.00)');
	});

	it.each([
		[{ colorNames: [] }, 'config.colorNames must be a non-empty array'],
		[{ colorNames: ['ink', 'ink'] }, 'config.colorNames must not contain duplicates'],
		[{ colorNames: ['not safe'] }, 'config.colorNames[0] must be a CSS-token-safe name'],
	])('rejects an invalid schema', (schema, message) => {
		expect(() => parseRuntimeColorTheme(theme, schema)).toThrowError(message);
	});
});

describe('generateRuntimeColorTheme', () => {
	it('emits native OKLCH and alpha properties with build-time formatter parity', () => {
		const result = generateRuntimeColorTheme(theme, config);

		expect(result.customProperties).toEqual({
			'--color-canvas': 'oklch(0.1800 0.0120 260.00)',
			'--color-canvas-alpha-non': 'oklch(0.1800 0.0120 260.00 / 0.0000)',
			'--color-canvas-alpha-lo': 'oklch(0.1800 0.0120 260.00 / 0.1250)',
			'--color-canvas-alpha-max': 'oklch(0.1800 0.0120 260.00 / 1.0000)',
			'--color-ink': 'oklch(0.9100 0.3000 145.25)',
			'--color-ink-alpha-non': 'oklch(0.9100 0.3000 145.25 / 0.0000)',
			'--color-ink-alpha-lo': 'oklch(0.9100 0.3000 145.25 / 0.1250)',
			'--color-ink-alpha-max': 'oklch(0.9100 0.3000 145.25 / 1.0000)',
		});
		expect(Object.getPrototypeOf(result.customProperties)).toBeNull();
		expect(Object.isFrozen(result.customProperties)).toBe(true);
		expect(JSON.stringify(result.customProperties)).not.toMatch(/rgb|#/);
	});

	it('uses the same formatter as static TFS color generation', () => {
		const preciseTheme = {
			polarity: 'negative',
			colors: {
				canvas: { l: 0.123456, c: 0.012345, h: 260.126 },
				ink: { l: 0.912345, c: 0.301234, h: 145.255 },
			},
		} as const;
		const result = generateRuntimeColorTheme(preciseTheme, config);
		const staticInk = { mode: 'oklch' as const, ...preciseTheme.colors.ink };

		expect(result.customProperties['--color-ink']).toBe(oklchToCss(staticInk));
		expect(result.customProperties['--color-ink-alpha-lo']).toBe(applyAlpha(staticInk, 0.125));
	});

	it('uses stable CSS defaults and emits no alpha variants when no schedule is supplied', () => {
		const result = generateRuntimeColorTheme(theme, {
			colorNames: config.colorNames,
			luminance: config.luminance,
		});

		expect(result.customProperties).toEqual({
			'--clr-canvas': 'oklch(0.1800 0.0120 260.00)',
			'--clr-ink': 'oklch(0.9100 0.3000 145.25)',
		});
	});

	it('returns existing luminance diagnostics under an explicit metric discriminator', () => {
		const result = generateRuntimeColorTheme(theme, config);

		expect(result.luminance.metric).toBe('oklch-l');
		expect(result.luminance).toMatchObject({
			metric: 'oklch-l',
			deltaValid: true,
			actualDelta: 0.73,
			requiredDelta: 0.6,
			backgroundConstraintType: 'max',
			foregroundConstraintType: 'min',
			colors: {
				canvas: { group: 'background', luminance: 0.18 },
				ink: { group: 'foreground', luminance: 0.91 },
			},
		});
		expect(Object.isFrozen(result.luminance)).toBe(true);
		expect(Object.isFrozen(result.luminance.colors)).toBe(true);
		expect(Object.isFrozen(result.luminance.colors.canvas)).toBe(true);
	});

	it('validates the exact lightness precision emitted to CSS', () => {
		const result = generateRuntimeColorTheme(
			{
				polarity: 'negative',
				colors: {
					canvas: { l: 0.100004, c: 0, h: 0 },
					ink: { l: 0.430013, c: 0, h: 0 },
				},
			},
			{
				colorNames: ['canvas', 'ink'],
				luminance: {
					minimumLuminanceDelta: 0.330005,
					backgroundColors: ['canvas'],
					foregroundColors: ['ink'],
				},
			}
		);

		expect(result.customProperties).toMatchObject({
			'--clr-canvas': 'oklch(0.1000 0.0000 0.00)',
			'--clr-ink': 'oklch(0.4300 0.0000 0.00)',
		});
		expect(result.luminance.actualDelta).toBe(0.33);
		expect(result.luminance.deltaValid).toBe(false);
	});

	it('normalizes floating-point noise in public diagnostics', () => {
		const result = generateRuntimeColorTheme(
			{
				polarity: 'positive',
				colors: {
					canvas: { l: 0.9535, c: 0, h: 0 },
					ink: { l: 0.2, c: 0, h: 0 },
				},
			},
			{
				colorNames: ['canvas', 'ink'],
				luminance: {
					minimumLuminanceDelta: 0.33,
					backgroundColors: ['canvas'],
					foregroundColors: ['ink'],
				},
			}
		);

		expect(result.luminance.foregroundConstraint).toBe(0.6235);
	});

	it('supports positive-polarity diagnostics', () => {
		const result = generateRuntimeColorTheme(
			{
				polarity: 'positive',
				colors: {
					canvas: { l: 0.95, c: 0, h: 0 },
					ink: { l: 0.2, c: 0, h: 0 },
				},
			},
			config
		);

		expect(result.luminance).toMatchObject({
			metric: 'oklch-l',
			deltaValid: true,
			actualDelta: 0.75,
			backgroundConstraintType: 'min',
			foregroundConstraintType: 'max',
		});
	});

	it.each([
		[
			'an invalid alpha level',
			{ ...config, alphaSchedule: { 'not safe': 0.5 } },
			'config.alphaSchedule.not safe must be a CSS-token-safe name',
		],
		[
			'an invalid alpha value',
			{ ...config, alphaSchedule: { lo: 1.1 } },
			'config.alphaSchedule.lo must be between 0 and 1',
		],
		[
			'an unsafe prefix',
			{ ...config, prefixes: { color: '--color' } },
			'config.prefixes.color must be a CSS-token-safe name',
		],
		[
			'a non-finite delta',
			{ ...config, luminance: { ...config.luminance, minimumLuminanceDelta: NaN } },
			'config.luminance.minimumLuminanceDelta must be a finite number',
		],
		[
			'an out-of-range delta',
			{ ...config, luminance: { ...config.luminance, minimumLuminanceDelta: 1.1 } },
			'config.luminance.minimumLuminanceDelta must be between 0 and 1',
		],
		[
			'an empty color group',
			{ ...config, luminance: { ...config.luminance, backgroundColors: [] } },
			'config.luminance.backgroundColors must be a non-empty array',
		],
		[
			'an undeclared group color',
			{ ...config, luminance: { ...config.luminance, foregroundColors: ['accent'] } },
			'config.luminance.foregroundColors references undeclared color "accent"',
		],
		[
			'a color in both groups',
			{ ...config, luminance: { ...config.luminance, foregroundColors: ['canvas'] } },
			'config.luminance color "canvas" cannot belong to both groups',
		],
	])('rejects %s', (_label, invalidConfig, message) => {
		expect(() => generateRuntimeColorTheme(theme, invalidConfig)).toThrowError(message);
	});

	it('rejects custom-property collisions across base and alpha names', () => {
		const collidingTheme = {
			polarity: 'negative',
			colors: {
				ink: { l: 0.9, c: 0, h: 0 },
				'ink-a-lo': { l: 0.85, c: 0, h: 0 },
				canvas: { l: 0.1, c: 0, h: 0 },
			},
		};
		expect(() =>
			generateRuntimeColorTheme(collidingTheme, {
				colorNames: ['ink', 'ink-a-lo', 'canvas'],
				alphaSchedule: { lo: 0.25 },
				luminance: {
					minimumLuminanceDelta: 0.5,
					backgroundColors: ['canvas'],
					foregroundColors: ['ink'],
				},
			})
		).toThrowError('config generates duplicate custom property "--clr-ink-a-lo"');
	});
});

describe('enforceRuntimeColorTheme', () => {
	it('returns the same frozen result when the configured luminance constraint passes', () => {
		const result = enforceRuntimeColorTheme(theme, config);

		expect(result.luminance.deltaValid).toBe(true);
		expect(Object.isFrozen(result)).toBe(true);
	});

	it('separates valid payload parsing from explicit luminance enforcement', () => {
		const failingTheme = {
			...theme,
			colors: {
				canvas: { ...theme.colors.canvas, l: 0.4 },
				ink: { ...theme.colors.ink, l: 0.5 },
			},
		};
		const measured = generateRuntimeColorTheme(failingTheme, config);
		expect(measured.luminance.deltaValid).toBe(false);

		try {
			enforceRuntimeColorTheme(failingTheme, config);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(RuntimeLuminanceConstraintError);
			expect(error).not.toBeInstanceOf(RuntimeColorThemeValidationError);
			expect((error as RuntimeLuminanceConstraintError).result).toEqual(measured);
			expect((error as Error).message).toContain('measured delta 0.1, requires at least 0.6');
		}
	});
});
