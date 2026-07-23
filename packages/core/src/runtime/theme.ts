import { validateLuminance } from '../constraints/luminance.js';
import { formatNativeOklch, formatNativeOklchWithAlpha } from '../color-css.js';
import type {
	RuntimeColorTheme,
	RuntimeColorThemeConfig,
	RuntimeColorThemeResult,
	RuntimeColorThemeSchema,
	RuntimeOklchColor,
} from './types.js';
import { RuntimeColorThemeValidationError } from './types.js';

const tokenNamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/i;
const rootKeys = ['colors', 'polarity'] as const;
const colorKeys = ['c', 'h', 'l'] as const;

type UnknownRecord = Record<string, unknown>;

function fail(path: string, message: string): never {
	throw new RuntimeColorThemeValidationError(path, message);
}

function isPlainRecord(value: unknown): value is UnknownRecord {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function requirePlainRecord(value: unknown, path: string): UnknownRecord {
	if (!isPlainRecord(value)) fail(path, 'must be a plain object');
	return value;
}

function requireExactKeys(
	record: UnknownRecord,
	expectedKeys: readonly string[],
	path: string
): void {
	const expected = new Set(expectedKeys);
	for (const key of Object.keys(record)) {
		if (!expected.has(key)) fail(`${path}.${key}`, 'is not allowed');
	}
	for (const key of expectedKeys) {
		if (!Object.hasOwn(record, key)) fail(`${path}.${key}`, 'is required');
	}
}

function requireFiniteNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		fail(path, 'must be a finite number');
	}
	return value;
}

function requireTokenName(value: unknown, path: string): string {
	if (typeof value !== 'string' || !tokenNamePattern.test(value)) {
		fail(path, 'must be a CSS-token-safe name');
	}
	return value;
}

function validateColorNames(value: unknown): readonly string[] {
	if (!Array.isArray(value) || value.length === 0) {
		fail('config.colorNames', 'must be a non-empty array');
	}

	const names = value.map((name, index) =>
		requireTokenName(name, `config.colorNames[${index}]`)
	);
	const uniqueNames = new Set(names);
	if (uniqueNames.size !== names.length) fail('config.colorNames', 'must not contain duplicates');
	return names;
}

function parseColor(value: unknown, path: string): RuntimeOklchColor {
	const record = requirePlainRecord(value, path);
	requireExactKeys(record, colorKeys, path);

	const l = requireFiniteNumber(record.l, `${path}.l`);
	if (l < 0 || l > 1) fail(`${path}.l`, 'must be between 0 and 1');

	const c = requireFiniteNumber(record.c, `${path}.c`);
	if (c < 0) fail(`${path}.c`, 'must be non-negative');

	const h = requireFiniteNumber(record.h, `${path}.h`);
	if (h < 0 || h > 360) fail(`${path}.h`, 'must be between 0 and 360');

	return Object.freeze({ l, c, h });
}

function parsePolarity(value: unknown): RuntimeColorTheme['polarity'] {
	if (value !== 'negative' && value !== 'positive') {
		fail('theme.polarity', 'must be either "negative" or "positive"');
	}
	return value;
}

/** Strictly parse an unknown JSON-compatible runtime color theme. */
export function parseRuntimeColorTheme(
	input: unknown,
	schema: RuntimeColorThemeSchema
): RuntimeColorTheme {
	const colorNames = validateColorNames((schema as RuntimeColorThemeSchema | undefined)?.colorNames);
	const root = requirePlainRecord(input, 'theme');
	requireExactKeys(root, rootKeys, 'theme');
	const inputColors = requirePlainRecord(root.colors, 'theme.colors');
	requireExactKeys(inputColors, colorNames, 'theme.colors');

	const colors = Object.create(null) as Record<string, RuntimeOklchColor>;
	for (const colorName of colorNames) {
		colors[colorName] = parseColor(inputColors[colorName], `theme.colors.${colorName}`);
	}

	return Object.freeze({
		polarity: parsePolarity(root.polarity),
		colors: Object.freeze(colors),
	});
}

function validateAlphaSchedule(
	value: RuntimeColorThemeConfig['alphaSchedule']
): readonly (readonly [string, number])[] {
	if (value === undefined) return [];
	const schedule = requirePlainRecord(value, 'config.alphaSchedule');
	const entries: Array<readonly [string, number]> = [];
	for (const [level, unknownAlpha] of Object.entries(schedule)) {
		requireTokenName(level, `config.alphaSchedule.${level}`);
		const alpha = requireFiniteNumber(unknownAlpha, `config.alphaSchedule.${level}`);
		if (alpha < 0 || alpha > 1) {
			fail(`config.alphaSchedule.${level}`, 'must be between 0 and 1');
		}
		entries.push([level, alpha]);
	}
	return entries;
}

function validateColorGroup(
	value: unknown,
	path: string,
	colorNames: ReadonlySet<string>
): readonly string[] {
	if (!Array.isArray(value) || value.length === 0) fail(path, 'must be a non-empty array');
	const names = value.map((name, index) => requireTokenName(name, `${path}[${index}]`));
	if (new Set(names).size !== names.length) fail(path, 'must not contain duplicates');
	for (const name of names) {
		if (!colorNames.has(name)) fail(path, `references undeclared color "${name}"`);
	}
	return names;
}

/**
 * Parse, validate and generate browser-ready color custom properties.
 *
 * Values remain native `oklch()` strings. TFS does not clip or gamut-map them
 * through sRGB, so authored Display-P3-capable colors retain their chroma until
 * the browser performs display-aware rendering.
 */
export function generateRuntimeColorTheme(
	input: unknown,
	config: RuntimeColorThemeConfig
): RuntimeColorThemeResult {
	const theme = parseRuntimeColorTheme(input, config);
	const colorNames = Object.keys(theme.colors);
	const declaredColors = new Set(colorNames);
	const alphaSchedule = validateAlphaSchedule(config.alphaSchedule);
	const prefix = requireTokenName(config.prefixes?.color ?? 'clr', 'config.prefixes.color');
	const alphaModifier = requireTokenName(
		config.colorFormat?.alphaModifier ?? 'a',
		'config.colorFormat.alphaModifier'
	);

	const minDelta = requireFiniteNumber(config.luminance?.minDelta, 'config.luminance.minDelta');
	if (minDelta < 0 || minDelta > 1) {
		fail('config.luminance.minDelta', 'must be between 0 and 1');
	}
	const backgroundColors = validateColorGroup(
		config.luminance?.backgroundColors,
		'config.luminance.backgroundColors',
		declaredColors
	);
	const foregroundColors = validateColorGroup(
		config.luminance?.foregroundColors,
		'config.luminance.foregroundColors',
		declaredColors
	);
	for (const colorName of backgroundColors) {
		if (foregroundColors.includes(colorName)) {
			fail('config.luminance', `color "${colorName}" cannot belong to both groups`);
		}
	}

	const customProperties = Object.create(null) as Record<string, string>;
	const generatedNames = new Set<string>();
	const addProperty = (name: string, value: string): void => {
		if (generatedNames.has(name)) {
			fail('config', `generates duplicate custom property "${name}"`);
		}
		generatedNames.add(name);
		customProperties[name] = value;
	};

	for (const colorName of colorNames) {
		const color = theme.colors[colorName];
		addProperty(`--${prefix}-${colorName}`, formatNativeOklch(color));
		for (const [level, alpha] of alphaSchedule) {
			addProperty(
				`--${prefix}-${colorName}-${alphaModifier}-${level}`,
				formatNativeOklchWithAlpha(color, alpha)
			);
		}
	}

	const diagnostics = validateLuminance(theme.colors, {
		polarity: theme.polarity,
		minDelta,
		backgroundColors: [...backgroundColors],
		foregroundColors: [...foregroundColors],
	});

	return Object.freeze({
		theme,
		customProperties: Object.freeze(customProperties),
		luminance: Object.freeze(diagnostics),
	});
}
