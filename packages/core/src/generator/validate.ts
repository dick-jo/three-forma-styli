/**
 * Input validation for DesignSystem and PartialDesignSystem
 *
 * Validates inputs at the generator entry point and throws helpful errors.
 */

import type {
	AlphaSchedule,
	DesignSystem,
	PartialDesignSystem,
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

	if (!hasColors && !hasSpacing && !hasGap && !hasTypography && !hasBorder && !hasTime) {
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

	// Validate each provided family
	if (hasColors) {
		validateColorsPartial(ds.colors!);
	}
	if (hasSpacing) {
		validateSpacingPartial(ds.spacing!);
	}
	if (hasGap) {
		validateGapPartial(ds.gap!);
	}
	if (hasTypography) {
		validateTypographyPartial(ds.typography!);
	}
	if (hasBorder) {
		validateBorderPartial(ds.border!);
	}
	if (hasTime) {
		validateTimePartial(ds.time!);
	}
}

function validateColorsPartial(colors: NonNullable<PartialDesignSystem['colors']>): void {
	if (!colors.modes || !Array.isArray(colors.modes)) {
		throw new ValidationError('colors.modes must be an array');
	}

	if (colors.modes.length === 0) {
		throw new ValidationError('colors.modes must have at least one mode');
	}

	colors.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Color mode at index ${index} must have a name`);
		}
		if (!mode.tokens || typeof mode.tokens !== 'object') {
			throw new ValidationError(`Color mode "${mode.name}" must have tokens`);
		}
	});

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

	spacing.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Spacing mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Spacing mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, range } = mode.tokens;

		if (!unit || typeof unit !== 'string') {
			throw new ValidationError(`Spacing mode "${mode.name}" must have a unit string`);
		}
		if (typeof base !== 'number' || base <= 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" base must be a positive number`);
		}
		if (typeof min !== 'number' || min < 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" min must be a non-negative number`);
		}
		if (typeof range !== 'number' || range < 1 || !Number.isInteger(range)) {
			throw new ValidationError(`Spacing mode "${mode.name}" range must be a positive integer`);
		}
	});
}

function validateGapPartial(gap: NonNullable<PartialDesignSystem['gap']>): void {
	if (!gap.modes || !Array.isArray(gap.modes)) {
		throw new ValidationError('gap.modes must be an array');
	}

	if (gap.modes.length === 0) {
		throw new ValidationError('gap.modes must have at least one mode');
	}

	gap.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Gap mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Gap mode "${mode.name}" must have tokens`);
		}
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

	typography.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Typography mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Typography mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, increment, range } = mode.tokens;

		if (!unit || typeof unit !== 'string') {
			throw new ValidationError(`Typography mode "${mode.name}" must have a unit string`);
		}
		if (typeof base !== 'number' || base <= 0) {
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

const tokenNamePattern = /^[a-z][a-z0-9-]*$/i;
const openTypeTagPattern = /^[\x20-\x7e]{4}$/;

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
	};
}

const managedVariationAxes = new Set(['wght', 'wdth', 'ital', 'slnt', 'opsz']);

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

		const smallestModeRange = Math.min(...typography.modes.map((mode) => mode.tokens.range));
		const recipes = [['base', role.base] as const, ...Object.entries(role.variants ?? {})];
		if (!role.base) throw new ValidationError(`Typography role "${roleName}" must define base`);
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
	}
}

function validateBorderPartial(border: NonNullable<PartialDesignSystem['border']>): void {
	// Validate radius if present
	if (border.radius) {
		if (!border.radius.modes || !Array.isArray(border.radius.modes)) {
			throw new ValidationError('border.radius.modes must be an array');
		}

		if (border.radius.modes.length === 0) {
			throw new ValidationError('border.radius.modes must have at least one mode');
		}

		border.radius.modes.forEach((mode, index) => {
			if (!mode.name) {
				throw new ValidationError(`Border radius mode at index ${index} must have a name`);
			}
			if (!mode.tokens) {
				throw new ValidationError(`Border radius mode "${mode.name}" must have tokens`);
			}
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

		border.width.modes.forEach((mode, index) => {
			if (!mode.name) {
				throw new ValidationError(`Border width mode at index ${index} must have a name`);
			}
			if (!mode.tokens) {
				throw new ValidationError(`Border width mode "${mode.name}" must have tokens`);
			}

			const { unit, value } = mode.tokens;

			if (!unit || typeof unit !== 'string') {
				throw new ValidationError(`Border width mode "${mode.name}" must have a unit string`);
			}
			if (typeof value !== 'number' || value < 0) {
				throw new ValidationError(
					`Border width mode "${mode.name}" value must be a non-negative number`
				);
			}
		});
	}
}

function validateTimePartial(time: NonNullable<PartialDesignSystem['time']>): void {
	if (!time.modes || !Array.isArray(time.modes)) {
		throw new ValidationError('time.modes must be an array');
	}

	if (time.modes.length === 0) {
		throw new ValidationError('time.modes must have at least one mode');
	}

	time.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Time mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Time mode "${mode.name}" must have tokens`);
		}

		validateTimeTokens(mode.tokens, `time.modes["${mode.name}"].tokens`);
	});
}

function validateAlphaSchedule(schedule: AlphaSchedule, path: string): void {
	const entries = Object.entries(schedule);

	if (entries.length === 0) {
		throw new ValidationError(`${path} must have at least one alpha level`);
	}

	for (const [level, value] of entries) {
		if (typeof value !== 'number') {
			throw new ValidationError(`${path}.${level} must be a number`);
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
	validateGapPartial(ds.gap);
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

	validateBorderPartial(ds.border);
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
	if (!tokens.unit || typeof tokens.unit !== 'string') {
		throw new ValidationError(`${path} must have a unit string`);
	}
	if (typeof tokens.base !== 'number' || tokens.base < 0) {
		throw new ValidationError(`${path}.base must be a non-negative number`);
	}
	if (typeof tokens.min !== 'number' || tokens.min < 0) {
		throw new ValidationError(`${path}.min must be a non-negative number`);
	}
	if (typeof tokens.range !== 'number' || tokens.range < 1 || !Number.isInteger(tokens.range)) {
		throw new ValidationError(`${path}.range must be a positive integer`);
	}
}
