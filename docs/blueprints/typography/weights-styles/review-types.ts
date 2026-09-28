// Review-only shapes for the proposed weight/style authoring. Not implemented APIs.

type WeightName = 'min' | 'lo' | 'hi' | 'max';
type SizeName = 'min' | 's' | 'base' | 'l' | 'max';
type FontStyle = 'normal' | 'italic';

type RangeWeights = {
	readonly min: number;
	readonly lo?: number;
	readonly hi?: number;
	readonly max: number;
};

type Size<Weight> = {
	readonly fontSize: 'min' | number;
	readonly lineHeight: number;
	readonly letterSpacing: number;
	readonly weight?: Weight;
};

type Sizes<Weight> = { readonly base: Size<Weight> } & Partial<
	Record<Exclude<SizeName, 'base'>, Size<Weight>>
>;

type RoleBase<FontName> = {
	readonly font: FontName;
	/** Physical styles offered; each comes in every weight the role offers. Omitted → normal. */
	readonly styles?: readonly FontStyle[];
};

/** One weight everywhere: nothing to name, nothing to choose. */
type ScalarRole<FontName> = RoleBase<FontName> & {
	readonly weights: number;
	readonly weight?: never;
	readonly sizes: Sizes<never>;
};

/** Several weights: a named default, optional per-size defaults, explicit consumer choice. */
type RangeRole<FontName, Weights extends RangeWeights> = RoleBase<FontName> & {
	readonly weights: Weights;
	readonly weight: Extract<keyof Weights, WeightName>;
	readonly sizes: Sizes<Extract<keyof Weights, WeightName>>;
};

type CheckRoles<Roles, FontName> = {
	[R in keyof Roles]: Roles[R] extends { readonly weights: infer W }
		? W extends number
			? ScalarRole<FontName>
			: W extends RangeWeights
				? RangeRole<FontName, W>
				: never
		: never;
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
