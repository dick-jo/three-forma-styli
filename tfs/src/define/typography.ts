import type {
	FONT_CATEGORIES,
	FONT_STYLES,
	LO_HI_POSITIONS,
	ROLE_SIZE_POSITIONS,
	TEXT_TRANSFORMS,
} from '../const.js';
import type { Axes, ModeCatalogue, ModesCheck } from './axes.js';

// ---- Font size ----

type FontSizeCalibration = { readonly min: number; readonly start: number; readonly step: number };

/** --fs-min, then --fs-n = start + step × (n − 1) for n = 1…count. */
export type FontSizeDraft = FontSizeCalibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Partial<FontSizeCalibration & { readonly unit: string }>>;
};

export function defineFontSize<const T extends FontSizeDraft>(fontSize: T & ModesCheck<T>): T {
	return fontSize;
}

// ---- Fonts ----

/** With `files`: TFS inspects, checks, prepares and loads. Name only: TFS writes the name. */
export type FontsDraft = Record<
	string,
	| {
			readonly files: readonly string[];
			readonly category: (typeof FONT_CATEGORIES)[number];
			readonly name?: string;
			readonly display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
	  }
	| { readonly name: string; readonly fallbacks: readonly string[]; readonly files?: never }
>;

export function defineFonts<const T extends FontsDraft>(fonts: T): T {
	return fonts;
}

// ---- Roles ----

type WeightName = (typeof LO_HI_POSITIONS)[number];
type SizeName = (typeof ROLE_SIZE_POSITIONS)[number];

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
	readonly textTransform?: (typeof TEXT_TRANSFORMS)[number];
	readonly styles?: readonly (typeof FONT_STYLES)[number][];
};

/** One weight: role-wide; sizes never name it. */
type ScalarRole<FontName> = RoleBase<FontName> & {
	readonly weights: number;
	readonly sizes: Sizes<Measurements & { readonly weight?: never }>;
};

/** Several weights: every size states the one it uses. */
type RangeRole<FontName, Weights extends RangeWeights> = RoleBase<FontName> & {
	readonly weights: Weights;
	readonly sizes: Sizes<Measurements & { readonly weight: Extract<keyof Weights, WeightName> }>;
};

type SizesOf<Role> = Role extends { readonly sizes: infer S } ? S : never;
type Row = Measurements & { readonly weight?: WeightName };

/** Modes change values in existing sizes; never font, weights, styles or which sizes exist. */
type RoleModes<Role> = Role extends { readonly modes: infer M }
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

type CheckRoles<Roles, FontName> = {
	[R in keyof Roles]: (Roles[R] extends { readonly weights: infer W }
		? W extends number
			? ScalarRole<FontName>
			: W extends RangeWeights
				? RangeRole<FontName, W>
				: never
		: never) &
		RoleModes<Roles[R]>;
};

export function defineTypography<
	const Fonts extends FontsDraft,
	const Roles extends Record<string, unknown>,
>(system: {
	fonts: Fonts;
	roles: Roles & CheckRoles<Roles, Extract<keyof Fonts, string>>;
}): { fonts: Fonts; roles: Roles } {
	return system;
}
