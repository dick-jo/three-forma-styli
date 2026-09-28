import type { AlphaPosition } from '../define/color.js';
import { ALPHA_POSITIONS } from '../define/color.js';
import type { Layer, LayerRange, SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { checkModes, selectedEntries, type Selection } from './modes.js';
import { checkIdentity, checkUnit, isFiniteNumber } from './rules.js';

type ShadowsInput = NonNullable<SystemInput['shadows']>;

export const SHADOW_POSITIONS = ['min', 'lo', 'hi', 'max'] as const;
const ALPHA_NAMES: readonly string[] = ['non', ...ALPHA_POSITIONS] satisfies AlphaPosition[];

/** `ordinary` is the unnamed top-level range, when authored. */
export type ResolvedShadows = {
	readonly unit: string;
	readonly ordinary?: LayerRange;
	readonly ranges: Readonly<Record<string, LayerRange>>;
};

function ordinaryOf(shadows: Readonly<Record<string, unknown>>): LayerRange | undefined {
	const present = SHADOW_POSITIONS.filter((position) => shadows[position] !== undefined);
	return present.length === 0
		? undefined
		: (Object.fromEntries(present.map((p) => [p, shadows[p]])) as LayerRange);
}

export function checkShadows(
	issues: Issues,
	shadows: ShadowsInput,
	axes: SystemInput['axes']
): void {
	checkUnit(issues, 'shadows.unit', shadows.unit);
	for (const key of Object.keys(shadows)) {
		issues.check(
			['unit', 'ranges', 'modes', ...SHADOW_POSITIONS].includes(key),
			`shadows.${key}`,
			`is not a Shadow field (unit, min, lo, hi, max, ranges, modes)`
		);
	}
	const ordinary = ordinaryOf(shadows);
	const ranges = shadows.ranges ?? {};
	issues.check(
		ordinary !== undefined || Object.keys(ranges).length > 0,
		'shadows',
		`needs an ordinary range or at least one named range`
	);
	for (const name of Object.keys(ranges)) checkIdentity(issues, `shadows.ranges.${name}`, name);

	checkModes(issues, 'shadows', shadows.modes, axes, (entry, path) =>
		Object.keys(entry).flatMap((key) => {
			if ((SHADOW_POSITIONS as readonly string[]).includes(key)) {
				issues.check(
					ordinary !== undefined,
					`${path}.${key}`,
					`changes an ordinary range that does not exist`
				);
				return [key];
			}
			if (key !== 'ranges') {
				issues.add(`${path}.${key}`, `cannot be changed by a mode`);
				return [];
			}
			return Object.entries(entry.ranges as Record<string, object>).flatMap(([name, range]) => {
				issues.check(name in ranges, `${path}.ranges.${name}`, `is not a named range`);
				return Object.keys(range).map((position) => `ranges.${name}.${position}`);
			});
		})
	);
}

export function resolveShadows(shadows: ShadowsInput, selection: Selection): ResolvedShadows {
	let ordinary = ordinaryOf(shadows);
	let ranges: Record<string, LayerRange> = { ...(shadows.ranges ?? {}) };
	for (const entry of selectedEntries(shadows.modes, selection)) {
		const changed = ordinaryOf(entry);
		if (changed && ordinary) ordinary = { ...ordinary, ...changed };
		for (const [name, range] of Object.entries(
			(entry.ranges ?? {}) as Record<string, LayerRange>
		)) {
			ranges = { ...ranges, [name]: { ...ranges[name], ...range } };
		}
	}
	return { unit: shadows.unit, ...(ordinary ? { ordinary } : {}), ranges };
}

function checkLayer(issues: Issues, path: string, layer: Layer, colors: readonly string[]): void {
	for (const field of ['x', 'y', 'blur'] as const) {
		issues.check(isFiniteNumber(layer[field]), `${path}.${field}`, `must be a finite number`);
	}
	issues.check(!(layer.blur < 0), `${path}.blur`, `must be 0 or more`);
	if (layer.spread !== undefined)
		issues.check(isFiniteNumber(layer.spread), `${path}.spread`, `must be a finite number`);
	issues.check(
		colors.includes(layer.color?.color),
		`${path}.color`,
		`"${layer.color?.color}" is not a colour`
	);
	if (layer.color?.alpha !== undefined) {
		issues.check(
			ALPHA_NAMES.includes(layer.color.alpha),
			`${path}.color.alpha`,
			`"${layer.color.alpha}" is not an Alpha position`
		);
	}
}

function checkRange(
	issues: Issues,
	path: string,
	range: LayerRange,
	colors: readonly string[]
): void {
	for (const position of SHADOW_POSITIONS) {
		const layers = range[position];
		if (
			!issues.check(
				Array.isArray(layers) && layers.length > 0,
				`${path}.${position}`,
				`needs at least one layer`
			)
		)
			continue;
		layers.forEach((layer, index) =>
			checkLayer(issues, `${path}.${position}[${index}]`, layer, colors)
		);
	}
}

export function checkResolvedShadows(
	issues: Issues,
	shadows: ResolvedShadows,
	colors: readonly string[],
	where: string
): void {
	if (shadows.ordinary) checkRange(issues, `shadows${where}`, shadows.ordinary, colors);
	for (const [name, range] of Object.entries(shadows.ranges)) {
		checkRange(issues, `shadows.ranges.${name}${where}`, range, colors);
	}
}
