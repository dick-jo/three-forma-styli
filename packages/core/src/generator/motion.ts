import type {
	MotionEasing,
	MotionRecipeBase,
	MotionRecipeVariant,
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

function resolveValue(
	recipeName: string,
	variantName: string,
	base: MotionRecipeBase,
	override: MotionRecipeVariant | undefined,
	system: MotionSystem,
	time: TimeSystem,
	config: GeneratorConfig
): { tokens: TokenValue[]; contract: MotionContractValue } {
	const namespace = config.prefixes.motion;
	const prefix =
		variantName === 'base'
			? `${namespace}-${recipeName}`
			: `${namespace}-${recipeName}-${variantName}`;
	const duration = timeValue(override?.duration ?? base.duration, time, config);
	const delayReference = override?.delay ?? base.delay ?? 0;
	const delay = delayReference === 0 ? zeroTimeValue() : timeValue(delayReference, time, config);
	const easingName = override?.easing ?? base.easing;
	const easing = system.easings[easingName]!;
	const easingToken = `${namespace}-ease-${easingName}`;
	const metadata = { motionRecipe: recipeName, motionVariant: variantName };
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
		const base = resolveValue(recipeName, 'base', recipe.base, undefined, system, time, config);
		defaultTokens.push(...base.tokens);

		const variants: Record<string, MotionContractValue> = {};
		for (const [variantName, variant] of Object.entries(recipe.variants ?? {})) {
			const resolved = resolveValue(
				recipeName,
				variantName,
				recipe.base,
				variant,
				system,
				time,
				config
			);
			defaultTokens.push(...resolved.tokens);
			variants[variantName] = resolved.contract;
		}

		recipes[recipeName] = {
			base: base.contract,
			variants,
			displayOrder: recipe.displayOrder ?? ['base', ...Object.keys(variants)],
		};
	}

	return {
		defaultTokens,
		contract: { namespace, easings, recipes },
	};
}
