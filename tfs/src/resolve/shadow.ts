import { ALPHA_POSITIONS, LO_HI_POSITIONS, SHADOW_DIRECTIONS } from '../const.js';
import type { AlphaPosition } from '../define/color.js';
import type { Layer, LayerRange, SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { checkModes, selectedEntries, type Selection } from './modes.js';
import { checkIdentity, checkUnit, isFiniteNumber } from './rules.js';

type ShadowsInput = NonNullable<SystemInput['shadows']>;

const ALPHA_NAMES: readonly string[] = ['non', ...ALPHA_POSITIONS] satisfies AlphaPosition[];

type Direction = (typeof SHADOW_DIRECTIONS)[number];

/**
 * `ordinary` is the unnamed top-level range, when authored and not directional.
 * Directional sets arrive already expanded into named ranges: `down`, `up`, …
 * for the ordinary set, `{name}-down`, … for a named one.
 */
export type ResolvedShadows = {
	readonly unit: string;
	readonly ordinary?: LayerRange;
	readonly ranges: Readonly<Record<string, LayerRange>>;
	/** The sets as written (after modes), for checks that report authored paths once. */
	readonly sets: readonly { readonly path: string; readonly range: LayerRange }[];
};

/** The set's directions, when it is directional. */
function directionsOf(set: unknown): readonly string[] | undefined {
	return (set as { directions?: readonly string[] } | undefined)?.directions;
}

/** Positions only: drops `directions`. */
function positionsOf(set: Readonly<Record<string, unknown>>): LayerRange {
	return Object.fromEntries(
		LO_HI_POSITIONS.filter((p) => set[p] !== undefined).map((p) => [p, set[p]])
	) as LayerRange;
}

/** Turns a directional layer into a fixed one: `offset` along the direction, x or y across it. */
function layerFalling(layer: Layer, direction: Direction): Layer {
	const { offset = 0, x = 0, y = 0, ...rest } = layer;
	const along = direction === 'up' || direction === 'left' ? -offset || 0 : offset;
	return direction === 'down' || direction === 'up'
		? { ...rest, x, y: along }
		: { ...rest, x: along, y };
}

/** One fixed range per direction, named `{prefix}{direction}`. */
function expand(
	range: LayerRange,
	directions: readonly string[],
	prefix: string
): [string, LayerRange][] {
	return directions.map((direction) => [
		`${prefix}${direction}`,
		Object.fromEntries(
			Object.entries(range).map(([position, layers]) => [
				position,
				layers.map((layer) => layerFalling(layer, direction as Direction)),
			])
		),
	]);
}

/** Every range name the build will emit, in order, for collision checks. */
function emittedNames(shadows: ShadowsInput): string[] {
	const names = [...(directionsOf(shadows) ?? [])];
	for (const [name, range] of Object.entries(shadows.ranges ?? {})) {
		const directions = directionsOf(range);
		names.push(...(directions ? directions.map((d) => `${name}-${d}`) : [name]));
	}
	return names;
}

function checkDirections(issues: Issues, path: string, directions: unknown): void {
	if (
		!issues.check(
			Array.isArray(directions) && directions.length > 0,
			path,
			`must list at least one of ${SHADOW_DIRECTIONS.join(', ')}`
		)
	)
		return;
	(directions as unknown[]).forEach((direction, index) => {
		issues.check(
			(SHADOW_DIRECTIONS as readonly unknown[]).includes(direction),
			`${path}[${index}]`,
			`"${String(direction)}" is not a direction (${SHADOW_DIRECTIONS.join(', ')})`
		);
		issues.check(
			(directions as unknown[]).indexOf(direction) === index,
			`${path}[${index}]`,
			`"${String(direction)}" is listed twice`
		);
	});
}

/**
 * A directional set's layers give `offset`; the other axis may be set only when a
 * direction uses it (x for down/up, y for left/right). Fixed sets never give `offset`.
 */
function checkLayerKind(
	issues: Issues,
	path: string,
	positions: Readonly<Record<string, unknown>>,
	directions: readonly string[] | undefined
): void {
	const vertical = directions?.some((d) => d === 'down' || d === 'up') ?? false;
	const horizontal = directions?.some((d) => d === 'left' || d === 'right') ?? false;
	for (const position of LO_HI_POSITIONS) {
		const layers = positions[position];
		if (!Array.isArray(layers)) continue;
		(layers as Partial<Layer>[]).forEach((layer, index) => {
			const at = `${path}.${position}[${index}]`;
			if (!directions) {
				issues.check(
					layer.offset === undefined,
					`${at}.offset`,
					`needs directions on its set (or use x and y)`
				);
				return;
			}
			if (issues.check(isFiniteNumber(layer.offset), `${at}.offset`, `must be a finite number`))
				issues.check(layer.offset! >= 0, `${at}.offset`, `must be 0 or more`);
			if (layer.y !== undefined)
				issues.check(horizontal, `${at}.y`, `down/up take y from offset; use x to shift sideways`);
			if (layer.x !== undefined)
				issues.check(vertical, `${at}.x`, `left/right take x from offset; use y to shift`);
		});
	}
}

function ordinaryOf(shadows: Readonly<Record<string, unknown>>): LayerRange | undefined {
	const present = LO_HI_POSITIONS.filter((position) => shadows[position] !== undefined);
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
			['unit', 'directions', 'ranges', 'modes', ...LO_HI_POSITIONS].includes(key),
			`shadows.${key}`,
			`is not a Shadow field (unit, directions, min, lo, hi, max, ranges, modes)`
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

	const ordinaryDirections = directionsOf(shadows);
	if (shadows.directions !== undefined) {
		checkDirections(issues, 'shadows.directions', shadows.directions);
		issues.check(ordinary !== undefined, 'shadows.directions', `needs min, lo, hi and max`);
	}
	checkLayerKind(issues, 'shadows', shadows, ordinaryDirections);
	for (const [name, range] of Object.entries(ranges)) {
		const directions = directionsOf(range);
		if (directions !== undefined)
			checkDirections(issues, `shadows.ranges.${name}.directions`, directions);
		checkLayerKind(issues, `shadows.ranges.${name}`, range, directions);
	}
	const names = emittedNames(shadows);
	names.forEach((name, index) =>
		issues.check(
			names.indexOf(name) === index,
			'shadows',
			`two sets would both be named "${name}"; rename a range`
		)
	);

	checkModes(issues, 'shadows', shadows.modes, axes, (entry, path) =>
		Object.keys(entry).flatMap((key) => {
			if ((LO_HI_POSITIONS as readonly string[]).includes(key)) {
				issues.check(
					ordinary !== undefined,
					`${path}.${key}`,
					`changes an ordinary range that does not exist`
				);
				checkLayerKind(issues, path, { [key]: entry[key] }, ordinaryDirections);
				return [key];
			}
			if (key !== 'ranges') {
				issues.add(`${path}.${key}`, `cannot be changed by a mode`);
				return [];
			}
			return Object.entries(entry.ranges as Record<string, Record<string, unknown>>).flatMap(
				([name, range]) => {
					issues.check(name in ranges, `${path}.ranges.${name}`, `is not a named range`);
					issues.check(
						!('directions' in range),
						`${path}.ranges.${name}.directions`,
						`cannot be changed by a mode`
					);
					checkLayerKind(issues, `${path}.ranges.${name}`, range, directionsOf(ranges[name]));
					return Object.keys(range).map((position) => `ranges.${name}.${position}`);
				}
			);
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
	const ordinaryDirections = directionsOf(shadows);
	const expanded: [string, LayerRange][] = [];
	if (ordinary && ordinaryDirections) expanded.push(...expand(ordinary, ordinaryDirections, ''));
	for (const [name, range] of Object.entries(ranges)) {
		const directions = directionsOf(range);
		expanded.push(
			...(directions
				? expand(positionsOf(range), directions, `${name}-`)
				: [[name, range] as [string, LayerRange]])
		);
	}
	return {
		unit: shadows.unit,
		...(ordinary && !ordinaryDirections ? { ordinary } : {}),
		ranges: Object.fromEntries(expanded),
		sets: [
			...(ordinary ? [{ path: 'shadows', range: ordinary }] : []),
			...Object.entries(ranges).map(([name, range]) => ({
				path: `shadows.ranges.${name}`,
				range: positionsOf(range),
			})),
		],
	};
}

function checkLayer(issues: Issues, path: string, layer: Layer, colors: readonly string[]): void {
	// Directional layers may leave x and y out (offset is checked with the set's directions).
	const directional = layer.offset !== undefined;
	for (const field of ['x', 'y', 'blur'] as const) {
		if (directional && field !== 'blur' && layer[field] === undefined) continue;
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
	for (const position of LO_HI_POSITIONS) {
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
	for (const { path, range } of shadows.sets) checkRange(issues, `${path}${where}`, range, colors);
}
