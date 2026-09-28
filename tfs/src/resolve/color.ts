import type { Oklch } from '../define/color.js';
import { ALPHA_POSITIONS } from '../define/color.js';
import type { SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { allowedKeys, checkModes, selectedEntries, type Selection } from './modes.js';
import { checkIdentity, checkIncreasing, isFiniteNumber } from './rules.js';

type AlphaInput = NonNullable<SystemInput['alpha']>;
type ColorsInput = NonNullable<SystemInput['colors']>;

export type ResolvedColors = {
	readonly tokens: Readonly<Record<string, Oklch>>;
	readonly polarity?: string;
};

const POLARITIES = ['negative', 'positive'];

// ---- Alpha (no modes) ----

function checkAlphaValues(
	issues: Issues,
	path: string,
	values: Readonly<Record<string, number>>
): void {
	const entries = ALPHA_POSITIONS.map((position) => [position, values[position]] as const);
	for (const [position, value] of entries) {
		issues.check(
			isFiniteNumber(value),
			`${path}.${position}`,
			`is required and must be a finite number`
		);
	}
	for (const key of Object.keys(values)) {
		issues.check(
			(ALPHA_POSITIONS as readonly string[]).includes(key),
			`${path}.${key}`,
			`is not an Alpha position`
		);
	}
	if (entries.some(([, value]) => !isFiniteNumber(value))) return;
	const numbers = entries as unknown as [string, number][];
	issues.check(numbers[0]![1] > 0, `${path}.min`, `must be greater than 0 (non is the fixed 0)`);
	issues.check(numbers[5]![1] < 1, `${path}.max`, `must be less than 1`);
	checkIncreasing(issues, path, numbers);
}

export function checkAlpha(issues: Issues, alpha: AlphaInput): void {
	checkAlphaValues(issues, 'alpha.values', alpha.values);
	for (const [name, scale] of Object.entries(alpha.scales ?? {})) {
		checkIdentity(issues, `alpha.scales.${name}`, name);
		checkAlphaValues(issues, `alpha.scales.${name}.values`, scale.values);
	}
}

// ---- Colours ----

function checkOklch(issues: Issues, path: string, color: Oklch): void {
	const valid =
		color?.mode === 'oklch' &&
		isFiniteNumber(color.l) &&
		color.l >= 0 &&
		color.l <= 1 &&
		isFiniteNumber(color.c) &&
		color.c >= 0 &&
		isFiniteNumber(color.h);
	issues.check(valid, path, `must be oklch(l 0–1, c ≥ 0, h finite)`);
}

/** Checks everything about colours that modes cannot change. Returns resolved groups. */
export function checkColors(
	issues: Issues,
	colors: ColorsInput,
	axes: SystemInput['axes']
): Readonly<Record<string, readonly string[]>> {
	const names = Object.keys(colors.tokens);
	issues.check(names.length > 0, 'colors.tokens', `needs at least one colour`);
	for (const name of names) checkIdentity(issues, `colors.tokens.${name}`, name);
	if (colors.polarity !== undefined) {
		issues.check(
			POLARITIES.includes(colors.polarity),
			'colors.polarity',
			`must be negative or positive`
		);
	}

	const groups: Record<string, readonly string[]> = {};
	for (const [group, definition] of Object.entries(colors.groups ?? {})) {
		const path = `colors.groups.${group}`;
		checkIdentity(issues, path, group);
		const members =
			'identities' in definition
				? [...definition.identities]
				: names.filter((name) => name.startsWith(definition.match.prefix));
		for (const member of members) {
			issues.check(names.includes(member), path, `"${member}" is not a colour`);
		}
		issues.check(members.length > 0, path, `selects no colours`);
		issues.check(new Set(members).size === members.length, path, `lists a colour twice`);
		groups[group] = members;
	}

	const rule = colors.constraints?.luminance;
	if (rule) {
		const path = 'colors.constraints.luminance';
		issues.check(
			isFiniteNumber(rule.minimumLuminanceDelta) &&
				rule.minimumLuminanceDelta > 0 &&
				rule.minimumLuminanceDelta <= 1,
			`${path}.minimumLuminanceDelta`,
			`must be greater than 0 and at most 1`
		);
		for (const list of ['backgroundColors', 'foregroundColors'] as const) {
			issues.check(rule[list].length > 0, `${path}.${list}`, `needs at least one colour`);
			for (const member of rule[list]) {
				issues.check(names.includes(member), `${path}.${list}`, `"${member}" is not a colour`);
			}
		}
	}

	checkModes(issues, 'colors', colors.modes, axes, (entry, entryPath) =>
		allowedKeys(issues, entryPath, entry, ['tokens', 'polarity']).flatMap((key) => {
			if (key === 'polarity') {
				issues.check(
					POLARITIES.includes(entry.polarity!),
					`${entryPath}.polarity`,
					`must be negative or positive`
				);
				return ['polarity'];
			}
			return Object.keys(entry.tokens ?? {}).map((name) => {
				issues.check(
					names.includes(name),
					`${entryPath}.tokens.${name}`,
					`is not in the ordinary palette`
				);
				return `tokens.${name}`;
			});
		})
	);
	return groups;
}

export function resolveColors(colors: ColorsInput, selection: Selection): ResolvedColors {
	return selectedEntries(colors.modes, selection).reduce<ResolvedColors>(
		(resolved, entry) => ({
			tokens: { ...resolved.tokens, ...entry.tokens },
			...(entry.polarity !== undefined || resolved.polarity !== undefined
				? { polarity: entry.polarity ?? resolved.polarity }
				: {}),
		}),
		{
			tokens: colors.tokens,
			...(colors.polarity !== undefined ? { polarity: colors.polarity } : {}),
		}
	);
}

export function checkResolvedColors(issues: Issues, colors: ResolvedColors, where: string): void {
	for (const [name, color] of Object.entries(colors.tokens))
		checkOklch(issues, `colors.tokens.${name}${where}`, color);
}
