import type {
	FontSizeReference,
	FontSizeSystem,
	TypographyFont,
	TypographyFontStyle,
	TypographyComposite,
	TypographyRole,
	TypographySemanticVariant,
	TypographySettings,
	TypographySystem,
	TypographyWeightIdentity,
} from '../types.js';

export interface AuthoredTypographySize {
	fontSize: FontSizeReference;
	lineHeight: number;
	/** Unitless em value; zero is emitted without a unit. */
	letterSpacing: number;
	/** Optional role-local override; otherwise the role default applies. */
	weight?: TypographyWeightIdentity;
}

type AuthoredLowerSizes =
	| { min?: never; s?: never }
	| { min: AuthoredTypographySize; s?: never }
	| { min: AuthoredTypographySize; s: AuthoredTypographySize };

type AuthoredUpperSizes =
	| { l?: never; max?: never }
	| { l?: never; max: AuthoredTypographySize }
	| { l: AuthoredTypographySize; max: AuthoredTypographySize };

export type AuthoredTypographySizes = {
	base: AuthoredTypographySize;
} & AuthoredLowerSizes &
	AuthoredUpperSizes;

export interface DerivedTypographySize {
	between: readonly [keyof AuthoredTypographySizes, keyof AuthoredTypographySizes];
	at?: number;
	weight?: TypographyWeightIdentity;
}

export interface DeriveTypographySizesInput {
	scale: FontSizeSystem;
	anchors: Partial<Record<keyof AuthoredTypographySizes, AuthoredTypographySize>> & {
		base: AuthoredTypographySize;
	};
	derived?: Partial<Record<Exclude<keyof AuthoredTypographySizes, 'base'>, DerivedTypographySize>>;
}

export type AuthoredTypographyWeights =
	| number
	| {
			min: number;
			lo?: number;
			hi?: number;
			max: number;
	  };

export interface AuthoredTypographyRole extends TypographySettings {
	font: string;
	weights: AuthoredTypographyWeights;
	/** Required for a multi-weight range; omitted for a scalar weight. */
	weight?: TypographyWeightIdentity;
	sizes: AuthoredTypographySizes;
	variants?: Record<string, TypographySemanticVariant>;
	styles?: Partial<Record<TypographyFontStyle, { weights: TypographyWeightIdentity[] }>>;
	defaultStyle?: TypographyFontStyle;
	modeOverrides?: Record<
		string,
		{
			sizes?: Partial<
				Record<
					keyof AuthoredTypographySizes,
					Partial<
						Pick<AuthoredTypographySize, 'fontSize' | 'lineHeight' | 'letterSpacing' | 'weight'>
					>
				>
			>;
		}
	>;
}

export interface AuthoredTypographySystem {
	modes: TypographySystem['modes'];
	fonts: Record<string, TypographyFont>;
	roles: Record<string, AuthoredTypographyRole>;
}

const sizeOrder = ['min', 's', 'base', 'l', 'max'] as const;
const weightOrder = ['min', 'lo', 'hi', 'max'] as const;
const variantFields = new Set([
	'weight',
	'fontStyle',
	'lineHeight',
	'letterSpacing',
	'features',
	'variations',
	'fontKerning',
	'fontOpticalSizing',
	'textTransform',
]);

function validateAuthoredRole(
	roleName: string,
	role: AuthoredTypographyRole,
	scale: FontSizeSystem
): void {
	const sizeNames = Object.keys(role.sizes);
	if (sizeNames.some((name) => !sizeOrder.includes(name as (typeof sizeOrder)[number]))) {
		throw new Error(`Typography role "${roleName}" contains an unsupported size identity.`);
	}
	if (role.sizes.s && !role.sizes.min) {
		throw new Error(`Typography role "${roleName}" size s requires min.`);
	}
	if (role.sizes.l && !role.sizes.max) {
		throw new Error(`Typography role "${roleName}" size l requires max.`);
	}
	for (const [variantName, variant] of Object.entries(role.variants ?? {})) {
		const unknownFields = Object.keys(variant).filter((field) => !variantFields.has(field));
		if (unknownFields.length > 0) {
			throw new Error(
				`Typography role "${roleName}" categorical variant "${variantName}" contains unsupported ${unknownFields.length === 1 ? 'field' : 'fields'}: ${unknownFields.join(', ')}.`
			);
		}
	}
	let previous = Number.NEGATIVE_INFINITY;
	for (const sizeName of sizeOrder) {
		const size = role.sizes[sizeName];
		if (!size) continue;
		const value = fontSizeValue(size.fontSize, scale);
		if (value <= previous) {
			throw new Error(
				`Typography role "${roleName}" sizes must strictly increase through min, s, base, l, max.`
			);
		}
		previous = value;
	}
	if (typeof role.weights === 'number') {
		if (!Number.isInteger(role.weights) || role.weights < 1 || role.weights > 1000) {
			throw new Error(
				`Typography role "${roleName}" scalar weight must be an integer from 1 to 1000.`
			);
		}
		if (role.weight !== undefined) {
			throw new Error(`Typography role "${roleName}" scalar weight must not select an alias.`);
		}
		return;
	}
	const entries = Object.entries(role.weights);
	if (entries.some(([name]) => !weightOrder.includes(name as TypographyWeightIdentity))) {
		throw new Error(`Typography role "${roleName}" contains an unsupported weight identity.`);
	}
	if (entries.length < 2 || role.weights.min === undefined || role.weights.max === undefined) {
		throw new Error(
			`Typography role "${roleName}" multi-weight range must include its actual min and max.`
		);
	}
	let previousWeight = 0;
	for (const weightName of weightOrder) {
		const value = role.weights[weightName];
		if (value === undefined) continue;
		if (!Number.isInteger(value) || value <= previousWeight || value > 1000) {
			throw new Error(
				`Typography role "${roleName}" weights must be unique increasing integers from 1 to 1000.`
			);
		}
		previousWeight = value;
	}
	if (!role.weight || role.weights[role.weight] === undefined) {
		throw new Error(`Typography role "${roleName}" must select an exposed default weight.`);
	}
}

/**
 * Author the v0.5 typography grammar and resolve it to core's normalized model.
 * `base` remains unsuffixed; sizes and categorical variants stay distinct.
 */
export function defineTypography<
	const Fonts extends Record<string, TypographyFont>,
	const Roles extends Record<
		string,
		Omit<AuthoredTypographyRole, 'font'> & { font: Extract<keyof Fonts, string> }
	>,
>(
	system: Omit<AuthoredTypographySystem, 'fonts' | 'roles'> & { fonts: Fonts; roles: Roles }
): TypographySystem & { fonts: Fonts; roles: Record<keyof Roles, TypographyRole> };
export function defineTypography<const System extends TypographySystem & { roles?: undefined }>(
	system: System
): System;
export function defineTypography(
	system: AuthoredTypographySystem | (TypographySystem & { roles?: undefined })
): TypographySystem {
	if (!system.roles) return system;
	const scale = (system.modes.find((mode) => mode.isDefault) ?? system.modes[0])?.tokens;
	if (!scale) throw new Error('Typography requires one atomic font-size mode.');
	const roles = Object.fromEntries(
		Object.entries(system.roles).map(([roleName, authored]) => {
			validateAuthoredRole(roleName, authored, scale);
			const weights =
				typeof authored.weights === 'number' ? { base: authored.weights } : authored.weights;
			const defaultWeight = typeof authored.weights === 'number' ? 'base' : authored.weight;
			if (!defaultWeight) {
				throw new Error(`Typography role "${roleName}" must select its default weight.`);
			}
			const composite = (size: AuthoredTypographySize): TypographyComposite => ({
				...size,
				weight: size.weight ?? defaultWeight,
			});
			const modeOverrides = Object.fromEntries(
				Object.entries(authored.modeOverrides ?? {}).map(([mode, override]) => [
					mode,
					{
						sizes: { ...(override.sizes ?? {}) },
					},
				])
			);
			const {
				font,
				weights: _weights,
				weight: _weight,
				sizes,
				variants,
				styles,
				defaultStyle,
				modeOverrides: _ignored,
				...settings
			} = authored;
			return [
				roleName,
				{
					...settings,
					font,
					weights,
					sizes: Object.fromEntries(
						sizeOrder.filter((size) => sizes[size]).map((size) => [size, composite(sizes[size]!)])
					) as TypographyRole['sizes'],
					variants,
					styles,
					defaultStyle,
					modeOverrides,
				} satisfies TypographyRole,
			];
		})
	);
	return { modes: system.modes, fonts: system.fonts, roles };
}

/** Derive selected fixed range positions while keeping the resolved composites inspectable. */
export function deriveTypographySizes(input: DeriveTypographySizesInput): AuthoredTypographySizes {
	if (!input.anchors.base) {
		throw new Error('Typography size derivation requires a base anchor.');
	}
	for (const name of Object.keys(input.derived ?? {})) {
		if (input.anchors[name as keyof AuthoredTypographySizes]) {
			throw new Error(`Typography size "${name}" cannot be both an anchor and a derived size.`);
		}
	}
	const known = { ...input.anchors, ...(input.derived ?? {}) };
	const sizes: Partial<Record<keyof AuthoredTypographySizes, AuthoredTypographySize>> = {};
	for (const name of sizeOrder) {
		const anchor = input.anchors[name];
		if (anchor) {
			sizes[name] = { ...anchor };
			continue;
		}
		const definition = name === 'base' ? undefined : input.derived?.[name];
		if (!definition) continue;
		const [fromName, toName] = definition.between;
		const from = input.anchors[fromName];
		const to = input.anchors[toName];
		if (!from || !to) {
			throw new Error(`Typography size "${name}" must interpolate between declared anchors.`);
		}
		const at = definition.at ?? 0.5;
		if (!Number.isFinite(at) || at <= 0 || at >= 1) {
			throw new Error(`Typography size "${name}" interpolation position must be between 0 and 1.`);
		}
		if (definition.weight === undefined && from.weight !== to.weight) {
			throw new Error(
				`Typography size "${name}" cannot derive a weight from disagreeing anchors; provide weight explicitly.`
			);
		}
		sizes[name] = {
			fontSize: nearestFontSizeReference(from.fontSize, to.fontSize, at, input.scale),
			lineHeight: interpolate(from.lineHeight, to.lineHeight, at),
			letterSpacing: interpolate(from.letterSpacing, to.letterSpacing, at),
			...((definition.weight ?? from.weight) ? { weight: definition.weight ?? from.weight } : {}),
		};
	}
	for (const name of Object.keys(known)) {
		if (!sizeOrder.includes(name as (typeof sizeOrder)[number])) {
			throw new Error(`Typography size "${name}" is outside the fixed min, s, base, l, max range.`);
		}
	}
	return sizes as AuthoredTypographySizes;
}

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
