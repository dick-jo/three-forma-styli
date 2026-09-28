/**
 * Review-only types and helper declarations for the assembled blueprint.
 * Not public TFS exports; exact names and implementation belong to the runbook.
 */
import type { Oklch } from '@three-forma-styli/core';
// Type-only project imports so each define…() can check names from other files.
import type { axes } from '../axes.js';
import type { colors } from '../color.js';

type Axes = typeof axes;

// ---- Axes / Modes ----

export type AxisCatalogue = Readonly<
	Record<
		string,
		{
			readonly modes: readonly [string, ...string[]];
			readonly activation: { readonly attribute: string };
		}
	>
>;

/** Named mode entries supply only changes. */
export type ModeCatalogue<Axes extends AxisCatalogue, Fields> = {
	readonly [Axis in keyof Axes]?: {
		readonly [Mode in Axes[Axis]['modes'][number]]?: Fields;
	};
};

// ---- Color ----

type Polarity = 'negative' | 'positive';

export type ColorDraft<Axes extends AxisCatalogue, Tokens extends Record<string, Oklch>> = {
	readonly tokens: Tokens;
	readonly polarity?: Polarity;
	readonly groups?: Readonly<
		Record<
			string,
			| { readonly identities: readonly (keyof Tokens)[] }
			| { readonly match: { readonly prefix: string } }
		>
	>;
	readonly constraints?: {
		readonly luminance?: {
			readonly minimumLuminanceDelta: number;
			readonly backgroundColors: readonly (keyof Tokens)[];
			readonly foregroundColors: readonly (keyof Tokens)[];
		};
	};
	readonly modes?: ModeCatalogue<
		Axes,
		{ readonly tokens?: Partial<Record<keyof Tokens, Oklch>>; readonly polarity?: Polarity }
	>;
};

export type ColorIdentity<Colors> = Colors extends { readonly tokens: infer T }
	? Extract<keyof T, string>
	: never;

type AlphaValues = Readonly<Record<'min' | 'lo-x' | 'lo' | 'hi' | 'hi-x' | 'max', number>>;

/** Ordinary scale unnamed at the top (--a-*); named extras in `scales` (--a-{name}-*). */
export type AlphaDraft = {
	readonly values: AlphaValues;
	readonly scales?: Readonly<Record<string, { readonly values: AlphaValues }>>;
};

export type AlphaPosition = 'non' | keyof AlphaValues;

// ---- Spacing / Gap / Border ----

type SpacingCalibration = { readonly min: number; readonly step: number };

export type SpacingDraft<Axes extends AxisCatalogue> = SpacingCalibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Axes, Partial<SpacingCalibration>>;
};

type SpacingRange = Readonly<Record<'min' | 's' | 'l' | 'max', 'min' | number>>;

export type SpacingRangeDraft<Axes extends AxisCatalogue> = SpacingRange & {
	readonly modes?: ModeCatalogue<Axes, Partial<SpacingRange>>;
};

export type BorderDraft<Axes extends AxisCatalogue> = {
	readonly radius: SpacingRangeDraft<Axes>;
	readonly width: {
		readonly unit: string;
		readonly value: number;
		readonly modes?: ModeCatalogue<Axes, { readonly value?: number }>;
	};
};

// ---- Shadow ----

type ShadowPosition = 'min' | 'lo' | 'hi' | 'max';

type ShadowLayer<Colors> = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
	readonly color: { readonly color: ColorIdentity<Colors>; readonly alpha?: AlphaPosition };
};

type ShadowRange<Layer> = Readonly<Record<ShadowPosition, readonly [Layer, ...Layer[]]>>;

type ShadowPositions<Layer> = ShadowRange<Layer>;

/** Ordinary range unnamed at the top (--shd-*); named extras in `ranges` (--shd-{name}-*). */
export type ShadowDraft<Axes extends AxisCatalogue, Colors> = {
	readonly unit: string;
	readonly ranges?: Readonly<Record<string, ShadowRange<ShadowLayer<Colors>>>>;
	readonly modes?: ModeCatalogue<
		Axes,
		Partial<ShadowPositions<ShadowLayer<Colors>>> & {
			readonly ranges?: Readonly<Record<string, Partial<ShadowRange<ShadowLayer<Colors>>>>>;
		}
	>;
} & Partial<ShadowPositions<ShadowLayer<Colors>>>;

type LayerForColor = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
	readonly alpha?: string;
};

/** One Shadow design, copied once per Color; each copy's layers use that Color. */
export declare function shadowsForColors<
	const Colors extends readonly string[],
	const Prefix extends string,
>(input: {
	readonly prefix: Prefix;
	readonly colors: Colors;
	readonly range: ShadowRange<LayerForColor>;
}): Readonly<
	Record<
		`${Prefix}-${Colors[number]}`,
		ShadowRange<LayerForColor & { color: { color: Colors[number] } }>
	>
>;

// ---- Time / Easing ----

type TimeScale = {
	readonly unit: 'ms' | 's';
	readonly values: Readonly<Record<'min' | 'lo' | 'hi' | 'max', number>>;
};

/** Ordinary scale unnamed at the top (--t-*); named extras in `scales` (--t-{name}-*). */
export type TimeDraft = TimeScale & {
	readonly scales?: Readonly<Record<string, TimeScale>>;
};

type CubicBezierEasing = {
	readonly type: 'cubicBezier';
	readonly value: readonly [x1: number, y1: number, x2: number, y2: number];
};
type LinearPoint = readonly [input: number, output: number];
type LinearEasing = { readonly type: 'linear'; readonly value: readonly LinearPoint[] };
export type EasingValue = CubicBezierEasing | LinearEasing;

export declare function cubicBezier(
	x1: number,
	y1: number,
	x2: number,
	y2: number
): CubicBezierEasing;
export declare function linear(points?: readonly LinearPoint[]): LinearEasing;

// ---- Font size ----

type FontSizeCalibration = { readonly min: number; readonly start: number; readonly step: number };

export type FontSizeDraft<Axes extends AxisCatalogue> = FontSizeCalibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Axes, Partial<FontSizeCalibration & { readonly unit: string }>>;
};

// ---- Fonts ----

type Category = 'sans' | 'serif' | 'mono';

export type FontsDraft = Record<
	string,
	| {
			readonly files: readonly string[];
			readonly category: Category;
			readonly name?: string;
			readonly display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
	  }
	| { readonly name: string; readonly fallbacks: readonly string[]; readonly files?: never }
>;

// ---- Typography roles ----

type WeightName = 'min' | 'lo' | 'hi' | 'max';
type SizeName = 'min' | 's' | 'base' | 'l' | 'max';

type RangeWeights = {
	readonly min: number;
	readonly lo?: number;
	readonly hi?: number;
	readonly max: number;
};

type Measurements = {
	readonly fontSize: 'min' | number;
	readonly lineHeight: number;
	readonly letterSpacing: number;
};

type Sizes<Row> = { readonly base: Row } & Partial<Record<Exclude<SizeName, 'base'>, Row>>;

type RoleBase<FontName> = {
	readonly font: FontName;
	readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
	readonly styles?: readonly ('normal' | 'italic')[];
};

type ScalarRole<FontName> = RoleBase<FontName> & {
	readonly weights: number;
	readonly sizes: Sizes<Measurements & { readonly weight?: never }>;
};

type RangeRole<FontName, Weights extends RangeWeights> = RoleBase<FontName> & {
	readonly weights: Weights;
	readonly sizes: Sizes<Measurements & { readonly weight: Extract<keyof Weights, WeightName> }>;
};

type SizesOf<Role> = Role extends { readonly sizes: infer S } ? S : never;
type Row = Measurements & { readonly weight?: WeightName };

type RoleModes<Axes extends AxisCatalogue, Role> = Role extends { readonly modes: infer M }
	? {
			readonly modes: {
				readonly [A in keyof M]: A extends keyof Axes
					? {
							readonly [Mode in keyof M[A]]: Mode extends Axes[A]['modes'][number]
								? M[A][Mode] extends { readonly sizes: infer S }
									? {
											readonly sizes: {
												readonly [K in keyof S]: K extends keyof SizesOf<Role>
													? Partial<Row>
													: never;
											};
										}
									: never
								: never;
						}
					: never;
			};
		}
	: { readonly modes?: never };

type CheckRoles<Axes extends AxisCatalogue, Roles, FontName> = {
	[R in keyof Roles]: (Roles[R] extends { readonly weights: infer W }
		? W extends number
			? ScalarRole<FontName>
			: W extends RangeWeights
				? RangeRole<FontName, W>
				: never
		: never) &
		RoleModes<Axes, Roles[R]>;
};

/** Stand-in for the existing `defineTypography` identity helper. */
export declare function defineTypography<
	const Fonts extends FontsDraft,
	const Roles extends Record<string, unknown>,
>(system: {
	fonts: Fonts;
	roles: Roles & CheckRoles<Axes, Roles, Extract<keyof Fonts, string>>;
}): { fonts: Fonts; roles: Roles };

// ---- Color identity checks within the palette ----

type Names<C> = C extends { readonly tokens: infer T } ? keyof T : never;
type OnlyNames<List, C> = {
	readonly [I in keyof List]: List[I] extends Names<C> ? List[I] : never;
};

type ColorCheck<C> = {
	readonly groups?: C extends { readonly groups: infer G }
		? {
				readonly [K in keyof G]: G[K] extends { readonly identities: infer L }
					? { readonly identities: OnlyNames<L, C> }
					: G[K];
			}
		: never;
	readonly constraints?: C extends {
		readonly constraints: { readonly luminance: infer L };
	}
		? {
				readonly luminance: {
					readonly [K in keyof L]: K extends 'backgroundColors' | 'foregroundColors'
						? OnlyNames<L[K], C>
						: L[K];
				};
			}
		: never;
	readonly modes?: C extends { readonly modes: infer M }
		? {
				readonly [A in keyof M]: {
					readonly [Mode in keyof M[A]]: M[A][Mode] extends { readonly tokens: infer T }
						? Omit<M[A][Mode], 'tokens'> & {
								readonly tokens: { readonly [K in keyof T]: K extends Names<C> ? Oklch : never };
							}
						: M[A][Mode];
				};
			}
		: never;
};

/** Stand-in identity helper so names used inside the palette are checked against it. */
export declare function defineColors<
	const C extends ColorDraft<typeof axes, Record<string, Oklch>>,
>(colors: C & ColorCheck<C>): C;

// ---- One define…() per domain: identity helpers that check names ----

export declare function defineAxes<const T extends AxisCatalogue>(axes: T): T;
export declare function defineAlpha<const T extends AlphaDraft>(alpha: T): T;
export declare function defineSpacing<const T extends SpacingDraft<Axes>>(spacing: T): T;
export declare function defineGap<const T extends SpacingRangeDraft<Axes>>(gap: T): T;
export declare function defineBorder<const T extends BorderDraft<Axes>>(border: T): T;
export declare function defineShadows<const T extends ShadowDraft<Axes, typeof colors>>(
	shadows: T
): T;
export declare function defineTime<const T extends TimeDraft>(time: T): T;
export declare function defineEasings<const T extends Readonly<Record<string, EasingValue>>>(
	easings: T
): T;
export declare function defineFontSize<const T extends FontSizeDraft<Axes>>(fontSize: T): T;
export declare function defineFonts<const T extends FontsDraft>(fonts: T): T;
