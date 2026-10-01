import { LO_HI_POSITIONS, type SHADOW_DIRECTIONS } from '../const.js';
import type { ModeCatalogue, ModesCheck, Register } from './axes.js';
import type { AlphaPosition, ColorIdentity, Oklch } from './color.js';

type ShadowPosition = (typeof LO_HI_POSITIONS)[number];

/** The project's colours once registered; any colour name before that. */
type Colors = Register extends { readonly colors: infer C } ? C : { tokens: Record<string, Oklch> };

type LayerShape = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
};

type LayerColor = {
	readonly color: { readonly color: ColorIdentity<Colors>; readonly alpha?: AlphaPosition };
};

/** Fixed: a literal screen offset. */
type FixedLayer = LayerShape & LayerColor & { readonly offset?: never };

/**
 * Directional: `offset` is how far the shadow falls, along each listed direction.
 * `x` shifts down/up shadows sideways; `y` shifts left/right ones. Default 0.
 */
type DirectionalLayer = Omit<LayerShape, 'x' | 'y'> &
	LayerColor & { readonly offset: number; readonly x?: number; readonly y?: number };

type Directions = readonly [
	(typeof SHADOW_DIRECTIONS)[number],
	...(typeof SHADOW_DIRECTIONS)[number][],
];

type ShadowRange<Layer> = Readonly<Record<ShadowPosition, readonly [Layer, ...Layer[]]>>;

/** Fixed sets have no directions; directional sets list them and emit one set per direction. */
type ShadowSet =
	| (ShadowRange<FixedLayer> & { readonly directions?: never })
	| (ShadowRange<DirectionalLayer> & { readonly directions: Directions });

type AnyLayer = FixedLayer | DirectionalLayer;

/**
 * Ordinary set unnamed at the top (--shd-*); named extras in `ranges` (--shd-{name}-*).
 * A directional set emits one set per direction: --shd-{direction}-*, --shd-{name}-{direction}-*.
 */
type ShadowDraft = {
	readonly unit: string;
	readonly ranges?: Readonly<Record<string, ShadowSet>>;
	readonly modes?: ModeCatalogue<
		Partial<ShadowRange<AnyLayer>> & {
			readonly ranges?: Readonly<Record<string, Partial<ShadowRange<AnyLayer>>>>;
		}
	>;
} & (
	| (Partial<ShadowRange<FixedLayer>> & { readonly directions?: never })
	| (ShadowRange<DirectionalLayer> & { readonly directions: Directions })
);

export function defineShadows<const T extends ShadowDraft>(shadows: T & ModesCheck<T>): T {
	return shadows;
}

type LayerForColor = LayerShape & { readonly alpha?: AlphaPosition };
type LayerWithColor<C extends string> = LayerShape & {
	readonly color: { readonly color: C; readonly alpha?: AlphaPosition };
};

/** One Shadow design, copied once per Color: `{prefix}-{color}`, each layer using that Color. */
export function shadowsForColors<
	const Colors extends readonly string[],
	const Prefix extends string,
>(input: {
	readonly prefix: Prefix;
	readonly colors: Colors;
	readonly range: ShadowRange<LayerForColor>;
}): Readonly<Record<`${Prefix}-${Colors[number]}`, ShadowRange<LayerWithColor<Colors[number]>>>> {
	return Object.fromEntries(
		input.colors.map((color) => [
			`${input.prefix}-${color}`,
			Object.fromEntries(
				LO_HI_POSITIONS.map((position) => [
					position,
					input.range[position].map(({ alpha, ...layer }) => ({
						...layer,
						color: alpha === undefined ? { color } : { color, alpha },
					})),
				])
			),
		])
	) as never;
}
