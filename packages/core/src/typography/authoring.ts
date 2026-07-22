import type {
	FontSizeReference,
	FontSizeSystem,
	TypographyFont,
	TypographyRecipe,
	TypographyRole,
	TypographySettings,
	TypographySystem,
} from '../types.js';

/** Preserve literal role/variant names without adding hidden defaults or policy. */
export function defineTypography<
	const Fonts extends Record<string, TypographyFont>,
	const Roles extends Record<
		string,
		Omit<TypographyRole, 'font'> & { font: Extract<keyof Fonts, string> }
	>,
>(
	system: Omit<TypographySystem, 'fonts' | 'roles'> & { fonts: Fonts; roles: Roles }
): Omit<TypographySystem, 'fonts' | 'roles'> & { fonts: Fonts; roles: Roles };
export function defineTypography<const System extends TypographySystem & { roles?: undefined }>(
	system: System
): System;
export function defineTypography(system: TypographySystem): TypographySystem {
	return system;
}

export interface DerivedTypographyVariant<AnchorName extends string> {
	between: readonly [AnchorName, AnchorName];
	/** Position between the two anchors. Defaults to the midpoint. */
	at?: number;
	/** Required when the two anchors select different role-local weight aliases. */
	weight?: string;
	/** Required when the two anchors disagree on non-interpolable font settings. */
	settings?: TypographySettings;
}

type AnchorRecipes = Record<string, TypographyRecipe> & { base: TypographyRecipe };

export interface DeriveTypographyRangeInput<
	Anchors extends AnchorRecipes,
	Derived extends Record<string, DerivedTypographyVariant<Extract<keyof Anchors, string>>>,
> {
	scale: FontSizeSystem;
	/** Exact output order. `base` is emitted unsuffixed and is not a public variant name. */
	order: readonly Extract<keyof Anchors | keyof Derived, string>[];
	anchors: Anchors;
	derived: Derived;
}

export type DerivedTypographyRange<
	Anchors extends AnchorRecipes,
	Derived extends Record<string, DerivedTypographyVariant<Extract<keyof Anchors, string>>>,
> = {
	base: TypographyRecipe;
	variants: Record<
		Exclude<Extract<keyof Anchors, string>, 'base'> | Extract<keyof Derived, string>,
		TypographyRecipe
	>;
	displayOrder: Array<Extract<keyof Anchors | keyof Derived, string>>;
};

function fontSizeValue(reference: FontSizeReference, scale: FontSizeSystem): number {
	if (reference === 'min') return scale.min;
	return reference === 1 ? scale.base : scale.base + scale.increment * (reference - 1);
}

function nearestFontSizeReference(
	from: FontSizeReference,
	to: FontSizeReference,
	at: number,
	scale: FontSizeSystem
): FontSizeReference {
	const fromValue = fontSizeValue(from, scale);
	const toValue = fontSizeValue(to, scale);
	const target = fromValue + (toValue - fromValue) * at;
	const candidates: FontSizeReference[] = ['min'];
	for (let step = 1; step <= scale.range; step++) candidates.push(step);
	const result = candidates
		.map((reference) => ({ reference, value: fontSizeValue(reference, scale) }))
		.filter(
			({ value }) => value > Math.min(fromValue, toValue) && value < Math.max(fromValue, toValue)
		)
		.sort((left, right) => {
			const distance = Math.abs(left.value - target) - Math.abs(right.value - target);
			return distance || left.value - right.value;
		})[0];
	if (!result) {
		throw new Error(`Cannot derive a distinct font-size reference between ${from} and ${to}.`);
	}
	return result.reference;
}

function interpolate(from: number, to: number, at: number): number {
	return Number((from + (to - from) * at).toFixed(4));
}

function recipeSettings(recipe: TypographyRecipe): TypographySettings {
	return {
		...(recipe.features ? { features: { ...recipe.features } } : {}),
		...(recipe.variations ? { variations: { ...recipe.variations } } : {}),
		...(recipe.fontKerning ? { fontKerning: recipe.fontKerning } : {}),
		...(recipe.fontOpticalSizing ? { fontOpticalSizing: recipe.fontOpticalSizing } : {}),
	};
}

function settingsSignature(settings: TypographySettings): string {
	return JSON.stringify({
		features: Object.entries(settings.features ?? {}).sort(([left], [right]) =>
			left.localeCompare(right)
		),
		variations: Object.entries(settings.variations ?? {}).sort(([left], [right]) =>
			left.localeCompare(right)
		),
		fontKerning: settings.fontKerning ?? null,
		fontOpticalSizing: settings.fontOpticalSizing ?? null,
	});
}

/**
 * Derive repetitive role variants from explicit, arbitrarily named anchors.
 * The returned object is the same explicit base/variants shape accepted by core.
 */
export function deriveTypographyRange<
	const Anchors extends AnchorRecipes,
	const Derived extends Record<string, DerivedTypographyVariant<Extract<keyof Anchors, string>>>,
>(input: DeriveTypographyRangeInput<Anchors, Derived>): DerivedTypographyRange<Anchors, Derived> {
	const knownNames = new Set([...Object.keys(input.anchors), ...Object.keys(input.derived)]);
	if (!('base' in input.anchors)) throw new Error('Typography range anchors must include base.');
	if (new Set(input.order).size !== input.order.length) {
		throw new Error('Typography range order must not contain duplicate names.');
	}
	if (input.order.length !== knownNames.size || input.order.some((name) => !knownNames.has(name))) {
		throw new Error(
			'Typography range order must contain every anchor and derived variant exactly once.'
		);
	}

	const variants: Record<string, TypographyRecipe> = {};
	for (const name of input.order) {
		if (name === 'base') continue;
		const anchor = input.anchors[name];
		if (anchor) {
			variants[name] = { ...anchor };
			continue;
		}
		const definition = input.derived[name];
		const [fromName, toName] = definition.between;
		const from = input.anchors[fromName];
		const to = input.anchors[toName];
		if (!from || !to) {
			throw new Error(`Typography variant "${name}" must interpolate between declared anchors.`);
		}
		const at = definition.at ?? 0.5;
		if (!Number.isFinite(at) || at <= 0 || at >= 1) {
			throw new Error(
				`Typography variant "${name}" interpolation position must be between 0 and 1.`
			);
		}
		const fromSettings = recipeSettings(from);
		const toSettings = recipeSettings(to);
		if (
			definition.settings === undefined &&
			settingsSignature(fromSettings) !== settingsSignature(toSettings)
		) {
			throw new Error(
				`Typography variant "${name}" cannot derive non-interpolable settings from disagreeing anchors; provide settings explicitly.`
			);
		}
		const settings = definition.settings ?? fromSettings;
		if (definition.weight === undefined && from.weight !== to.weight) {
			throw new Error(
				`Typography variant "${name}" cannot derive a weight from disagreeing anchors; provide weight explicitly.`
			);
		}
		variants[name] = {
			fontSize: nearestFontSizeReference(from.fontSize, to.fontSize, at, input.scale),
			weight: definition.weight ?? from.weight,
			lineHeight: interpolate(from.lineHeight, to.lineHeight, at),
			letterSpacing: interpolate(from.letterSpacing, to.letterSpacing, at),
			...settings,
		};
	}

	return {
		base: { ...input.anchors.base },
		variants: variants as DerivedTypographyRange<Anchors, Derived>['variants'],
		displayOrder: [...input.order] as DerivedTypographyRange<Anchors, Derived>['displayOrder'],
	};
}
