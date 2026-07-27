import type {
	BoxShadowLayer,
	ShadowColorReference,
	ShadowRecipe,
	TextShadowLayer,
} from '../types.js';

type ShadowKind = 'box' | 'text';
type LayerFor<Kind extends ShadowKind> = Kind extends 'box' ? BoxShadowLayer : TextShadowLayer;

export interface DerivedShadowVariant<AnchorName extends string> {
	between: readonly [AnchorName, AnchorName];
	/** Position between the two anchors. Defaults to the midpoint. */
	at?: number;
	/** Required per layer when the two anchors use different semantic colors. */
	colors?: readonly ShadowColorReference[];
}

type ShadowAnchors<Kind extends ShadowKind> = Record<string, readonly LayerFor<Kind>[]> & {
	base: readonly LayerFor<Kind>[];
};

export interface DeriveShadowRangeInput<
	Kind extends ShadowKind,
	Anchors extends ShadowAnchors<Kind>,
	Derived extends Record<string, DerivedShadowVariant<Extract<keyof Anchors, string>>>,
> {
	kind: Kind;
	order: readonly Extract<keyof Anchors | keyof Derived, string>[];
	anchors: Anchors;
	derived: Derived;
}

export type DerivedShadowRange<
	Kind extends ShadowKind,
	Anchors extends ShadowAnchors<Kind>,
	Derived extends Record<string, DerivedShadowVariant<Extract<keyof Anchors, string>>>,
> = ShadowRecipe<LayerFor<Kind>> & {
	variants: Record<
		Exclude<Extract<keyof Anchors, string>, 'base'> | Extract<keyof Derived, string>,
		readonly LayerFor<Kind>[]
	>;
};

function interpolate(from: number, to: number, at: number): number {
	return Number((from + (to - from) * at).toFixed(4));
}

function colorSignature(color: ShadowColorReference): string {
	return `${color.color}\0${color.alpha ?? ''}`;
}

/** Derive geometry only; layer structure, inset state and semantic colors remain explicit. */
export function deriveShadowRange<
	const Kind extends ShadowKind,
	const Anchors extends ShadowAnchors<Kind>,
	const Derived extends Record<string, DerivedShadowVariant<Extract<keyof Anchors, string>>>,
>(
	input: DeriveShadowRangeInput<Kind, Anchors, Derived>
): DerivedShadowRange<Kind, Anchors, Derived> {
	const knownNames = new Set([...Object.keys(input.anchors), ...Object.keys(input.derived)]);
	if (!('base' in input.anchors)) throw new Error('Shadow range anchors must include base.');
	if (new Set(input.order).size !== input.order.length) {
		throw new Error('Shadow range order must not contain duplicate names.');
	}
	if (input.order.length !== knownNames.size || input.order.some((name) => !knownNames.has(name))) {
		throw new Error(
			'Shadow range order must contain every anchor and derived variant exactly once.'
		);
	}

	const variants: Record<string, readonly LayerFor<Kind>[]> = {};
	for (const name of input.order) {
		if (name === 'base') continue;
		const anchor = input.anchors[name];
		if (anchor) {
			variants[name] = anchor.map((layer) => ({ ...layer })) as LayerFor<Kind>[];
			continue;
		}
		const definition = input.derived[name];
		const [fromName, toName] = definition.between;
		const from = input.anchors[fromName];
		const to = input.anchors[toName];
		if (!from || !to) {
			throw new Error(`Shadow variant "${name}" must interpolate between declared anchors.`);
		}
		if (from.length !== to.length) {
			throw new Error(
				`Shadow variant "${name}" cannot interpolate anchors with different layer counts.`
			);
		}
		const at = definition.at ?? 0.5;
		if (!Number.isFinite(at) || at <= 0 || at >= 1) {
			throw new Error(`Shadow variant "${name}" interpolation position must be between 0 and 1.`);
		}
		if (definition.colors && definition.colors.length !== from.length) {
			throw new Error(`Shadow variant "${name}" colors must provide one value per layer.`);
		}
		variants[name] = from.map((fromLayer, index) => {
			const toLayer = to[index]!;
			const fromInset = input.kind === 'box' && 'inset' in fromLayer && Boolean(fromLayer.inset);
			const toInset = input.kind === 'box' && 'inset' in toLayer && Boolean(toLayer.inset);
			if (fromInset !== toInset) {
				throw new Error(
					`Shadow variant "${name}" cannot interpolate layer ${index} across inset state.`
				);
			}
			const explicitColor = definition.colors?.[index];
			if (!explicitColor && colorSignature(fromLayer.color) !== colorSignature(toLayer.color)) {
				throw new Error(
					`Shadow variant "${name}" cannot derive layer ${index} from different semantic colors; provide colors explicitly.`
				);
			}
			const layer = {
				x: interpolate(fromLayer.x, toLayer.x, at),
				y: interpolate(fromLayer.y, toLayer.y, at),
				blur: interpolate(fromLayer.blur, toLayer.blur, at),
				color: explicitColor ?? { ...fromLayer.color },
			};
			if (input.kind === 'text') return layer as LayerFor<Kind>;
			const fromBox = fromLayer as BoxShadowLayer;
			const toBox = toLayer as BoxShadowLayer;
			return {
				...layer,
				spread: interpolate(fromBox.spread ?? 0, toBox.spread ?? 0, at),
				...(fromInset ? { inset: true } : {}),
			} as LayerFor<Kind>;
		});
	}

	return {
		base: input.anchors.base.map((layer) => ({ ...layer })) as LayerFor<Kind>[],
		variants: variants as DerivedShadowRange<Kind, Anchors, Derived>['variants'],
		displayOrder: [...input.order],
	};
}
