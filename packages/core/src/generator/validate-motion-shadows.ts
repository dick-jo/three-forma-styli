import type { PartialDesignSystem, TimeReference } from '../types.js';
import {
	ValidationError,
	tokenNamePattern,
	validateCssUnit,
	validateFiniteNumber,
	validateNamedModes,
} from './validation-shared.js';

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

export function validateTimePartial(time: NonNullable<PartialDesignSystem['time']>): void {
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

function validateMotionValue(
	value: unknown,
	path: string,
	fallback: {
		duration?: TimeReference;
		easing?: string;
		delay?: 0 | TimeReference;
	},
	motion: NonNullable<PartialDesignSystem['motion']>,
	time: NonNullable<PartialDesignSystem['time']>,
	options: { allowZeroDuration: boolean; requireField: boolean }
): void {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new ValidationError(`${path} must be an object`);
	}
	const authored = value as Record<string, unknown>;
	const allowed = new Set(['duration', 'easing', 'delay']);
	for (const key of Object.keys(authored)) {
		if (!allowed.has(key)) throw new ValidationError(`${path} contains unknown field "${key}"`);
	}
	if (options.requireField && Object.keys(authored).length === 0) {
		throw new ValidationError(`${path} must override duration, easing, or delay`);
	}
	const duration = authored.duration ?? fallback.duration;
	const easing = authored.easing ?? fallback.easing;
	const delay = authored.delay ?? fallback.delay ?? 0;
	if (duration === undefined) throw new ValidationError(`${path}.duration is required`);
	if (typeof easing !== 'string' || !motion.easings[easing]) {
		throw new ValidationError(`${path}.easing references unknown easing "${String(easing)}"`);
	}
	validateTimeReference(
		duration as TimeReference,
		time,
		`${path}.duration`,
		options.allowZeroDuration
	);
	validateTimeReference(delay as TimeReference, time, `${path}.delay`, true);
}

export function validateMotionPartial(
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
		if (recipe.reducedMotion === undefined) {
			throw new ValidationError(
				`motion.recipes.${recipeName}.reducedMotion is required; use "preserve" for essential motion or author a reduced override`
			);
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
			validateMotionValue(variant, path, recipe.base, motion, time, {
				allowZeroDuration: false,
				requireField: false,
			});
		}

		if (recipe.reducedMotion !== 'preserve') {
			if (
				!recipe.reducedMotion ||
				typeof recipe.reducedMotion !== 'object' ||
				Array.isArray(recipe.reducedMotion)
			) {
				throw new ValidationError(
					`motion.recipes.${recipeName}.reducedMotion must be "preserve" or an object`
				);
			}
			const reducedAllowed = new Set(['base', 'variants']);
			for (const key of Object.keys(recipe.reducedMotion)) {
				if (!reducedAllowed.has(key)) {
					throw new ValidationError(
						`motion.recipes.${recipeName}.reducedMotion contains unknown field "${key}"`
					);
				}
			}
			validateMotionValue(
				recipe.reducedMotion.base,
				`motion.recipes.${recipeName}.reducedMotion.base`,
				recipe.base,
				motion,
				time,
				{ allowZeroDuration: true, requireField: true }
			);
			if (
				recipe.reducedMotion.variants !== undefined &&
				(!recipe.reducedMotion.variants ||
					typeof recipe.reducedMotion.variants !== 'object' ||
					Array.isArray(recipe.reducedMotion.variants))
			) {
				throw new ValidationError(
					`motion.recipes.${recipeName}.reducedMotion.variants must be an object`
				);
			}
			for (const [variantName, override] of Object.entries(recipe.reducedMotion.variants ?? {})) {
				if (!recipe.variants?.[variantName]) {
					throw new ValidationError(
						`motion.recipes.${recipeName}.reducedMotion.variants references unknown variant "${variantName}"`
					);
				}
				if (override === 'preserve') continue;
				validateMotionValue(
					override,
					`motion.recipes.${recipeName}.reducedMotion.variants.${variantName}`,
					recipe.base,
					motion,
					time,
					{ allowZeroDuration: true, requireField: true }
				);
			}
		}
	}
}

export function validateShadowsPartial(
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
