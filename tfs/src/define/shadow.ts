import type { ModeCatalogue, ModesCheck, Register } from './axes.js';
import type { AlphaPosition, ColorIdentity, Oklch } from './color.js';

const SHADOW_POSITIONS = ['min', 'lo', 'hi', 'max'] as const;
type ShadowPosition = (typeof SHADOW_POSITIONS)[number];

/** The project's colours once registered; any colour name before that. */
type Colors = Register extends { readonly colors: infer C } ? C : { tokens: Record<string, Oklch> };

type LayerShape = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
};

type ShadowLayer = LayerShape & {
	readonly color: { readonly color: ColorIdentity<Colors>; readonly alpha?: AlphaPosition };
};

type ShadowRange<Layer> = Readonly<Record<ShadowPosition, readonly [Layer, ...Layer[]]>>;

/** Ordinary range unnamed at the top (--shd-*); named extras in `ranges` (--shd-{name}-*). */
export type ShadowDraft = {
	readonly unit: string;
	readonly ranges?: Readonly<Record<string, ShadowRange<ShadowLayer>>>;
	readonly modes?: ModeCatalogue<
		Partial<ShadowRange<ShadowLayer>> & {
			readonly ranges?: Readonly<Record<string, Partial<ShadowRange<ShadowLayer>>>>;
		}
	>;
} & Partial<ShadowRange<ShadowLayer>>;

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
				SHADOW_POSITIONS.map((position) => [
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
