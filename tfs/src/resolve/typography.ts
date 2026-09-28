import {
	FONT_CATEGORIES,
	FONT_STYLES,
	LO_HI_POSITIONS,
	ROLE_SIZE_POSITIONS,
	TEXT_TRANSFORMS,
} from '../const.js';
import type { FontInput, RoleInput, SizeRow, SpacingRef, SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { allowedKeys, checkModes, selectedEntries, type Selection } from './modes.js';
import {
	checkFinite,
	checkIdentity,
	checkPositiveInteger,
	checkUnit,
	isFiniteNumber,
} from './rules.js';

type FontSizeInput = NonNullable<SystemInput['fontSize']>;

const FONT_EXTENSIONS = /\.(woff2|woff|ttf|otf)$/i;

export type ResolvedFontSize = {
	readonly unit: string;
	readonly count: number;
	readonly min: number;
	readonly start: number;
	readonly step: number;
};
export type ResolvedRoleSizes = Readonly<Record<string, Readonly<Record<string, SizeRow>>>>;

/** The value of a Font size position: `'min'` or n = start + step × (n − 1). */
export function fontSizeValue(fontSize: ResolvedFontSize, ref: SpacingRef): number {
	return ref === 'min' ? fontSize.min : fontSize.start + fontSize.step * (ref - 1);
}

// ---- Font size ----

export function checkFontSize(
	issues: Issues,
	fontSize: FontSizeInput,
	axes: SystemInput['axes']
): void {
	checkPositiveInteger(issues, 'fontSize.count', fontSize.count);
	checkModes(issues, 'fontSize', fontSize.modes, axes, (entry, path) =>
		allowedKeys(issues, path, entry, ['unit', 'min', 'start', 'step'])
	);
}

export function resolveFontSize(fontSize: FontSizeInput, selection: Selection): ResolvedFontSize {
	const { modes: _modes, ...ordinary } = fontSize;
	return Object.assign({}, ordinary, ...selectedEntries(fontSize.modes, selection));
}

export function checkResolvedFontSize(
	issues: Issues,
	fontSize: ResolvedFontSize,
	where: string
): void {
	checkUnit(issues, `fontSize.unit${where}`, fontSize.unit);
	const fields = (['min', 'start', 'step'] as const).every((field) =>
		checkFinite(issues, `fontSize.${field}${where}`, fontSize[field])
	);
	if (!fields) return;
	issues.check(
		fontSize.min > 0 && fontSize.min < fontSize.start,
		`fontSize.min${where}`,
		`must be greater than 0 and less than start ${fontSize.start} (got ${fontSize.min})`
	);
	issues.check(
		fontSize.step > 0,
		`fontSize.step${where}`,
		`must be greater than 0 (got ${fontSize.step})`
	);
}

// ---- Fonts ----

export function checkFonts(issues: Issues, fonts: Readonly<Record<string, FontInput>>): void {
	for (const [name, font] of Object.entries(fonts)) {
		const path = `typography.fonts.${name}`;
		checkIdentity(issues, path, name);
		if (font.files !== undefined) {
			issues.check(font.files.length > 0, `${path}.files`, `needs at least one font file`);
			for (const file of font.files) {
				issues.check(
					FONT_EXTENSIONS.test(file),
					`${path}.files`,
					`"${file}" must be .woff2, .woff, .ttf or .otf`
				);
			}
			issues.check(
				(FONT_CATEGORIES as readonly string[]).includes(font.category),
				`${path}.category`,
				`must be sans, serif or mono`
			);
		} else {
			issues.check(
				typeof font.name === 'string' && font.name.length > 0,
				`${path}.name`,
				`is required when there are no files`
			);
		}
	}
}

// ---- Roles ----

function weightNames(role: RoleInput): readonly string[] {
	return typeof role.weights === 'number' ? [] : Object.keys(role.weights);
}

function checkRoleStructure(
	issues: Issues,
	name: string,
	role: RoleInput,
	fonts: readonly string[],
	axes: SystemInput['axes']
): void {
	const path = `typography.roles.${name}`;
	checkIdentity(issues, path, name);
	issues.check(fonts.includes(role.font), `${path}.font`, `"${role.font}" is not a declared font`);
	if (role.textTransform !== undefined) {
		issues.check(
			(TEXT_TRANSFORMS as readonly string[]).includes(role.textTransform),
			`${path}.textTransform`,
			`must be one of ${TEXT_TRANSFORMS.join(', ')}`
		);
	}
	const styles = role.styles ?? ['normal'];
	issues.check(
		styles.length > 0 &&
			styles.every((style) => (FONT_STYLES as readonly string[]).includes(style)),
		`${path}.styles`,
		`must list normal and/or italic`
	);
	issues.check(new Set(styles).size === styles.length, `${path}.styles`, `lists a style twice`);

	if (typeof role.weights === 'number') {
		issues.check(
			Number.isInteger(role.weights) && role.weights >= 1 && role.weights <= 1000,
			`${path}.weights`,
			`must be a whole number 1–1000`
		);
	} else {
		const weights = role.weights;
		const entries = LO_HI_POSITIONS.flatMap((position) =>
			weights[position] === undefined ? [] : [[position, weights[position]!] as const]
		);
		for (const key of Object.keys(weights)) {
			issues.check(
				(LO_HI_POSITIONS as readonly string[]).includes(key),
				`${path}.weights.${key}`,
				`is not a weight position (min, lo, hi, max)`
			);
		}
		issues.check(
			'min' in role.weights && 'max' in role.weights,
			`${path}.weights`,
			`needs min and max`
		);
		let previous = 0;
		for (const [position, weight] of entries) {
			issues.check(
				Number.isInteger(weight) && weight > previous && weight <= 1000,
				`${path}.weights.${position}`,
				`must be a whole number up to 1000, above the previous weight`
			);
			previous = weight;
		}
	}

	const sizes = Object.keys(role.sizes);
	for (const size of sizes) {
		issues.check(
			(ROLE_SIZE_POSITIONS as readonly string[]).includes(size),
			`${path}.sizes.${size}`,
			`is not a size position (min, s, base, l, max)`
		);
	}
	issues.check(sizes.includes('base'), `${path}.sizes`, `needs base`);
	issues.check(
		!sizes.includes('s') || sizes.includes('min'),
		`${path}.sizes.s`,
		`needs min as well`
	);
	issues.check(
		!sizes.includes('l') || sizes.includes('max'),
		`${path}.sizes.l`,
		`needs max as well`
	);

	checkModes(issues, path, role.modes, axes, (entry, entryPath) =>
		allowedKeys(issues, entryPath, entry, ['sizes']).flatMap(() =>
			Object.entries(entry.sizes ?? {}).flatMap(([size, row]) => {
				if (
					!issues.check(
						sizes.includes(size),
						`${entryPath}.sizes.${size}`,
						`is not a size of this role`
					)
				)
					return [];
				return allowedKeys(issues, `${entryPath}.sizes.${size}`, row, [
					'fontSize',
					'weight',
					'lineHeight',
					'letterSpacing',
				]).map((field) => `sizes.${size}.${field}`);
			})
		)
	);
}

export function checkRoles(
	issues: Issues,
	roles: Readonly<Record<string, RoleInput>>,
	fonts: readonly string[],
	axes: SystemInput['axes']
): void {
	for (const [name, role] of Object.entries(roles))
		checkRoleStructure(issues, name, role, fonts, axes);
}

export function resolveRoleSizes(
	roles: Readonly<Record<string, RoleInput>>,
	selection: Selection
): ResolvedRoleSizes {
	return Object.fromEntries(
		Object.entries(roles).map(([name, role]) => {
			const sizes: Record<string, SizeRow> = { ...role.sizes };
			for (const entry of selectedEntries(role.modes, selection)) {
				for (const [size, row] of Object.entries(entry.sizes ?? {})) {
					if (sizes[size]) sizes[size] = { ...sizes[size], ...row };
				}
			}
			return [name, sizes];
		})
	);
}

/** Each row: valid Font size position, the right kind of weight, sane measurements; sizes grow. */
export function checkResolvedRoles(
	issues: Issues,
	roles: Readonly<Record<string, RoleInput>>,
	resolved: ResolvedRoleSizes,
	fontSize: ResolvedFontSize,
	where: string
): void {
	for (const [name, role] of Object.entries(roles)) {
		const weights = weightNames(role);
		const rows = ROLE_SIZE_POSITIONS.flatMap((size) =>
			resolved[name]?.[size] ? [[size, resolved[name]![size]!] as const] : []
		);
		let previous: readonly [string, number] | undefined;
		for (const [size, row] of rows) {
			const path = `typography.roles.${name}.sizes.${size}`;
			const ref = row.fontSize;
			const validRef =
				ref === 'min' || (Number.isInteger(ref) && ref >= 1 && ref <= fontSize.count);
			issues.check(
				validRef,
				`${path}.fontSize${where}`,
				`must be 'min' or a Font size position 1–${fontSize.count} (got ${String(ref)})`
			);
			if (typeof role.weights === 'number') {
				issues.check(
					row.weight === undefined,
					`${path}.weight${where}`,
					`must be omitted; the role has one weight`
				);
			} else {
				issues.check(
					row.weight !== undefined && weights.includes(row.weight),
					`${path}.weight${where}`,
					`must be one of ${weights.join(', ')}`
				);
			}
			issues.check(
				isFiniteNumber(row.lineHeight) && row.lineHeight > 0,
				`${path}.lineHeight${where}`,
				`must be greater than 0`
			);
			checkFinite(issues, `${path}.letterSpacing${where}`, row.letterSpacing);
			if (validRef) {
				const value = fontSizeValue(fontSize, ref);
				if (previous) {
					issues.check(
						value > previous[1],
						`${path}.fontSize${where}`,
						`must be larger than ${previous[0]}`
					);
				}
				previous = [size, value];
			}
		}
	}
}
