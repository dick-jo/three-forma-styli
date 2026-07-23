/**
 * Input validation for DesignSystem and PartialDesignSystem
 *
 * Validates inputs at the generator entry point and throws helpful errors.
 */

import type {
	AlphaSchedule,
	DesignSystem,
	PartialDesignSystem,
	TimeReference,
	TypographyFontStyle,
	TypographyRecipe,
	TypographyRole,
	TypographyRoleStyle,
} from '../types.js';

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

const tokenNamePattern = /^[a-z][a-z0-9-]*$/i;
const cssUnitPattern = /^(?:%|[a-z][a-z0-9-]*)$/i;
const openTypeTagPattern = /^[\x20-\x7e]{4}$/;

type NamedMode = { name: string; isDefault?: boolean };

function validateNamedModes(modes: NamedMode[], path: string, label: string): void {
	const seen = new Map<string, number>();
	const defaults: string[] = [];

	for (const [index, mode] of modes.entries()) {
		if (!mode.name) {
			throw new ValidationError(`${label} mode at index ${index} must have a name`);
		}
		if (!tokenNamePattern.test(mode.name)) {
			throw new ValidationError(`${path}[${index}].name "${mode.name}" is not CSS-token safe`);
		}
		const previous = seen.get(mode.name);
		if (previous !== undefined) {
			throw new ValidationError(
				`${path} contains duplicate mode name "${mode.name}" at indexes ${previous} and ${index}`
			);
		}
		seen.set(mode.name, index);
		if (mode.isDefault === true) defaults.push(mode.name);
	}

	if (defaults.length > 1) {
		throw new ValidationError(
			`${path} must have at most one default mode; found ${defaults.map((name) => `"${name}"`).join(', ')}`
		);
	}
}

function validateCssUnit(unit: unknown, path: string): asserts unit is string {
	if (typeof unit !== 'string' || !cssUnitPattern.test(unit)) {
		throw new ValidationError(`${path} must be a CSS-safe unit such as "px", "rem", "%", or "ms"`);
	}
}

function validateFiniteNumber(value: unknown, path: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new ValidationError(`${path} must be a finite number`);
	}
}

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

	colors.modes.forEach((mode, index) => {
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

function validateTypographyPartial(
	typography: NonNullable<PartialDesignSystem['typography']>
): void {
	if (!typography.modes || !Array.isArray(typography.modes)) {
		throw new ValidationError('typography.modes must be an array');
	}

	if (typography.modes.length === 0) {
		throw new ValidationError('typography.modes must have at least one mode');
	}
	validateNamedModes(typography.modes, 'typography.modes', 'Typography');

	typography.modes.forEach((mode) => {
		if (!mode.tokens) {
			throw new ValidationError(`Typography mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, increment, range } = mode.tokens;

		validateCssUnit(unit, `typography.modes["${mode.name}"].tokens.unit`);
		if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) {
			throw new ValidationError(`Typography mode "${mode.name}" base must be a positive number`);
		}
		if (typeof min !== 'number' || !Number.isFinite(min) || min <= 0 || min >= base) {
			throw new ValidationError(
				`Typography mode "${mode.name}" min must be a positive number smaller than base`
			);
		}
		if (typeof increment !== 'number' || !Number.isFinite(increment) || increment <= 0) {
			throw new ValidationError(
				`Typography mode "${mode.name}" increment must be a positive finite number`
			);
		}
		if (typeof range !== 'number' || range < 1 || !Number.isInteger(range)) {
			throw new ValidationError(`Typography mode "${mode.name}" range must be a positive integer`);
		}
	});

	validateTypographySemanticLayer(typography);
}

function supportsTypographyWeight(
	available: number[] | { min: number; max: number },
	weight: number
): boolean {
	return Array.isArray(available)
		? available.includes(weight)
		: weight >= available.min && weight <= available.max;
}

function validateAvailableWeights(
	available: number[] | { min: number; max: number },
	path: string
): void {
	if (Array.isArray(available)) {
		if (
			available.length === 0 ||
			new Set(available).size !== available.length ||
			available.some((weight) => !Number.isInteger(weight) || weight < 1 || weight > 1000)
		) {
			throw new ValidationError(`${path} must contain unique CSS weights from 1 to 1000`);
		}
		return;
	}
	if (
		!Number.isFinite(available.min) ||
		!Number.isFinite(available.max) ||
		available.min < 1 ||
		available.max > 1000 ||
		available.min > available.max
	) {
		throw new ValidationError(`${path} must be a valid CSS weight range`);
	}
}

function typographyWeightRange(available: number[] | { min: number; max: number }) {
	return Array.isArray(available)
		? { min: Math.min(...available), max: Math.max(...available) }
		: available;
}

function describeTypographyWeights(
	faces: Array<{ weights: number[] | { min: number; max: number } }>
): string {
	return faces
		.map(({ weights }) =>
			Array.isArray(weights) ? weights.join(', ') : `${weights.min}-${weights.max}`
		)
		.join('; ');
}

function resolvedRecipeSettings(role: TypographyRole, recipe: TypographyRecipe) {
	return {
		features: {
			...(role.features ?? {}),
			...(role.base.features ?? {}),
			...(recipe.features ?? {}),
		},
		variations: {
			...(role.variations ?? {}),
			...(role.base.variations ?? {}),
			...(recipe.variations ?? {}),
		},
		fontOpticalSizing:
			recipe.fontOpticalSizing ?? role.base.fontOpticalSizing ?? role.fontOpticalSizing,
		fontKerning: recipe.fontKerning ?? role.base.fontKerning ?? role.fontKerning,
		textTransform: recipe.textTransform ?? role.base.textTransform ?? role.textTransform,
	};
}

const managedVariationAxes = new Set(['wght', 'wdth', 'ital', 'slnt', 'opsz']);
const typographyTextTransforms = new Set([
	'none',
	'capitalize',
	'uppercase',
	'lowercase',
	'full-width',
	'full-size-kana',
	'math-auto',
]);

function validateTypographySemanticLayer(
	typography: NonNullable<PartialDesignSystem['typography']>
): void {
	if (!typography.fonts && !typography.roles) return;
	if (!typography.fonts) {
		throw new ValidationError('typography.fonts is required when typography.roles is provided');
	}

	for (const [fontName, font] of Object.entries(typography.fonts)) {
		if (!tokenNamePattern.test(fontName)) {
			throw new ValidationError(`Typography font name "${fontName}" is not CSS-token safe`);
		}
		if (!font.family) {
			throw new ValidationError(`Typography font "${fontName}" must have a family`);
		}
		if (!['prepared', 'unavailable'].includes(font.verification)) {
			throw new ValidationError(
				`Typography font "${fontName}" must explicitly declare verification as "prepared" or "unavailable"`
			);
		}
		if (font.verification === 'prepared' && !font.capabilities) {
			throw new ValidationError(
				`Typography font "${fontName}" is marked prepared but has no capabilities`
			);
		}
		if (font.verification === 'unavailable' && font.capabilities) {
			throw new ValidationError(
				`Typography font "${fontName}" cannot provide capabilities while verification is unavailable`
			);
		}
		const capabilityFaces = font.capabilities?.faces ?? [];
		if (font.capabilities && capabilityFaces.length === 0) {
			throw new ValidationError(
				`Typography font "${fontName}" capabilities must contain at least one face`
			);
		}
		for (const [index, face] of capabilityFaces.entries()) {
			if (!['normal', 'italic', 'oblique'].includes(face.style)) {
				throw new ValidationError(
					`Typography font "${fontName}" capability face ${index} has an invalid style`
				);
			}
			if (
				face.obliqueAngle !== undefined &&
				(face.style !== 'oblique' ||
					!Number.isFinite(face.obliqueAngle) ||
					face.obliqueAngle <= -90 ||
					face.obliqueAngle >= 90)
			) {
				throw new ValidationError(
					`Typography font "${fontName}" capability face ${index} has an invalid oblique angle`
				);
			}
			validateAvailableWeights(
				face.weights,
				`typography.fonts.${fontName}.capabilities.faces[${index}].weights`
			);
			for (const feature of face.features ?? []) {
				if (!openTypeTagPattern.test(feature)) {
					throw new ValidationError(
						`Typography font "${fontName}" capability face ${index} contains invalid feature tag "${feature}"`
					);
				}
			}
			for (const [axis, range] of Object.entries(face.axes ?? {})) {
				if (
					!openTypeTagPattern.test(axis) ||
					!Number.isFinite(range.min) ||
					!Number.isFinite(range.max) ||
					range.min > range.max ||
					(range.default !== undefined &&
						(!Number.isFinite(range.default) ||
							range.default < range.min ||
							range.default > range.max))
				) {
					throw new ValidationError(
						`Typography font "${fontName}" capability face ${index} has invalid axis "${axis}"`
					);
				}
			}
		}
		for (let leftIndex = 0; leftIndex < capabilityFaces.length; leftIndex++) {
			for (let rightIndex = leftIndex + 1; rightIndex < capabilityFaces.length; rightIndex++) {
				const left = capabilityFaces[leftIndex];
				const right = capabilityFaces[rightIndex];
				if (left.style !== right.style) continue;
				const leftRange = typographyWeightRange(left.weights);
				const rightRange = typographyWeightRange(right.weights);
				if (leftRange.min <= rightRange.max && rightRange.min <= leftRange.max) {
					if (left.style === 'oblique' && left.obliqueAngle !== right.obliqueAngle) {
						throw new ValidationError(
							`Typography font "${fontName}" has overlapping oblique angles, which roles do not expose yet`
						);
					}
					throw new ValidationError(
						`Typography font "${fontName}" capability faces ${leftIndex} and ${rightIndex} overlap for style "${left.style}"`
					);
				}
			}
		}
	}

	const generatedRecipeNames = new Map<string, string>();
	const registerGeneratedRecipeName = (name: string, source: string) => {
		const previous = generatedRecipeNames.get(name);
		if (previous) {
			throw new ValidationError(
				`Typography generated name "${name}" collides between ${previous} and ${source}`
			);
		}
		generatedRecipeNames.set(name, source);
	};
	for (const [roleName, role] of Object.entries(typography.roles ?? {})) {
		if (!tokenNamePattern.test(roleName)) {
			throw new ValidationError(`Typography role name "${roleName}" is not CSS-token safe`);
		}
		const font = typography.fonts[role.font];
		if (!font) {
			throw new ValidationError(
				`Typography role "${roleName}" references unknown font "${role.font}"`
			);
		}

		const exposedWeights = role.weights;
		if (Object.keys(exposedWeights).length === 0) {
			throw new ValidationError(`Typography role "${roleName}" must expose at least one weight`);
		}
		for (const [alias, weight] of Object.entries(exposedWeights)) {
			if (!tokenNamePattern.test(alias)) {
				throw new ValidationError(
					`Typography role "${roleName}" weight alias "${alias}" is not CSS-token safe`
				);
			}
			if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
				throw new ValidationError(
					`Typography role "${roleName}" weight "${alias}" must be an integer from 1 to 1000`
				);
			}
		}
		const numericWeights = Object.values(exposedWeights);
		if (new Set(numericWeights).size !== numericWeights.length) {
			throw new ValidationError(
				`Typography role "${roleName}" must not expose the same numeric weight twice`
			);
		}
		if ('min' in exposedWeights && exposedWeights.min !== Math.min(...numericWeights)) {
			throw new ValidationError(
				`Typography role "${roleName}" weight min must be its actual minimum`
			);
		}
		if ('max' in exposedWeights && exposedWeights.max !== Math.max(...numericWeights)) {
			throw new ValidationError(
				`Typography role "${roleName}" weight max must be its actual maximum`
			);
		}
		const styles: Partial<Record<TypographyFontStyle, TypographyRoleStyle>> =
			role.styles ??
			({
				normal: { weights: Object.keys(exposedWeights) },
			} as const);
		if (Object.keys(styles).length === 0) {
			throw new ValidationError(`Typography role "${roleName}" must expose at least one style`);
		}
		const defaultStyle = role.defaultStyle ?? 'normal';
		if (!(defaultStyle in styles)) {
			throw new ValidationError(
				`Typography role "${roleName}" defaultStyle must be exposed by the role`
			);
		}
		for (const [style, selection] of Object.entries(styles)) {
			if (!['normal', 'italic', 'oblique'].includes(style) || !selection) {
				throw new ValidationError(
					`Typography role "${roleName}" contains an invalid style "${style}"`
				);
			}
			if (
				selection.weights.length === 0 ||
				new Set(selection.weights).size !== selection.weights.length ||
				selection.weights.some((alias) => !(alias in exposedWeights))
			) {
				throw new ValidationError(
					`Typography role "${roleName}" style "${style}" must reference unique exposed weight aliases`
				);
			}
			const faces = font.capabilities?.faces.filter((face) => face.style === style);
			if (font.capabilities && faces?.length === 0) {
				throw new ValidationError(
					`Typography role "${roleName}" requests unavailable font style "${style}"`
				);
			}
			if (!font.capabilities && style !== 'normal') {
				throw new ValidationError(
					`Typography role "${roleName}" requests unverified font style "${style}"`
				);
			}
			for (const alias of selection.weights) {
				const weight = exposedWeights[alias];
				if (faces && !faces.some((face) => supportsTypographyWeight(face.weights, weight))) {
					throw new ValidationError(
						`Typography role "${roleName}" style "${style}" weight "${alias}" (${weight}) is unavailable in font "${role.font}"; available ${style} weights: ${describeTypographyWeights(faces)}`
					);
				}
			}
		}
		const defaultStyleSelection = styles[defaultStyle]!;

		if (!role.base) throw new ValidationError(`Typography role "${roleName}" must define base`);
		const smallestModeRange = Math.min(...typography.modes.map((mode) => mode.tokens.range));
		const recipes = [['base', role.base] as const, ...Object.entries(role.variants ?? {})];
		if (role.variants && 'base' in role.variants) {
			throw new ValidationError(
				`Typography role "${roleName}" variant "base" is reserved for the unsuffixed role recipe`
			);
		}
		if (role.displayOrder) {
			const expectedNames = ['base', ...Object.keys(role.variants ?? {})];
			const actualNames = role.displayOrder;
			if (
				new Set(actualNames).size !== actualNames.length ||
				actualNames.length !== expectedNames.length ||
				expectedNames.some((name) => !actualNames.includes(name))
			) {
				throw new ValidationError(
					`Typography role "${roleName}" displayOrder must contain base and every variant exactly once`
				);
			}
		}
		registerGeneratedRecipeName(roleName, `role "${roleName}" base`);
		for (const variantName of Object.keys(role.variants ?? {})) {
			registerGeneratedRecipeName(
				`${roleName}-${variantName}`,
				`role "${roleName}" variant "${variantName}"`
			);
		}
		for (const [style, selection] of Object.entries(styles)) {
			for (const alias of selection!.weights) {
				registerGeneratedRecipeName(
					`${roleName}-style-${style}-weight-${alias}`,
					`role "${roleName}" style "${style}" weight "${alias}" helper`
				);
			}
		}
		for (const [variantName, recipe] of recipes) {
			if (
				variantName !== 'base' &&
				(!tokenNamePattern.test(variantName) ||
					variantName.startsWith('weight-') ||
					variantName.startsWith('style-'))
			) {
				throw new ValidationError(
					`Typography role "${roleName}" variant "${variantName}" is not safe for generated tokens and classes`
				);
			}
			if (!(recipe.weight in exposedWeights)) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} weight "${recipe.weight}" must be exposed by the role`
				);
			}
			if (!defaultStyleSelection.weights.includes(recipe.weight)) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} weight "${recipe.weight}" is unavailable for defaultStyle "${defaultStyle}"`
				);
			}
			if (
				recipe.fontSize !== 'min' &&
				(!Number.isInteger(recipe.fontSize) || recipe.fontSize < 1)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} fontSize must be "min" or a positive integer`
				);
			}
			if (recipe.fontSize !== 'min' && recipe.fontSize > smallestModeRange) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} references fs-${recipe.fontSize}, but a typography mode only generates through fs-${smallestModeRange}`
				);
			}
			if (!Number.isFinite(recipe.lineHeight) || recipe.lineHeight <= 0) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} lineHeight must be positive and finite`
				);
			}
			if (!Number.isFinite(recipe.letterSpacing)) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} letterSpacing must be finite`
				);
			}

			const settings = resolvedRecipeSettings(role, recipe);
			if (
				settings.fontKerning !== undefined &&
				!['auto', 'normal', 'none'].includes(settings.fontKerning)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} fontKerning must be "auto", "normal", or "none"`
				);
			}
			if (
				settings.fontOpticalSizing !== undefined &&
				!['auto', 'none'].includes(settings.fontOpticalSizing)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} fontOpticalSizing must be "auto" or "none"`
				);
			}
			if (
				settings.textTransform !== undefined &&
				!typographyTextTransforms.has(settings.textTransform)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} textTransform is unsupported`
				);
			}
			for (const [tag, value] of Object.entries(settings.features)) {
				if (
					!openTypeTagPattern.test(tag) ||
					(typeof value !== 'boolean' && (!Number.isInteger(value) || value < 0))
				) {
					throw new ValidationError(
						`Typography role "${roleName}" ${variantName} contains invalid OpenType feature "${tag}"`
					);
				}
			}
			for (const [axis, value] of Object.entries(settings.variations)) {
				if (!openTypeTagPattern.test(axis) || !Number.isFinite(value)) {
					throw new ValidationError(
						`Typography role "${roleName}" ${variantName} contains invalid variation axis "${axis}"`
					);
				}
				if (managedVariationAxes.has(axis)) {
					throw new ValidationError(
						`Typography role "${roleName}" ${variantName} variation axis "${axis}" is managed separately or is not supported by typography roles yet`
					);
				}
			}
			if (
				font.capabilities &&
				(Object.keys(settings.features).length > 0 || Object.keys(settings.variations).length > 0)
			) {
				for (const [style, selection] of Object.entries(styles)) {
					for (const alias of selection!.weights) {
						const weight = exposedWeights[alias];
						const face = font.capabilities.faces.find(
							(candidate) =>
								candidate.style === style && supportsTypographyWeight(candidate.weights, weight)
						);
						if (!face) continue;
						for (const feature of Object.keys(settings.features)) {
							if (!face.features?.includes(feature)) {
								throw new ValidationError(
									`Typography role "${roleName}" ${variantName} feature "${feature}" is unavailable for ${style} weight ${weight}`
								);
							}
						}
						for (const [axis, value] of Object.entries(settings.variations)) {
							const range = face.axes?.[axis];
							if (!range || value < range.min || value > range.max) {
								throw new ValidationError(
									`Typography role "${roleName}" ${variantName} variation "${axis}" (${value}) is unavailable for ${style} weight ${weight}`
								);
							}
						}
					}
				}
			} else if (
				!font.capabilities &&
				(Object.keys(settings.features).length > 0 || Object.keys(settings.variations).length > 0)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" ${variantName} cannot verify features or variations for external font "${role.font}"`
				);
			}
		}

		const defaultTypographyMode =
			typography.modes.find((mode) => mode.isDefault) ?? typography.modes[0];
		const allowedModeOverrideFields = new Set([
			'fontSize',
			'weight',
			'lineHeight',
			'letterSpacing',
			'textTransform',
		]);
		for (const [modeName, modeOverride] of Object.entries(role.modeOverrides ?? {})) {
			const mode = typography.modes.find((candidate) => candidate.name === modeName);
			if (!mode) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides references unknown typography mode "${modeName}"`
				);
			}
			if (mode === defaultTypographyMode) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides must not redefine default mode "${modeName}"; author the base recipes instead`
				);
			}
			if (!modeOverride || typeof modeOverride !== 'object' || Array.isArray(modeOverride)) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides.${modeName} must be an object`
				);
			}
			for (const key of Object.keys(modeOverride)) {
				if (key !== 'base' && key !== 'variants') {
					throw new ValidationError(
						`Typography role "${roleName}" modeOverrides.${modeName} contains unknown field "${key}"`
					);
				}
			}

			const overrideRecipes = [
				...(modeOverride.base ? [['base', role.base, modeOverride.base] as const] : []),
				...Object.entries(modeOverride.variants ?? {}).map(([variantName, override]) => {
					const recipe = role.variants?.[variantName];
					if (!recipe) {
						throw new ValidationError(
							`Typography role "${roleName}" modeOverrides.${modeName} references unknown variant "${variantName}"`
						);
					}
					return [variantName, recipe, override] as const;
				}),
			];
			if (overrideRecipes.length === 0) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides.${modeName} must override base or at least one variant`
				);
			}

			for (const [variantName, recipe, override] of overrideRecipes) {
				const path = `Typography role "${roleName}" modeOverrides.${modeName}.${variantName}`;
				if (!override || typeof override !== 'object' || Array.isArray(override)) {
					throw new ValidationError(`${path} must be an object`);
				}
				const overrideFields = Object.keys(override);
				if (overrideFields.length === 0) {
					throw new ValidationError(`${path} must override at least one tuple field`);
				}
				for (const field of overrideFields) {
					if (!allowedModeOverrideFields.has(field)) {
						throw new ValidationError(`${path} contains unsupported field "${field}"`);
					}
				}
				const resolved = { ...recipe, ...override };
				if (!(resolved.weight in exposedWeights)) {
					throw new ValidationError(
						`${path} weight "${resolved.weight}" must be exposed by the role`
					);
				}
				if (!defaultStyleSelection.weights.includes(resolved.weight)) {
					throw new ValidationError(
						`${path} weight "${resolved.weight}" is unavailable for defaultStyle "${defaultStyle}"`
					);
				}
				if (
					resolved.fontSize !== 'min' &&
					(!Number.isInteger(resolved.fontSize) || resolved.fontSize < 1)
				) {
					throw new ValidationError(`${path} fontSize must be "min" or a positive integer`);
				}
				if (resolved.fontSize !== 'min' && resolved.fontSize > mode.tokens.range) {
					throw new ValidationError(
						`${path} references fs-${resolved.fontSize}, but mode "${modeName}" only generates through fs-${mode.tokens.range}`
					);
				}
				if (!Number.isFinite(resolved.lineHeight) || resolved.lineHeight <= 0) {
					throw new ValidationError(`${path} lineHeight must be positive and finite`);
				}
				if (!Number.isFinite(resolved.letterSpacing)) {
					throw new ValidationError(`${path} letterSpacing must be finite`);
				}
				if (
					resolved.textTransform !== undefined &&
					!typographyTextTransforms.has(resolved.textTransform)
				) {
					throw new ValidationError(`${path} textTransform is unsupported`);
				}
			}
		}
	}
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

function validateTimePartial(time: NonNullable<PartialDesignSystem['time']>): void {
	if (!time.scales || !Array.isArray(time.scales)) {
		throw new ValidationError('time.scales must be an array');
	}

	if (time.scales.length === 0) {
		throw new ValidationError('time.scales must have at least one scale');
	}
	validateNamedModes(time.scales, 'time.scales', 'Time scale');

	time.scales.forEach((scale) => {
		if (!scale.tokens) {
			throw new ValidationError(`Time scale "${scale.name}" must have tokens`);
		}

		validateTimeTokens(scale.tokens, `time.scales["${scale.name}"].tokens`);
	});
}

function validateTimeReference(
	reference: TimeReference,
	time: NonNullable<PartialDesignSystem['time']>,
	path: string,
	allowZero: boolean
): void {
	if (reference === 0 && allowZero) return;
	const defaultScale = time.scales.find((scale) => scale.isDefault) ?? time.scales[0];
	const scaleName = typeof reference === 'object' ? reference.scale : defaultScale?.name;
	const step = typeof reference === 'object' ? reference.step : reference;
	const scale = time.scales.find((candidate) => candidate.name === scaleName);

	if (!scale) {
		throw new ValidationError(`${path} references unknown time scale "${scaleName}"`);
	}
	if (scale.tokens.unit !== 'ms' && scale.tokens.unit !== 's') {
		throw new ValidationError(
			`${path} references time scale "${scaleName}" with unit "${scale.tokens.unit}"; motion requires "ms" or "s"`
		);
	}
	if (step !== 'min' && (!Number.isInteger(step) || step < 1 || step > scale.tokens.range)) {
		throw new ValidationError(
			`${path} step must be "min" or an integer from 1 through ${scale.tokens.range}`
		);
	}
}

function validateMotionPartial(
	motion: NonNullable<PartialDesignSystem['motion']>,
	time: NonNullable<PartialDesignSystem['time']>
): void {
	if (!motion.easings || typeof motion.easings !== 'object' || Array.isArray(motion.easings)) {
		throw new ValidationError('motion.easings must be an object');
	}
	if (Object.keys(motion.easings).length === 0) {
		throw new ValidationError('motion.easings must contain at least one easing');
	}
	for (const [name, easing] of Object.entries(motion.easings)) {
		if (!tokenNamePattern.test(name)) {
			throw new ValidationError(`motion.easings name "${name}" is not CSS-token safe`);
		}
		if (!Array.isArray(easing) || easing.length !== 4 || !easing.every(Number.isFinite)) {
			throw new ValidationError(`motion.easings.${name} must be four finite Bézier values`);
		}
		if (easing[0] < 0 || easing[0] > 1 || easing[2] < 0 || easing[2] > 1) {
			throw new ValidationError(
				`motion.easings.${name} Bézier x coordinates must be between 0 and 1`
			);
		}
	}

	if (!motion.recipes || typeof motion.recipes !== 'object' || Array.isArray(motion.recipes)) {
		throw new ValidationError('motion.recipes must be an object');
	}
	if (Object.keys(motion.recipes).length === 0) {
		throw new ValidationError('motion.recipes must contain at least one recipe');
	}
	for (const [recipeName, recipe] of Object.entries(motion.recipes)) {
		if (!tokenNamePattern.test(recipeName)) {
			throw new ValidationError(`motion.recipes name "${recipeName}" is not CSS-token safe`);
		}
		if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe) || !recipe.base) {
			throw new ValidationError(`motion.recipes.${recipeName}.base is required`);
		}
		if ('base' in (recipe.variants ?? {})) {
			throw new ValidationError(
				`motion.recipes.${recipeName}.variants must not contain reserved name "base"`
			);
		}
		for (const variantName of Object.keys(recipe.variants ?? {})) {
			if (!tokenNamePattern.test(variantName)) {
				throw new ValidationError(
					`motion.recipes.${recipeName}.variants name "${variantName}" is not CSS-token safe`
				);
			}
		}
		if (recipe.displayOrder) {
			const expected = ['base', ...Object.keys(recipe.variants ?? {})].sort();
			const received = [...recipe.displayOrder].sort();
			if (
				expected.length !== received.length ||
				expected.some((name, index) => name !== received[index])
			) {
				throw new ValidationError(
					`motion.recipes.${recipeName}.displayOrder must contain base and every variant exactly once`
				);
			}
		}

		for (const [variantName, variant] of [
			['base', recipe.base] as const,
			...Object.entries(recipe.variants ?? {}),
		]) {
			const path = `motion.recipes.${recipeName}.${variantName}`;
			if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
				throw new ValidationError(`${path} must be an object`);
			}
			const allowed = new Set(['duration', 'easing', 'delay']);
			for (const key of Object.keys(variant)) {
				if (!allowed.has(key)) throw new ValidationError(`${path} contains unknown field "${key}"`);
			}
			const duration = variant.duration ?? recipe.base.duration;
			const easing = variant.easing ?? recipe.base.easing;
			const delay = variant.delay ?? recipe.base.delay ?? 0;
			if (duration === undefined) throw new ValidationError(`${path}.duration is required`);
			if (typeof easing !== 'string' || !motion.easings[easing]) {
				throw new ValidationError(`${path}.easing references unknown easing "${String(easing)}"`);
			}
			validateTimeReference(duration, time, `${path}.duration`, false);
			validateTimeReference(delay, time, `${path}.delay`, true);
		}
	}
}

function validateShadowsPartial(
	shadows: NonNullable<PartialDesignSystem['shadows']>,
	colors: NonNullable<PartialDesignSystem['colors']>
): void {
	validateCssUnit(shadows.unit, 'shadows.unit');
	if (['%', 'ms', 's', 'deg'].includes(shadows.unit)) {
		throw new ValidationError(`shadows.unit "${shadows.unit}" is not a CSS length unit`);
	}
	const box = shadows.box ?? {};
	const text = shadows.text ?? {};
	if (Object.keys(box).length === 0 && Object.keys(text).length === 0) {
		throw new ValidationError('shadows must contain at least one box or text recipe');
	}
	const defaultColorMode = colors.modes.find((mode) => mode.isDefault) ?? colors.modes[0];
	const colorNames = new Set(Object.keys(defaultColorMode?.tokens ?? {}));
	const alphaNames = new Set(
		Object.keys(defaultColorMode?.alphaSchedule ?? colors.alphaSchedule ?? {})
	);

	for (const [kind, recipes] of [['box', box] as const, ['text', text] as const]) {
		for (const [recipeName, recipe] of Object.entries(recipes)) {
			const path = `shadows.${kind}.${recipeName}`;
			if (!tokenNamePattern.test(recipeName)) {
				throw new ValidationError(`${path} name is not CSS-token safe`);
			}
			if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
				throw new ValidationError(`${path} must be an object`);
			}
			if ('base' in (recipe.variants ?? {})) {
				throw new ValidationError(`${path}.variants must not contain reserved name "base"`);
			}
			for (const variantName of Object.keys(recipe.variants ?? {})) {
				if (!tokenNamePattern.test(variantName)) {
					throw new ValidationError(`${path}.variants name "${variantName}" is not CSS-token safe`);
				}
			}
			if (recipe.displayOrder) {
				const expected = ['base', ...Object.keys(recipe.variants ?? {})].sort();
				const received = [...recipe.displayOrder].sort();
				if (
					expected.length !== received.length ||
					expected.some((name, index) => name !== received[index])
				) {
					throw new ValidationError(
						`${path}.displayOrder must contain base and every variant exactly once`
					);
				}
			}
			for (const [variantName, layers] of [
				['base', recipe.base] as const,
				...Object.entries(recipe.variants ?? {}),
			]) {
				const layerPath = `${path}.${variantName}`;
				if (!Array.isArray(layers) || layers.length === 0) {
					throw new ValidationError(`${layerPath} must contain at least one layer`);
				}
				for (const [index, layer] of layers.entries()) {
					const current = `${layerPath}[${index}]`;
					if (!layer || typeof layer !== 'object' || Array.isArray(layer)) {
						throw new ValidationError(`${current} must be an object`);
					}
					const allowed = new Set([
						'x',
						'y',
						'blur',
						'color',
						...(kind === 'box' ? ['spread', 'inset'] : []),
					]);
					for (const key of Object.keys(layer)) {
						if (!allowed.has(key)) {
							throw new ValidationError(`${current} contains unsupported field "${key}"`);
						}
					}
					for (const field of ['x', 'y', 'blur'] as const) {
						validateFiniteNumber(layer[field], `${current}.${field}`);
					}
					if (layer.blur < 0) {
						throw new ValidationError(`${current}.blur must be non-negative`);
					}
					if (kind === 'box') {
						const boxLayer = layer as (typeof box)[string]['base'][number];
						if (boxLayer.spread !== undefined) {
							validateFiniteNumber(boxLayer.spread, `${current}.spread`);
						}
						if (boxLayer.inset !== undefined && typeof boxLayer.inset !== 'boolean') {
							throw new ValidationError(`${current}.inset must be boolean`);
						}
					}
					if (!layer.color || typeof layer.color !== 'object' || Array.isArray(layer.color)) {
						throw new ValidationError(`${current}.color must reference a color token`);
					}
					if (!tokenNamePattern.test(layer.color.color)) {
						throw new ValidationError(`${current}.color.color is not CSS-token safe`);
					}
					if (!colorNames.has(layer.color.color)) {
						throw new ValidationError(
							`${current}.color references unknown default color "${layer.color.color}"`
						);
					}
					if (layer.color.alpha !== undefined && !alphaNames.has(layer.color.alpha)) {
						throw new ValidationError(
							`${current}.color references unknown alpha level "${layer.color.alpha}"`
						);
					}
				}
			}
		}
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

function validateTimeTokens(
	tokens: { unit: string; base: number; min: number; range: number },
	path: string
): void {
	validateCssUnit(tokens.unit, `${path}.unit`);
	if (typeof tokens.base !== 'number' || !Number.isFinite(tokens.base) || tokens.base < 0) {
		throw new ValidationError(`${path}.base must be a non-negative number`);
	}
	if (typeof tokens.min !== 'number' || !Number.isFinite(tokens.min) || tokens.min < 0) {
		throw new ValidationError(`${path}.min must be a non-negative number`);
	}
	if (typeof tokens.range !== 'number' || tokens.range < 1 || !Number.isInteger(tokens.range)) {
		throw new ValidationError(`${path}.range must be a positive integer`);
	}
}
