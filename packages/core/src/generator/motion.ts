import type {
	MotionEasing,
	MotionRecipeBase,
	MotionRecipeVariant,
	ReducedMotionRecipeVariant,
	MotionSystem,
	TimeReference,
	TimeSystem,
} from '../types.js';
import type {
	GeneratorConfig,
	MotionContract,
	MotionContractTimeValue,
	MotionContractValue,
	MotionGeneratorResult,
	TokenValue,
} from './types.js';
import { getDefaultEntry } from './utils.js';

type ResolvedMotionValue = {
	duration: 0 | TimeReference;
	easing: string;
	delay: 0 | TimeReference;
};

function number(value: number): string {
	return Object.is(value, -0) ? '0' : String(value);
}

function easingCss(value: MotionEasing): string {
	return `cubic-bezier(${value.map(number).join(', ')})`;
}

function timeValue(
	reference: TimeReference,
	time: TimeSystem,
	config: GeneratorConfig
): MotionContractTimeValue {
	const defaultScale = getDefaultEntry(time.scales);
	const scaleName = typeof reference === 'object' ? reference.scale : defaultScale.name;
	const step = typeof reference === 'object' ? reference.step : reference;
	const scale = time.scales.find((candidate) => candidate.name === scaleName)!;
	const prefix =
		scale === defaultScale ? config.prefixes.time : `${config.prefixes.time}-${scale.name}`;
	const token = `${prefix}-${step}`;
	const sourceValue = step === 'min' ? scale.tokens.min : scale.tokens.base * step;
	const milliseconds = scale.tokens.unit === 's' ? sourceValue * 1000 : sourceValue;

	return {
		token,
		css: `var(--${token})`,
		milliseconds,
		seconds: milliseconds / 1000,
	};
}

function zeroTimeValue(): MotionContractTimeValue {
	return {
		token: null,
		css: '0ms',
		milliseconds: 0,
		seconds: 0,
	};
}

function resolvedValue(
	base: MotionRecipeBase,
	...overrides: Array<MotionRecipeVariant | ReducedMotionRecipeVariant | undefined>
): ResolvedMotionValue {
	let value: ResolvedMotionValue = {
		duration: base.duration,
		easing: base.easing,
		delay: base.delay ?? 0,
	};
	for (const override of overrides) {
		if (!override) continue;
		value = {
			duration: override.duration ?? value.duration,
			easing: override.easing ?? value.easing,
			delay: override.delay ?? value.delay,
		};
	}
	return value;
}

function resolveValue(
	recipeName: string,
	variantName: string,
	value: ResolvedMotionValue,
	system: MotionSystem,
	time: TimeSystem,
	config: GeneratorConfig,
	preference: 'default' | 'reduced-motion' = 'default'
): { tokens: TokenValue[]; contract: MotionContractValue } {
	const namespace = config.prefixes.motion;
	const prefix =
		variantName === 'base'
			? `${namespace}-${recipeName}`
			: `${namespace}-${recipeName}-${variantName}`;
	const duration = value.duration === 0 ? zeroTimeValue() : timeValue(value.duration, time, config);
	const delay = value.delay === 0 ? zeroTimeValue() : timeValue(value.delay, time, config);
	const easingName = value.easing;
	const easing = system.easings[easingName]!;
	const easingToken = `${namespace}-ease-${easingName}`;
	const metadata = {
		motionRecipe: recipeName,
		motionVariant: variantName,
		motionPreference: preference,
	};
	const tokens: TokenValue[] = [
		{
			family: 'motion',
			name: `${prefix}-duration`,
			value: duration.css,
			rawValue: duration.milliseconds,
			unit: 'ms',
			reference: duration.token ?? undefined,
			metadata,
		},
		{
			family: 'motion',
			name: `${prefix}-easing`,
			value: `var(--${easingToken})`,
			reference: easingToken,
			metadata,
		},
		{
			family: 'motion',
			name: `${prefix}-delay`,
			value: delay.css,
			rawValue: delay.milliseconds,
			unit: 'ms',
			reference: delay.token ?? undefined,
			metadata,
		},
		{
			family: 'motion',
			name: prefix,
			value: `var(--${prefix}-duration) var(--${prefix}-easing) var(--${prefix}-delay)`,
			metadata,
		},
	];

	return {
		tokens,
		contract: {
			token: prefix,
			duration,
			delay,
			easing: {
				name: easingName,
				token: easingToken,
				css: easingCss(easing),
				value: easing,
			},
		},
	};
}

/** Generate property-agnostic semantic motion fragments and their JS contract. */
export function generateMotionTokens(
	system: MotionSystem,
	time: TimeSystem,
	config: GeneratorConfig
): MotionGeneratorResult {
	const namespace = config.prefixes.motion;
	const defaultTokens: TokenValue[] = [];
	const reducedMotionTokens: TokenValue[] = [];
	const easings: MotionContract['easings'] = {};
	const recipes: MotionContract['recipes'] = {};

	for (const [name, value] of Object.entries(system.easings)) {
		const token = `${namespace}-ease-${name}`;
		const css = easingCss(value);
		defaultTokens.push({
			family: 'motion',
			name: token,
			value: css,
		});
		easings[name] = { token, css, value };
	}

	for (const [recipeName, recipe] of Object.entries(system.recipes)) {
		const normalBaseValue = resolvedValue(recipe.base);
		const base = resolveValue(recipeName, 'base', normalBaseValue, system, time, config);
		defaultTokens.push(...base.tokens);

		const variants: Record<string, MotionContractValue> = {};
		const normalVariantValues: Record<string, ResolvedMotionValue> = {};
		for (const [variantName, variant] of Object.entries(recipe.variants ?? {})) {
			const normalValue = resolvedValue(recipe.base, variant);
			const resolved = resolveValue(recipeName, variantName, normalValue, system, time, config);
			defaultTokens.push(...resolved.tokens);
			variants[variantName] = resolved.contract;
			normalVariantValues[variantName] = normalValue;
		}

		const reducedBaseBehavior = recipe.reducedMotion === 'preserve' ? 'preserve' : 'override';
		const reducedBaseValue =
			recipe.reducedMotion === 'preserve'
				? normalBaseValue
				: resolvedValue(recipe.base, recipe.reducedMotion.base);
		const reducedBase = resolveValue(
			recipeName,
			'base',
			reducedBaseValue,
			system,
			time,
			config,
			'reduced-motion'
		);
		if (reducedBaseBehavior === 'override') reducedMotionTokens.push(...reducedBase.tokens);

		const reducedVariants: MotionContract['recipes'][string]['reducedMotion']['variants'] = {};
		for (const [variantName, normalValue] of Object.entries(normalVariantValues)) {
			const authored =
				recipe.reducedMotion === 'preserve'
					? 'preserve'
					: recipe.reducedMotion.variants?.[variantName];
			const behavior = authored === 'preserve' ? 'preserve' : 'override';
			const reducedValue =
				authored === 'preserve'
					? normalValue
					: resolvedValue(
							recipe.base,
							recipe.variants?.[variantName],
							recipe.reducedMotion === 'preserve' ? undefined : recipe.reducedMotion.base,
							authored
						);
			const resolved = resolveValue(
				recipeName,
				variantName,
				reducedValue,
				system,
				time,
				config,
				'reduced-motion'
			);
			if (behavior === 'override') reducedMotionTokens.push(...resolved.tokens);
			reducedVariants[variantName] = { ...resolved.contract, behavior };
		}

		recipes[recipeName] = {
			base: base.contract,
			variants,
			displayOrder: recipe.displayOrder ?? ['base', ...Object.keys(variants)],
			reducedMotion: {
				base: { ...reducedBase.contract, behavior: reducedBaseBehavior },
				variants: reducedVariants,
			},
		};
	}

	return {
		defaultTokens,
		reducedMotionTokens,
		contract: { namespace, easings, recipes },
	};
}
