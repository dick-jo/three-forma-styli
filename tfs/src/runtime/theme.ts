import { ALPHA_POSITIONS, PREFIXES } from '../const.js';
import {
	checkLuminance,
	type LuminanceResult,
	type LuminanceRule,
	type Polarity,
} from './luminance.js';
import { formatOklch, type OklchChannels } from './oklch.js';

/** The generated ./color-theme contract: what customers may set, and the rule. */
export type ColorThemeConfig<Color extends string = string> = {
	readonly colors: readonly Color[];
	readonly alpha: Readonly<Record<'non' | (typeof ALPHA_POSITIONS)[number], number>>;
	readonly luminance: LuminanceRule<Color> | null;
};

/** A customer theme as stored: exactly the configured colours plus polarity. */
export type RuntimeColorTheme<Color extends string = string> = {
	readonly polarity: Polarity;
	readonly colors: Readonly<Record<Color, OklchChannels>>;
};

export type RuntimeColorThemeResult<Color extends string = string> = {
	readonly theme: RuntimeColorTheme<Color>;
	/** `--clr-pri`, `--clr-pri-a-lo`, … ready to set on an element. */
	readonly customProperties: Readonly<Record<string, string>>;
	/** Contrast diagnostics, or null when the design system has no rule. */
	readonly luminance: LuminanceResult | null;
};

/** Malformed input, reported with the path of the bad value. */
export class RuntimeColorThemeValidationError extends TypeError {
	readonly path: string;
	constructor(path: string, message: string) {
		super(`${path} ${message}`);
		this.name = 'RuntimeColorThemeValidationError';
		this.path = path;
	}
}

/** Valid input whose colours fail the contrast rule. */
export class RuntimeLuminanceConstraintError extends Error {
	readonly result: RuntimeColorThemeResult;
	constructor(result: RuntimeColorThemeResult) {
		const { actualDelta, requiredDelta } = result.luminance!;
		super(
			`Theme fails the contrast rule: OKLCH lightness separation ${actualDelta}, needs at least ${requiredDelta}.`
		);
		this.name = 'RuntimeLuminanceConstraintError';
		this.result = result;
	}
}

function fail(path: string, message: string): never {
	throw new RuntimeColorThemeValidationError(path, message);
}

function record(value: unknown, path: string): Record<string, unknown> {
	const prototype =
		value !== null && typeof value === 'object' && !Array.isArray(value)
			? Object.getPrototypeOf(value)
			: undefined;
	if (prototype !== Object.prototype && prototype !== null) fail(path, 'must be a plain object');
	return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
	for (const key of Object.keys(value))
		if (!keys.includes(key)) fail(`${path}.${key}`, 'is not allowed');
	for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required');
}

function channel(value: unknown, path: string, min: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a finite number');
	if (value < min || value > max) fail(path, `must be between ${min} and ${max}`);
	return value;
}

/** Strictly parses untrusted theme data (e.g. from storage or a request). */
export function parseRuntimeColorTheme<const Color extends string>(
	input: unknown,
	config: ColorThemeConfig<Color>
): RuntimeColorTheme<Color> {
	const root = record(input, 'theme');
	exactKeys(root, ['colors', 'polarity'], 'theme');
	if (root.polarity !== 'negative' && root.polarity !== 'positive')
		fail('theme.polarity', 'must be "negative" or "positive"');
	const colors = record(root.colors, 'theme.colors');
	exactKeys(colors, config.colors, 'theme.colors');
	const parsed = Object.create(null) as Record<Color, OklchChannels>;
	for (const name of config.colors) {
		const path = `theme.colors.${name}`;
		const color = record(colors[name], path);
		exactKeys(color, ['c', 'h', 'l'], path);
		parsed[name] = Object.freeze({
			l: channel(color.l, `${path}.l`, 0, 1),
			c: channel(color.c, `${path}.c`, 0, Infinity),
			h: channel(color.h, `${path}.h`, 0, 360),
		});
	}
	return Object.freeze({ polarity: root.polarity, colors: Object.freeze(parsed) });
}

/** Parses the theme, builds its custom properties and measures it. Failing the rule is reported, not thrown. */
export function generateRuntimeColorTheme<const Color extends string>(
	input: unknown,
	config: ColorThemeConfig<Color>
): RuntimeColorThemeResult<Color> {
	const theme = parseRuntimeColorTheme(input, config);
	const customProperties = Object.create(null) as Record<string, string>;
	for (const name of config.colors) {
		const color = theme.colors[name];
		customProperties[`--${PREFIXES.color}-${name}`] = formatOklch(color);
		for (const position of ['non', ...ALPHA_POSITIONS] as const) {
			customProperties[`--${PREFIXES.color}-${name}-${PREFIXES.alpha}-${position}`] = formatOklch(
				color,
				config.alpha[position]
			);
		}
	}
	// Measure the lightness as emitted (4 decimals), so diagnostics describe the CSS.
	const emitted = Object.fromEntries(
		config.colors.map((name) => [name, { l: Number(theme.colors[name].l.toFixed(4)) }])
	);
	return Object.freeze({
		theme,
		customProperties: Object.freeze(customProperties),
		luminance: config.luminance ? checkLuminance(emitted, config.luminance, theme.polarity) : null,
	});
}

/** Like generateRuntimeColorTheme, but throws when the theme fails the contrast rule. Use before saving or applying. */
export function enforceRuntimeColorTheme<const Color extends string>(
	input: unknown,
	config: ColorThemeConfig<Color>
): RuntimeColorThemeResult<Color> {
	if (!config.luminance)
		throw new Error(
			'Cannot enforce the contrast rule: this design system has no colors.constraints.luminance.'
		);
	const result = generateRuntimeColorTheme(input, config);
	if (!result.luminance!.deltaValid) throw new RuntimeLuminanceConstraintError(result);
	return result;
}
