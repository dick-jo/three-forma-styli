import { S_L_POSITIONS } from '../const.js';
import type { SpacingRef, SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { allowedKeys, checkModes, selectedEntries, type Selection } from './modes.js';
import { checkFinite, checkPositiveInteger, checkUnit } from './rules.js';

type SpacingInput = NonNullable<SystemInput['spacing']>;
type RangeInput = NonNullable<SystemInput['gap']>;
type WidthInput = NonNullable<SystemInput['border']>['width'];

export type ResolvedSpacing = {
	readonly unit: string;
	readonly count: number;
	readonly min: number;
	readonly step: number;
};
export type ResolvedRange = Readonly<Record<'min' | 's' | 'l' | 'max', SpacingRef>>;
export type ResolvedWidth = { readonly unit: string; readonly value: number };

// ---- Spacing ----

export function checkSpacing(
	issues: Issues,
	spacing: SpacingInput,
	axes: SystemInput['axes']
): void {
	checkUnit(issues, 'spacing.unit', spacing.unit);
	checkPositiveInteger(issues, 'spacing.count', spacing.count);
	checkModes(issues, 'spacing', spacing.modes, axes, (entry, path) =>
		allowedKeys(issues, path, entry, ['min', 'step'])
	);
}

export function resolveSpacing(spacing: SpacingInput, selection: Selection): ResolvedSpacing {
	const values = Object.assign(
		{ min: spacing.min, step: spacing.step },
		...selectedEntries(spacing.modes, selection)
	);
	return { unit: spacing.unit, count: spacing.count, min: values.min, step: values.step };
}

export function checkResolvedSpacing(
	issues: Issues,
	spacing: ResolvedSpacing,
	where: string
): void {
	const ok =
		checkFinite(issues, `spacing.min${where}`, spacing.min) &&
		checkFinite(issues, `spacing.step${where}`, spacing.step);
	if (!ok) return;
	issues.check(
		spacing.step > 0,
		`spacing.step${where}`,
		`must be greater than 0 (got ${spacing.step})`
	);
	issues.check(
		spacing.min >= 0 && spacing.min < spacing.step,
		`spacing.min${where}`,
		`must be at least 0 and less than step ${spacing.step} (got ${spacing.min})`
	);
}

// ---- Gap and Radius: four references into Spacing ----

export function checkRange(
	issues: Issues,
	path: string,
	range: RangeInput,
	axes: SystemInput['axes']
): void {
	for (const key of Object.keys(range)) {
		if (key === 'modes') continue;
		issues.check(
			(S_L_POSITIONS as readonly string[]).includes(key),
			`${path}.${key}`,
			`is not a position (min, s, l, max)`
		);
	}
	checkModes(issues, path, range.modes, axes, (entry, entryPath) =>
		allowedKeys(issues, entryPath, entry, S_L_POSITIONS)
	);
}

export function resolveRange(range: RangeInput, selection: Selection): ResolvedRange {
	const { modes: _modes, ...ordinary } = range;
	return Object.assign({}, ordinary, ...selectedEntries(range.modes, selection));
}

/** Each position is `'min'` or an existing Spacing number, and they strictly increase. */
export function checkResolvedRange(
	issues: Issues,
	path: string,
	range: ResolvedRange,
	spacing: ResolvedSpacing,
	where: string
): void {
	let previous = -1;
	for (const position of S_L_POSITIONS) {
		const ref = range[position];
		const index = ref === 'min' ? 0 : ref;
		const valid = ref === 'min' || (Number.isInteger(ref) && ref >= 1 && ref <= spacing.count);
		if (
			!issues.check(
				valid,
				`${path}.${position}${where}`,
				`must be 'min' or a Spacing position 1–${spacing.count} (got ${String(ref)})`
			)
		) {
			return;
		}
		issues.check(
			index > previous,
			`${path}.${position}${where}`,
			`must point past the previous position`
		);
		previous = index;
	}
}

// ---- Width ----

export function checkWidth(issues: Issues, width: WidthInput, axes: SystemInput['axes']): void {
	checkUnit(issues, 'border.width.unit', width.unit);
	checkModes(issues, 'border.width', width.modes, axes, (entry, path) =>
		allowedKeys(issues, path, entry, ['value'])
	);
}

export function resolveWidth(width: WidthInput, selection: Selection): ResolvedWidth {
	const values = Object.assign({ value: width.value }, ...selectedEntries(width.modes, selection));
	return { unit: width.unit, value: values.value };
}

export function checkResolvedWidth(issues: Issues, width: ResolvedWidth, where: string): void {
	if (checkFinite(issues, `border.width.value${where}`, width.value)) {
		issues.check(width.value >= 0, `border.width.value${where}`, `must be 0 or more`);
	}
}
