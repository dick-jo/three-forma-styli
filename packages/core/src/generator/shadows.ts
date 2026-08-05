import type {
	BoxShadowLayer,
	ShadowColorReference,
	ShadowComposite,
	ShadowSystem,
	TextShadowLayer,
} from '../types.js';
import type {
	GeneratorConfig,
	ShadowContractLayer,
	ShadowContractComposite,
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
	compositeName: string,
	variantName: string,
	layers: readonly (BoxShadowLayer | TextShadowLayer)[],
	system: ShadowSystem,
	config: GeneratorConfig
): { token: TokenValue; contract: ShadowContractValue } {
	const namespace = config.prefixes.shadow;
	const name =
		variantName === 'base'
			? `${namespace}-${kind}-${compositeName}`
			: `${namespace}-${kind}-${compositeName}-${variantName}`;
	const resolved = layers.map((layer) => layerValue(layer, kind, system.unit, config));
	const css = resolved.map((layer) => layer.css).join(', ');

	return {
		token: {
			family: 'shadow',
			name,
			value: css,
			metadata: {
				shadowKind: kind,
				shadowComposite: compositeName,
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

function shadowComposites<Layer extends BoxShadowLayer | TextShadowLayer>(
	kind: 'box' | 'text',
	composites: Record<string, ShadowComposite<Layer>> | undefined,
	system: ShadowSystem,
	config: GeneratorConfig,
	tokens: TokenValue[]
): Record<string, ShadowContractComposite> {
	const contract: Record<string, ShadowContractComposite> = {};
	for (const [compositeName, composite] of Object.entries(composites ?? {})) {
		const base = shadowValue(kind, compositeName, 'base', composite.base, system, config);
		tokens.push(base.token);
		const variants: Record<string, ShadowContractValue> = {};
		for (const [variantName, layers] of Object.entries(composite.variants ?? {})) {
			const variant = shadowValue(kind, compositeName, variantName, layers, system, config);
			tokens.push(variant.token);
			variants[variantName] = variant.contract;
		}
		contract[compositeName] = {
			base: base.contract,
			variants,
			displayOrder: composite.displayOrder ?? ['base', ...Object.keys(variants)],
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
			box: shadowComposites('box', system.box, system, config, defaultTokens),
			text: shadowComposites('text', system.text, system, config, defaultTokens),
		},
	};
}
