// Review-only shapes for the proposed weight/style authoring. Not implemented APIs.
import type { axes } from '../../axes/separate-files/axes.js';

type WeightName = 'min' | 'lo' | 'hi' | 'max';
type SizeName = 'min' | 's' | 'base' | 'l' | 'max';
type FontStyle = 'normal' | 'italic';

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

type Sizes<Size> = { readonly base: Size } & Partial<Record<Exclude<SizeName, 'base'>, Size>>;

type RoleBase<FontName> = {
	readonly font: FontName;
	/** Role-wide: same for every size. */
	readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
	/** Physical styles offered; each comes in every weight the role offers. Omitted → normal. */
	readonly styles?: readonly FontStyle[];
};

/** One weight: role-wide, like textTransform. Sizes do not mention it. */
type ScalarRole<FontName> = RoleBase<FontName> & {
	readonly weights: number;
	readonly sizes: Sizes<Measurements & { readonly weight?: never }>;
};

/** Several weights: every size states which one it uses. No role-level fallback. */
type RangeRole<FontName, Weights extends RangeWeights> = RoleBase<FontName> & {
	readonly weights: Weights;
	readonly sizes: Sizes<Measurements & { readonly weight: Extract<keyof Weights, WeightName> }>;
};

type Axes = typeof axes;
type Row = Measurements & { readonly weight?: WeightName };

/**
 * Modes change values in existing sizes; never font, weights, styles or which sizes exist.
 * Keys are checked against the authored role so unknown modes/sizes are rejected.
 */
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

type SizesOf<Role> = Role extends { readonly sizes: infer S } ? S : never;

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

export type FontsDraft = Record<
	string,
	{ readonly sources: readonly string[]; readonly category: 'sans' | 'serif' | 'mono' }
>;

/** Stand-in for the existing `defineTypography` identity helper. */
export declare function defineTypography<
	const Fonts extends FontsDraft,
	const Roles extends Record<string, unknown>,
>(system: {
	fonts: Fonts;
	roles: Roles & CheckRoles<Roles, Extract<keyof Fonts, string>>;
}): { fonts: Fonts; roles: Roles };

// ---- Consumer selection derived from the authored roles ----

type StylesOf<Role> = Role extends { readonly styles: readonly (infer S)[] } ? S : 'normal';
type WeightOf<Role> = Role extends { readonly weights: infer W }
	? W extends number
		? never
		: Extract<keyof W, WeightName>
	: never;

export type TypographySelection<Roles> = {
	[R in keyof Roles]: {
		role: R;
		size?: Roles[R] extends { readonly sizes: infer S } ? keyof S : never;
		fontStyle?: StylesOf<Roles[R]>;
	} & ([WeightOf<Roles[R]>] extends [never] ? { weight?: never } : { weight?: WeightOf<Roles[R]> });
}[keyof Roles];
