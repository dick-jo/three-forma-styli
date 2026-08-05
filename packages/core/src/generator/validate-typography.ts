import type {
	PartialDesignSystem,
	TypographyFontStyle,
	TypographyComposite,
	TypographyRole,
	TypographyRoleStyle,
} from '../types.js';
import {
	ValidationError,
	tokenNamePattern,
	validateCssUnit,
	validateNamedModes,
} from './validation-shared.js';

const openTypeTagPattern = /^[\x20-\x7e]{4}$/;

export function validateTypographyPartial(
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

function resolvedCompositeSettings(role: TypographyRole, composite: TypographyComposite) {
	const base = role.sizes.base;
	return {
		features: {
			...(role.features ?? {}),
			...(base.features ?? {}),
			...(composite.features ?? {}),
		},
		variations: {
			...(role.variations ?? {}),
			...(base.variations ?? {}),
			...(composite.variations ?? {}),
		},
		fontOpticalSizing:
			composite.fontOpticalSizing ?? base.fontOpticalSizing ?? role.fontOpticalSizing,
		fontKerning: composite.fontKerning ?? base.fontKerning ?? role.fontKerning,
		textTransform: composite.textTransform ?? base.textTransform ?? role.textTransform,
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
const typographySemanticVariantFields = new Set([
	'weight',
	'fontStyle',
	'lineHeight',
	'letterSpacing',
	'features',
	'variations',
	'fontKerning',
	'fontOpticalSizing',
	'textTransform',
]);
const typographySizeOrder = ['min', 's', 'base', 'l', 'max'] as const;
const typographyWeightOrder = ['min', 'lo', 'hi', 'max'] as const;

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

	const generatedCompositeNames = new Map<string, string>();
	const registerGeneratedCompositeName = (name: string, source: string) => {
		const previous = generatedCompositeNames.get(name);
		if (previous) {
			throw new ValidationError(
				`Typography generated name "${name}" collides between ${previous} and ${source}`
			);
		}
		generatedCompositeNames.set(name, source);
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
		const weightIdentities = Object.keys(exposedWeights);
		if (weightIdentities.length === 0) {
			throw new ValidationError(`Typography role "${roleName}" must expose at least one weight`);
		}
		const isScalarWeight = weightIdentities.length === 1 && weightIdentities[0] === 'base';
		if (
			!isScalarWeight &&
			(weightIdentities.some(
				(identity) =>
					!typographyWeightOrder.includes(identity as (typeof typographyWeightOrder)[number])
			) ||
				exposedWeights.min === undefined ||
				exposedWeights.max === undefined)
		) {
			throw new ValidationError(
				`Typography role "${roleName}" weights must be one scalar base or a sparse min / lo / hi / max range with real endpoints`
			);
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
		let previousWeight = 0;
		for (const identity of typographyWeightOrder) {
			const value = exposedWeights[identity];
			if (value === undefined) continue;
			if (value <= previousWeight) {
				throw new ValidationError(
					`Typography role "${roleName}" weights must increase through min, lo, hi, max`
				);
			}
			previousWeight = value;
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
		for (const variantName of Object.keys(role.variants ?? {})) {
			registerGeneratedCompositeName(
				`${roleName}-variant-${variantName}`,
				`role "${roleName}" categorical variant "${variantName}"`
			);
		}
		const defaultStyleSelection = styles[defaultStyle]!;

		if (!role.sizes?.base) {
			throw new ValidationError(`Typography role "${roleName}" must define size base`);
		}
		const smallestModeRange = Math.min(...typography.modes.map((mode) => mode.tokens.range));
		const composites = Object.entries(role.sizes);
		const sizeIdentities = Object.keys(role.sizes);
		if (
			sizeIdentities.some(
				(identity) =>
					!typographySizeOrder.includes(identity as (typeof typographySizeOrder)[number])
			)
		) {
			throw new ValidationError(
				`Typography role "${roleName}" sizes must use only min / s / base / l / max`
			);
		}
		if (role.sizes.s && !role.sizes.min) {
			throw new ValidationError(`Typography role "${roleName}" size s requires min`);
		}
		if (role.sizes.l && !role.sizes.max) {
			throw new ValidationError(`Typography role "${roleName}" size l requires max`);
		}
		const defaultScale = (typography.modes.find((mode) => mode.isDefault) ?? typography.modes[0])!
			.tokens;
		const sizeValue = (reference: TypographyComposite['fontSize']) =>
			reference === 'min'
				? defaultScale.min
				: reference === 1
					? defaultScale.base
					: defaultScale.base + defaultScale.increment * (reference - 1);
		let previousSize = Number.NEGATIVE_INFINITY;
		for (const identity of typographySizeOrder) {
			const composite = role.sizes[identity];
			if (!composite) continue;
			const value = sizeValue(composite.fontSize);
			if (value <= previousSize) {
				throw new ValidationError(
					`Typography role "${roleName}" sizes must strictly increase through min, s, base, l, max`
				);
			}
			previousSize = value;
		}
		registerGeneratedCompositeName(roleName, `role "${roleName}" base`);
		for (const sizeName of Object.keys(role.sizes).filter((name) => name !== 'base')) {
			registerGeneratedCompositeName(
				`${roleName}-${sizeName}`,
				`role "${roleName}" size "${sizeName}"`
			);
		}
		for (const [style, selection] of Object.entries(styles)) {
			for (const alias of selection!.weights) {
				registerGeneratedCompositeName(
					`${roleName}-style-${style}-weight-${alias}`,
					`role "${roleName}" style "${style}" weight "${alias}" helper`
				);
			}
		}
		for (const [sizeName, composite] of composites) {
			if (
				sizeName !== 'base' &&
				(!tokenNamePattern.test(sizeName) ||
					sizeName.startsWith('weight-') ||
					sizeName.startsWith('style-'))
			) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" is not safe for generated tokens and classes`
				);
			}
			if (!(composite.weight in exposedWeights)) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" weight "${composite.weight}" must be exposed by the role`
				);
			}
			if (!defaultStyleSelection.weights.includes(composite.weight)) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" weight "${composite.weight}" is unavailable for defaultStyle "${defaultStyle}"`
				);
			}
			if (
				composite.fontSize !== 'min' &&
				(!Number.isInteger(composite.fontSize) || composite.fontSize < 1)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" fontSize must be "min" or a positive integer`
				);
			}
			if (composite.fontSize !== 'min' && composite.fontSize > smallestModeRange) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" references fs-${composite.fontSize}, but a typography mode only generates through fs-${smallestModeRange}`
				);
			}
			if (!Number.isFinite(composite.lineHeight) || composite.lineHeight <= 0) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" lineHeight must be positive and finite`
				);
			}
			if (!Number.isFinite(composite.letterSpacing)) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" letterSpacing must be finite`
				);
			}

			const settings = resolvedCompositeSettings(role, composite);
			if (
				settings.fontKerning !== undefined &&
				!['auto', 'normal', 'none'].includes(settings.fontKerning)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" fontKerning must be "auto", "normal", or "none"`
				);
			}
			if (
				settings.fontOpticalSizing !== undefined &&
				!['auto', 'none'].includes(settings.fontOpticalSizing)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" fontOpticalSizing must be "auto" or "none"`
				);
			}
			if (
				settings.textTransform !== undefined &&
				!typographyTextTransforms.has(settings.textTransform)
			) {
				throw new ValidationError(
					`Typography role "${roleName}" size "${sizeName}" textTransform is unsupported`
				);
			}
			for (const [tag, value] of Object.entries(settings.features)) {
				if (
					!openTypeTagPattern.test(tag) ||
					(typeof value !== 'boolean' && (!Number.isInteger(value) || value < 0))
				) {
					throw new ValidationError(
						`Typography role "${roleName}" size "${sizeName}" contains invalid OpenType feature "${tag}"`
					);
				}
			}
			for (const [axis, value] of Object.entries(settings.variations)) {
				if (!openTypeTagPattern.test(axis) || !Number.isFinite(value)) {
					throw new ValidationError(
						`Typography role "${roleName}" size "${sizeName}" contains invalid variation axis "${axis}"`
					);
				}
				if (managedVariationAxes.has(axis)) {
					throw new ValidationError(
						`Typography role "${roleName}" size "${sizeName}" variation axis "${axis}" is managed separately or is not supported by typography roles yet`
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
									`Typography role "${roleName}" size "${sizeName}" feature "${feature}" is unavailable for ${style} weight ${weight}`
								);
							}
						}
						for (const [axis, value] of Object.entries(settings.variations)) {
							const range = face.axes?.[axis];
							if (!range || value < range.min || value > range.max) {
								throw new ValidationError(
									`Typography role "${roleName}" size "${sizeName}" variation "${axis}" (${value}) is unavailable for ${style} weight ${weight}`
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
					`Typography role "${roleName}" size "${sizeName}" cannot verify features or variations for external font "${role.font}"`
				);
			}
		}

		for (const [variantName, variant] of Object.entries(role.variants ?? {})) {
			const path = `Typography role "${roleName}" categorical variant "${variantName}"`;
			if (!tokenNamePattern.test(variantName)) {
				throw new ValidationError(`${path} is not safe for generated tokens and classes`);
			}
			if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
				throw new ValidationError(`${path} must be an object`);
			}
			if (Object.keys(variant).length === 0) {
				throw new ValidationError(`${path} must override at least one property`);
			}
			const unknownFields = Object.keys(variant).filter(
				(field) => !typographySemanticVariantFields.has(field)
			);
			if (unknownFields.length > 0) {
				throw new ValidationError(
					`${path} contains unsupported ${unknownFields.length === 1 ? 'field' : 'fields'}: ${unknownFields.join(', ')}`
				);
			}
			const weight = variant.weight ?? role.sizes.base.weight;
			const style = variant.fontStyle ?? defaultStyle;
			if (!(weight in exposedWeights)) {
				throw new ValidationError(`${path} weight "${weight}" must be exposed by the role`);
			}
			if (!styles[style]?.weights.includes(weight)) {
				throw new ValidationError(
					`${path} requests unavailable style "${style}" at weight "${weight}"`
				);
			}
			if (
				variant.lineHeight !== undefined &&
				(!Number.isFinite(variant.lineHeight) || variant.lineHeight <= 0)
			) {
				throw new ValidationError(`${path} lineHeight must be positive and finite`);
			}
			if (variant.letterSpacing !== undefined && !Number.isFinite(variant.letterSpacing)) {
				throw new ValidationError(`${path} letterSpacing must be finite`);
			}
			if (variant.textTransform && !typographyTextTransforms.has(variant.textTransform)) {
				throw new ValidationError(`${path} textTransform is unsupported`);
			}
			for (const [tag, value] of Object.entries(variant.features ?? {})) {
				if (
					!openTypeTagPattern.test(tag) ||
					(typeof value !== 'boolean' && (!Number.isInteger(value) || value < 0))
				) {
					throw new ValidationError(`${path} contains invalid OpenType feature "${tag}"`);
				}
			}
			for (const [axis, value] of Object.entries(variant.variations ?? {})) {
				if (
					!openTypeTagPattern.test(axis) ||
					!Number.isFinite(value) ||
					managedVariationAxes.has(axis)
				) {
					throw new ValidationError(`${path} contains invalid or managed variation axis "${axis}"`);
				}
			}
			if (
				font.capabilities &&
				(Object.keys(variant.features ?? {}).length > 0 ||
					Object.keys(variant.variations ?? {}).length > 0)
			) {
				const numericWeight = exposedWeights[weight];
				const face = font.capabilities.faces.find(
					(candidate) =>
						candidate.style === style && supportsTypographyWeight(candidate.weights, numericWeight)
				);
				if (!face) {
					throw new ValidationError(
						`${path} cannot validate font capabilities for ${style} weight ${numericWeight}`
					);
				}
				for (const feature of Object.keys(variant.features ?? {})) {
					if (!face.features?.includes(feature)) {
						throw new ValidationError(
							`${path} feature "${feature}" is unavailable for ${style} weight ${numericWeight}`
						);
					}
				}
				for (const [axis, value] of Object.entries(variant.variations ?? {})) {
					const range = face.axes?.[axis];
					if (!range || value < range.min || value > range.max) {
						throw new ValidationError(
							`${path} variation "${axis}" (${value}) is unavailable for ${style} weight ${numericWeight}`
						);
					}
				}
			} else if (
				!font.capabilities &&
				(Object.keys(variant.features ?? {}).length > 0 ||
					Object.keys(variant.variations ?? {}).length > 0)
			) {
				throw new ValidationError(
					`${path} cannot verify features or variations for external font "${role.font}"`
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
					`Typography role "${roleName}" modeOverrides must not redefine default mode "${modeName}"; author the base composites instead`
				);
			}
			if (!modeOverride || typeof modeOverride !== 'object' || Array.isArray(modeOverride)) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides.${modeName} must be an object`
				);
			}
			for (const key of Object.keys(modeOverride)) {
				if (key !== 'sizes') {
					throw new ValidationError(
						`Typography role "${roleName}" modeOverrides.${modeName} contains unknown field "${key}"`
					);
				}
			}

			const overrideComposites = Object.entries(modeOverride.sizes ?? {}).map(
				([sizeName, override]) => {
					const composite = role.sizes[sizeName as (typeof typographySizeOrder)[number]];
					if (!composite) {
						throw new ValidationError(
							`Typography role "${roleName}" modeOverrides.${modeName} references unknown size "${sizeName}"`
						);
					}
					return [sizeName, composite, override] as const;
				}
			);
			if (overrideComposites.length === 0) {
				throw new ValidationError(
					`Typography role "${roleName}" modeOverrides.${modeName} must override at least one size`
				);
			}

			for (const [sizeName, composite, override] of overrideComposites) {
				const path = `Typography role "${roleName}" modeOverrides.${modeName}.sizes.${sizeName}`;
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
				const resolved = { ...composite, ...override };
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
