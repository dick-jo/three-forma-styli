import type { Issues } from './issues.js';
import type { Modes, SystemInput } from './input.js';

/** Which mode, if any, is selected on each axis. */
export type Selection = Readonly<Record<string, string | undefined>>;

/** One mode block in the output: a single axis set to a single mode. */
export type ModeContext = {
	readonly axis: string;
	readonly mode: string;
	readonly attribute: string;
};

export function modeContexts(axes: SystemInput['axes']): ModeContext[] {
	return Object.entries(axes).flatMap(([axis, { modes, activation }]) =>
		modes.map((mode) => ({ axis, mode, attribute: activation.attribute }))
	);
}

/** Every combination of axis selections, including "nothing selected". Ordinary first. */
export function allSelections(axes: SystemInput['axes']): Selection[] {
	return Object.entries(axes).reduce<Selection[]>(
		(selections, [axis, { modes }]) =>
			selections.flatMap((selection) => [
				selection,
				...modes.map((mode) => ({ ...selection, [axis]: mode })),
			]),
		[{}]
	);
}

export function describeSelection(selection: Selection): string {
	const parts = Object.entries(selection).flatMap(([axis, mode]) =>
		mode ? [`${axis}: ${mode}`] : []
	);
	return parts.length === 0 ? '' : ` (${parts.join(', ')})`;
}

/** The mode entries that apply to a domain under a selection. */
export function selectedEntries<Fields>(
	modes: Modes<Fields> | undefined,
	selection: Selection
): Fields[] {
	if (!modes) return [];
	return Object.entries(selection).flatMap(([axis, mode]) => {
		const entry = mode === undefined ? undefined : modes[axis]?.[mode];
		return entry === undefined ? [] : [entry];
	});
}

/**
 * Checks a domain's `modes`: axes and modes must be registered, and each value
 * (named by `keysOf`) may be changed by at most one axis.
 */
export function checkModes<Fields>(
	issues: Issues,
	path: string,
	modes: Modes<Fields> | undefined,
	axes: SystemInput['axes'],
	keysOf: (entry: Fields, entryPath: string) => string[]
): void {
	if (!modes) return;
	const owner = new Map<string, string>();
	for (const [axis, entries] of Object.entries(modes)) {
		const registered = axes[axis];
		if (
			!issues.check(
				registered !== undefined,
				`${path}.modes.${axis}`,
				`"${axis}" is not a registered axis`
			)
		) {
			continue;
		}
		for (const [mode, entry] of Object.entries(entries)) {
			const entryPath = `${path}.modes.${axis}.${mode}`;
			if (
				!issues.check(
					registered.modes.includes(mode),
					entryPath,
					`"${mode}" is not a mode of ${axis}`
				)
			)
				continue;
			for (const key of keysOf(entry, entryPath)) {
				const other = owner.get(key);
				if (other !== undefined && other !== axis) {
					issues.add(
						`${path}.${key}`,
						`is changed by both ${other} and ${axis}; a value may follow only one axis`
					);
				}
				owner.set(key, axis);
			}
		}
	}
}

/** Keys of an entry, rejecting any not in `allowed`. */
export function allowedKeys(
	issues: Issues,
	entryPath: string,
	entry: object,
	allowed: readonly string[]
): string[] {
	return Object.keys(entry).filter((key) =>
		issues.check(allowed.includes(key), `${entryPath}.${key}`, `cannot be changed by a mode`)
	);
}
