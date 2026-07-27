/**
 * Input validation for DesignSystem and PartialDesignSystem
 *
 * Validates inputs at the generator entry point and throws helpful errors.
 */

import type { AlphaSchedule, DesignSystem, PartialDesignSystem } from '../types.js';
import {
	ValidationError,
	tokenNamePattern,
	validateCssUnit,
	validateFiniteNumber,
	validateNamedModes,
} from './validation-shared.js';
import {
	validateMotionPartial,
	validateShadowsPartial,
	validateTimePartial,
} from './validate-motion-shadows.js';
import { validateTypographyPartial } from './validate-typography.js';

export { ValidationError } from './validation-shared.js';

function validateColorNameList(
	value: unknown,
	path: string,
	declaredColorNames: ReadonlySet<string>
): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new ValidationError(`${path} must be a non-empty array`);
	}
	const names: string[] = [];
	const seen = new Set<string>();
	for (const colorName of value) {
		if (typeof colorName !== 'string' || !tokenNamePattern.test(colorName)) {
			throw new ValidationError(`${path} contains a non-token-safe color name`);
		}
		if (seen.has(colorName)) {
			throw new ValidationError(`${path} must not contain duplicates`);
		}
		if (!declaredColorNames.has(colorName)) {
			throw new ValidationError(`${path} references undeclared default color "${colorName}"`);
		}
		seen.add(colorName);
		names.push(colorName);
	}
	return names;
}

/**
 * Validates a complete DesignSystem, throwing on any invalid input
 */
export function validateDesignSystem(ds: DesignSystem): void {
	if (!ds) {
		throw new ValidationError('DesignSystem is required');
	}

	validateColors(ds);
	validateSpacing(ds);
	validateGap(ds);
	validateTypography(ds);
	validateBorder(ds);
	validateTime(ds);
	if (ds.motion) validateMotionPartial(ds.motion, ds.time);
	if (ds.shadows) validateShadowsPartial(ds.shadows, ds.colors);
}

/**
 * Validates a PartialDesignSystem, throwing on any invalid input.
 * Only validates the families that are provided.
 * Checks for dependency requirements (e.g., gap requires spacing).
 */
export function validatePartialDesignSystem(ds: DesignSystem | PartialDesignSystem): void {
	if (!ds) {
		throw new ValidationError('DesignSystem is required');
	}

	// Check that at least one family is provided
	const hasColors = !!ds.colors;
	const hasSpacing = !!ds.spacing;
	const hasGap = !!ds.gap;
	const hasTypography = !!ds.typography;
	const hasBorder = !!ds.border;
	const hasTime = !!ds.time;
	const hasMotion = !!ds.motion;
	const hasShadows = !!ds.shadows;

	if (
		!hasColors &&
		!hasSpacing &&
		!hasGap &&
		!hasTypography &&
		!hasBorder &&
		!hasTime &&
		!hasMotion &&
		!hasShadows
	) {
		throw new ValidationError('At least one token family must be provided');
	}

	// Check dependencies
	if (hasGap && !hasSpacing) {
		throw new ValidationError('Gap requires spacing (gap values reference spacing tokens)');
	}

	if (ds.border?.radius && !hasSpacing) {
		throw new ValidationError(
			'Border radius requires spacing (radius values reference spacing tokens)'
		);
	}
	if (hasMotion && !hasTime) {
		throw new ValidationError('Motion requires time (motion durations reference time scales)');
	}
	if (hasShadows && !hasColors) {
		throw new ValidationError('Shadows require colors (shadow layers reference color tokens)');
	}

	// Validate each provided family
	if (hasColors) {
		validateColorsPartial(ds.colors!);
	}
	if (hasSpacing) {
		validateSpacingPartial(ds.spacing!);
	}
	if (hasGap) {
		validateGapPartial(ds.gap!, ds.spacing!);
	}
	if (hasTypography) {
		validateTypographyPartial(ds.typography!);
	}
	if (hasBorder) {
		validateBorderPartial(ds.border!, ds.spacing);
	}
	if (hasTime) {
		validateTimePartial(ds.time!);
	}
	if (hasMotion) {
		validateMotionPartial(ds.motion!, ds.time!);
	}
	if (hasShadows) {
		validateShadowsPartial(ds.shadows!, ds.colors!);
	}
}

function validateColorsPartial(colors: NonNullable<PartialDesignSystem['colors']>): void {
	if (!colors.modes || !Array.isArray(colors.modes)) {
		throw new ValidationError('colors.modes must be an array');
	}

	if (colors.modes.length === 0) {
		throw new ValidationError('colors.modes must have at least one mode');
	}
	validateNamedModes(colors.modes, 'colors.modes', 'Color');

	colors.modes.forEach((mode) => {
		if (!mode.tokens || typeof mode.tokens !== 'object') {
			throw new ValidationError(`Color mode "${mode.name}" must have tokens`);
		}
		for (const [tokenName, color] of Object.entries(mode.tokens)) {
			const path = `colors.modes["${mode.name}"].tokens.${tokenName}`;
			if (!tokenNamePattern.test(tokenName)) {
				throw new ValidationError(`${path} is not CSS-token safe`);
			}
			if (!color || typeof color !== 'object' || color.mode !== 'oklch') {
				throw new ValidationError(`${path} must be an OKLCH color object`);
			}
			validateFiniteNumber(color.l, `${path}.l`);
			if (color.l < 0 || color.l > 1) {
				throw new ValidationError(`${path}.l must be between 0 and 1`);
			}
			const chroma = color.c ?? 0;
			validateFiniteNumber(chroma, `${path}.c`);
			if (chroma < 0) throw new ValidationError(`${path}.c must be non-negative`);
			if (color.h !== undefined) validateFiniteNumber(color.h, `${path}.h`);
			if (color.alpha !== undefined) {
				validateFiniteNumber(color.alpha, `${path}.alpha`);
				if (color.alpha !== 1) {
					throw new ValidationError(
						`${path}.alpha must be 1; define transparency through colors.alphaSchedule`
					);
				}
			}
		}
	});
	const defaultMode = colors.modes.find((mode) => mode.isDefault) ?? colors.modes[0];
	if (Object.keys(defaultMode.tokens).length === 0) {
		throw new ValidationError(
			`Default color mode "${defaultMode.name}" must define at least one token`
		);
	}
	if (colors.luminance) {
		const path = 'colors.luminance';
		validateFiniteNumber(colors.luminance.minimumLuminanceDelta, `${path}.minimumLuminanceDelta`);
		if (colors.luminance.minimumLuminanceDelta < 0 || colors.luminance.minimumLuminanceDelta > 1) {
			throw new ValidationError(`${path}.minimumLuminanceDelta must be between 0 and 1`);
		}
		const defaultColorNames = new Set(Object.keys(defaultMode.tokens));
		const groups = [
			validateColorNameList(
				colors.luminance.backgroundColors,
				`${path}.backgroundColors`,
				defaultColorNames
			),
			validateColorNameList(
				colors.luminance.foregroundColors,
				`${path}.foregroundColors`,
				defaultColorNames
			),
		] as const;
		for (const colorName of groups[0]) {
			if (groups[1].includes(colorName)) {
				throw new ValidationError(`${path} assigns "${colorName}" to both color groups`);
			}
		}
		if (colors.runtimeThemes) {
			const runtimePath = 'colors.runtimeThemes.colorNames';
			const runtimeNames = validateColorNameList(
				colors.runtimeThemes.colorNames,
				runtimePath,
				defaultColorNames
			);
			const runtimeSet = new Set(runtimeNames);
			for (const names of groups) {
				for (const colorName of names) {
					if (!runtimeSet.has(colorName)) {
						throw new ValidationError(
							`${runtimePath} must include luminance-group color "${colorName}"`
						);
					}
				}
			}
		}
	} else if (colors.runtimeThemes) {
		throw new ValidationError('colors.runtimeThemes requires colors.luminance');
	}

	if (colors.alphaSchedule) {
		validateAlphaSchedule(colors.alphaSchedule, 'colors.alphaSchedule');
	}

	colors.modes.forEach((mode) => {
		if (mode.alphaSchedule) {
			validateAlphaSchedule(mode.alphaSchedule, `colors.modes["${mode.name}"].alphaSchedule`);
		}
	});
}

function validateColors(ds: DesignSystem): void {
	if (!ds.colors) {
		throw new ValidationError('DesignSystem.colors is required');
	}
	validateColorsPartial(ds.colors);
}

function validateSpacingPartial(spacing: NonNullable<PartialDesignSystem['spacing']>): void {
	if (!spacing.modes || !Array.isArray(spacing.modes)) {
		throw new ValidationError('spacing.modes must be an array');
	}

	if (spacing.modes.length === 0) {
		throw new ValidationError('spacing.modes must have at least one mode');
	}
	validateNamedModes(spacing.modes, 'spacing.modes', 'Spacing');

	spacing.modes.forEach((mode) => {
		if (!mode.tokens) {
			throw new ValidationError(`Spacing mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, range } = mode.tokens;

		validateCssUnit(unit, `spacing.modes["${mode.name}"].tokens.unit`);
		if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" base must be a positive number`);
		}
		if (typeof min !== 'number' || !Number.isFinite(min) || min < 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" min must be a non-negative number`);
		}
		if (typeof range !== 'number' || range < 1 || !Number.isInteger(range)) {
			throw new ValidationError(`Spacing mode "${mode.name}" range must be a positive integer`);
		}
	});
}

function validateSpacingDerivedTokens(
	tokens: Record<string, unknown>,
	modeName: string,
	spacing: NonNullable<PartialDesignSystem['spacing']>,
	path: string
): void {
	const allowedKeys = new Set(['unit', 'spacingMode', 'min', 's', 'l', 'max']);
	for (const key of Object.keys(tokens)) {
		if (!allowedKeys.has(key)) {
			throw new ValidationError(`${path} contains unsupported key "${key}"`);
		}
	}
	if (tokens.unit !== undefined) validateCssUnit(tokens.unit, `${path}.unit`);
	if (tokens.spacingMode !== undefined && typeof tokens.spacingMode !== 'string') {
		throw new ValidationError(`${path}.spacingMode must be a mode name`);
	}

	const requestedSpacingMode = tokens.spacingMode as string | undefined;
	const spacingMode = requestedSpacingMode
		? spacing.modes.find((mode) => mode.name === requestedSpacingMode)
		: (spacing.modes.find((mode) => mode.name === modeName) ??
			spacing.modes.find((mode) => mode.isDefault) ??
			spacing.modes[0]);
	if (!spacingMode) {
		throw new ValidationError(
			`${path}.spacingMode references unknown spacing mode "${requestedSpacingMode}"`
		);
	}

	for (const key of ['min', 's', 'l', 'max'] as const) {
		const value = tokens[key];
		if (value === 'min') continue;
		if (
			!Number.isInteger(value) ||
			(value as number) < 1 ||
			(value as number) > spacingMode.tokens.range
		) {
			throw new ValidationError(
				`${path}.${key} must be "min" or an integer from 1 to ${spacingMode.tokens.range} for spacing mode "${spacingMode.name}"`
			);
		}
	}
}

function validateGapPartial(
	gap: NonNullable<PartialDesignSystem['gap']>,
	spacing: NonNullable<PartialDesignSystem['spacing']>
): void {
	if (!gap.modes || !Array.isArray(gap.modes)) {
		throw new ValidationError('gap.modes must be an array');
	}

	if (gap.modes.length === 0) {
		throw new ValidationError('gap.modes must have at least one mode');
	}
	validateNamedModes(gap.modes, 'gap.modes', 'Gap');

	gap.modes.forEach((mode) => {
		if (!mode.tokens) {
			throw new ValidationError(`Gap mode "${mode.name}" must have tokens`);
		}
		validateSpacingDerivedTokens(
			mode.tokens as unknown as Record<string, unknown>,
			mode.name,
			spacing,
			`gap.modes["${mode.name}"].tokens`
		);
	});
}

function validateBorderPartial(
	border: NonNullable<PartialDesignSystem['border']>,
	spacing: PartialDesignSystem['spacing']
): void {
	// Validate radius if present
	if (border.radius) {
		if (!border.radius.modes || !Array.isArray(border.radius.modes)) {
			throw new ValidationError('border.radius.modes must be an array');
		}

		if (border.radius.modes.length === 0) {
			throw new ValidationError('border.radius.modes must have at least one mode');
		}
		validateNamedModes(border.radius.modes, 'border.radius.modes', 'Border radius');

		border.radius.modes.forEach((mode) => {
			if (!mode.tokens) {
				throw new ValidationError(`Border radius mode "${mode.name}" must have tokens`);
			}
			if (!spacing) {
				throw new ValidationError('Border radius requires spacing');
			}
			validateSpacingDerivedTokens(
				mode.tokens as unknown as Record<string, unknown>,
				mode.name,
				spacing,
				`border.radius.modes["${mode.name}"].tokens`
			);
		});
	}

	// Validate width if present
	if (border.width) {
		if (!border.width.modes || !Array.isArray(border.width.modes)) {
			throw new ValidationError('border.width.modes must be an array');
		}

		if (border.width.modes.length === 0) {
			throw new ValidationError('border.width.modes must have at least one mode');
		}
		validateNamedModes(border.width.modes, 'border.width.modes', 'Border width');

		border.width.modes.forEach((mode) => {
			if (!mode.tokens) {
				throw new ValidationError(`Border width mode "${mode.name}" must have tokens`);
			}

			const { unit, value } = mode.tokens;

			validateCssUnit(unit, `border.width.modes["${mode.name}"].tokens.unit`);
			if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
				throw new ValidationError(
					`Border width mode "${mode.name}" value must be a non-negative number`
				);
			}
		});
	}
}

function validateAlphaSchedule(schedule: AlphaSchedule, path: string): void {
	const entries = Object.entries(schedule);

	if (entries.length === 0) {
		throw new ValidationError(`${path} must have at least one alpha level`);
	}

	for (const [level, value] of entries) {
		if (!tokenNamePattern.test(level)) {
			throw new ValidationError(`${path} alpha level "${level}" is not CSS-token safe`);
		}
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			throw new ValidationError(`${path}.${level} must be a finite number`);
		}
		if (value < 0 || value > 1) {
			throw new ValidationError(`${path}.${level} must be between 0 and 1 (got ${value})`);
		}
	}
}

function validateSpacing(ds: DesignSystem): void {
	if (!ds.spacing) {
		throw new ValidationError('DesignSystem.spacing is required');
	}
	validateSpacingPartial(ds.spacing);
}

function validateGap(ds: DesignSystem): void {
	if (!ds.gap) {
		throw new ValidationError('DesignSystem.gap is required');
	}
	validateGapPartial(ds.gap, ds.spacing);
}

function validateTypography(ds: DesignSystem): void {
	if (!ds.typography) {
		throw new ValidationError('DesignSystem.typography is required');
	}
	validateTypographyPartial(ds.typography);
}

function validateBorder(ds: DesignSystem): void {
	if (!ds.border) {
		throw new ValidationError('DesignSystem.border is required');
	}

	// For full DesignSystem, both radius and width are required
	if (!ds.border.radius) {
		throw new ValidationError('DesignSystem.border.radius is required');
	}
	if (!ds.border.width) {
		throw new ValidationError('DesignSystem.border.width is required');
	}

	validateBorderPartial(ds.border, ds.spacing);
}

function validateTime(ds: DesignSystem): void {
	if (!ds.time) {
		throw new ValidationError('DesignSystem.time is required');
	}
	validateTimePartial(ds.time);
}
