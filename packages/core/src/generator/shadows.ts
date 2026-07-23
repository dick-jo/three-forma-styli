import type {
	BoxShadowLayer,
	ShadowColorReference,
	ShadowRecipe,
	ShadowSystem,
	TextShadowLayer,
} from '../types.js';
import type {
	GeneratorConfig,
	ShadowContractLayer,
	ShadowContractRecipe,
	ShadowContractValue,
	ShadowGeneratorResult,
	TokenValue,
} from './types.js';

function dimension(value: number, unit: string): string {
	return `${Object.is(value, -0) ? 0 : value}${unit}`;
}

function colorValue(
	reference: ShadowColorReference,
	config: GeneratorConfig
): ShadowContractLayer['color'] {
	const token = reference.alpha
		? `${config.prefixes.color}-${reference.color}-${config.colorFormat.alphaModifier}-${reference.alpha}`
		: `${config.prefixes.color}-${reference.color}`;
	return {
		name: reference.color,
		...(reference.alpha ? { alpha: reference.alpha } : {}),
		token,
		css: `var(--${token})`,
	};
}

function layerValue(
	layer: BoxShadowLayer | TextShadowLayer,
	kind: 'box' | 'text',
	unit: string,
	config: GeneratorConfig
): { css: string; contract: ShadowContractLayer } {
	const color = colorValue(layer.color, config);
	const spread = kind === 'box' && 'spread' in layer ? (layer.spread ?? 0) : undefined;
	const inset = kind === 'box' && 'inset' in layer ? (layer.inset ?? false) : undefined;
	const components = [
		...(inset ? ['inset'] : []),
		dimension(layer.x, unit),
		dimension(layer.y, unit),
		dimension(layer.blur, unit),
		...(spread !== undefined ? [dimension(spread, unit)] : []),
		color.css,
	];
	return {
		css: components.join(' '),
		contract: {
			x: layer.x,
			y: layer.y,
			blur: layer.blur,
			...(spread !== undefined ? { spread } : {}),
			...(inset !== undefined ? { inset } : {}),
			color,
		},
	};
}

function shadowValue(
	kind: 'box' | 'text',
	recipeName: string,
	variantName: string,
	layers: readonly (BoxShadowLayer | TextShadowLayer)[],
	system: ShadowSystem,
	config: GeneratorConfig
): { token: TokenValue; contract: ShadowContractValue } {
	const namespace = config.prefixes.shadow;
	const name =
		variantName === 'base'
			? `${namespace}-${kind}-${recipeName}`
			: `${namespace}-${kind}-${recipeName}-${variantName}`;
	const resolved = layers.map((layer) => layerValue(layer, kind, system.unit, config));
	const css = resolved.map((layer) => layer.css).join(', ');

	return {
		token: {
			family: 'shadow',
			name,
			value: css,
			metadata: {
				shadowKind: kind,
				shadowRecipe: recipeName,
				shadowVariant: variantName,
			},
		},
		contract: {
			token: name,
			css,
			layers: resolved.map((layer) => layer.contract),
		},
	};
}

function shadowRecipes<Layer extends BoxShadowLayer | TextShadowLayer>(
	kind: 'box' | 'text',
	recipes: Record<string, ShadowRecipe<Layer>> | undefined,
	system: ShadowSystem,
	config: GeneratorConfig,
	tokens: TokenValue[]
): Record<string, ShadowContractRecipe> {
	const contract: Record<string, ShadowContractRecipe> = {};
	for (const [recipeName, recipe] of Object.entries(recipes ?? {})) {
		const base = shadowValue(kind, recipeName, 'base', recipe.base, system, config);
		tokens.push(base.token);
		const variants: Record<string, ShadowContractValue> = {};
		for (const [variantName, layers] of Object.entries(recipe.variants ?? {})) {
			const variant = shadowValue(kind, recipeName, variantName, layers, system, config);
			tokens.push(variant.token);
			variants[variantName] = variant.contract;
		}
		contract[recipeName] = {
			base: base.contract,
			variants,
			displayOrder: recipe.displayOrder ?? ['base', ...Object.keys(variants)],
		};
	}
	return contract;
}

/** Generate ordered multi-layer box-shadow and text-shadow composites. */
export function generateShadowTokens(
	system: ShadowSystem,
	config: GeneratorConfig
): ShadowGeneratorResult {
	const defaultTokens: TokenValue[] = [];
	return {
		defaultTokens,
		contract: {
			namespace: config.prefixes.shadow,
			unit: system.unit,
			box: shadowRecipes('box', system.box, system, config, defaultTokens),
			text: shadowRecipes('text', system.text, system, config, defaultTokens),
		},
	};
}
