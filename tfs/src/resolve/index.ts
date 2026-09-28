import {
	checkAlpha,
	checkColors,
	checkResolvedColors,
	resolveColors,
	type ResolvedColors,
} from './color.js';
import type { SystemInput } from './input.js';
import { Issues, TfsError, type Issue } from './issues.js';
import {
	allSelections,
	describeSelection,
	modeContexts,
	type ModeContext,
	type Selection,
} from './modes.js';
import { checkEasings, checkTime } from './motion.js';
import { checkIdentity } from './rules.js';
import {
	checkResolvedShadows,
	checkShadows,
	resolveShadows,
	type ResolvedShadows,
} from './shadow.js';
import {
	checkRange,
	checkResolvedRange,
	checkResolvedSpacing,
	checkResolvedWidth,
	checkSpacing,
	checkWidth,
	resolveRange,
	resolveSpacing,
	resolveWidth,
	type ResolvedRange,
	type ResolvedSpacing,
	type ResolvedWidth,
} from './spacing.js';
import {
	checkFontSize,
	checkFonts,
	checkResolvedFontSize,
	checkResolvedRoles,
	checkRoles,
	resolveFontSize,
	resolveRoleSizes,
	type ResolvedFontSize,
	type ResolvedRoleSizes,
} from './typography.js';

/** Every value that modes can change, resolved for one selection. */
export type ModalValues = {
	readonly colors?: ResolvedColors;
	readonly spacing?: ResolvedSpacing;
	readonly gap?: ResolvedRange;
	readonly radius?: ResolvedRange;
	readonly width?: ResolvedWidth;
	readonly shadows?: ResolvedShadows;
	readonly fontSize?: ResolvedFontSize;
	readonly roleSizes?: ResolvedRoleSizes;
};

export type ResolvedSystem = {
	/** The authored input; values that no mode changes (alpha, time, easings, fonts, role options) are read from here. */
	readonly input: SystemInput;
	readonly groups: Readonly<Record<string, readonly string[]>>;
	readonly ordinary: ModalValues;
	/** One entry per registered mode: the complete values with only that mode selected. */
	readonly modes: readonly (ModeContext & { readonly values: ModalValues })[];
};

function resolveValues(system: SystemInput, selection: Selection): ModalValues {
	return {
		...(system.colors ? { colors: resolveColors(system.colors, selection) } : {}),
		...(system.spacing ? { spacing: resolveSpacing(system.spacing, selection) } : {}),
		...(system.gap ? { gap: resolveRange(system.gap, selection) } : {}),
		...(system.border
			? {
					radius: resolveRange(system.border.radius, selection),
					width: resolveWidth(system.border.width, selection),
				}
			: {}),
		...(system.shadows ? { shadows: resolveShadows(system.shadows, selection) } : {}),
		...(system.fontSize ? { fontSize: resolveFontSize(system.fontSize, selection) } : {}),
		...(system.typography
			? { roleSizes: resolveRoleSizes(system.typography.roles, selection) }
			: {}),
	};
}

function checkValues(
	issues: Issues,
	system: SystemInput,
	values: ModalValues,
	where: string
): void {
	if (values.colors) checkResolvedColors(issues, values.colors, where);
	if (values.spacing) {
		checkResolvedSpacing(issues, values.spacing, where);
		if (values.gap) checkResolvedRange(issues, 'gap', values.gap, values.spacing, where);
		if (values.radius)
			checkResolvedRange(issues, 'border.radius', values.radius, values.spacing, where);
	}
	if (values.width) checkResolvedWidth(issues, values.width, where);
	if (values.shadows)
		checkResolvedShadows(issues, values.shadows, Object.keys(values.colors?.tokens ?? {}), where);
	if (values.fontSize) {
		checkResolvedFontSize(issues, values.fontSize, where);
		if (system.typography && values.roleSizes) {
			checkResolvedRoles(issues, system.typography.roles, values.roleSizes, values.fontSize, where);
		}
	}
}

function checkAxes(issues: Issues, axes: SystemInput['axes']): void {
	const attributes = new Set<string>();
	for (const [axis, { modes, activation }] of Object.entries(axes)) {
		const path = `axes.${axis}`;
		checkIdentity(issues, path, axis);
		issues.check(modes.length > 0, `${path}.modes`, `needs at least one mode`);
		issues.check(new Set(modes).size === modes.length, `${path}.modes`, `lists a mode twice`);
		for (const mode of modes) checkIdentity(issues, `${path}.modes`, mode);
		const attribute = activation?.attribute;
		issues.check(
			/^data-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attribute ?? ''),
			`${path}.activation.attribute`,
			`must be a data-* attribute`
		);
		issues.check(
			!attributes.has(attribute),
			`${path}.activation.attribute`,
			`"${attribute}" is used by another axis`
		);
		attributes.add(attribute);
	}
}

function checkDependencies(issues: Issues, system: SystemInput): void {
	const needs = (present: unknown, required: unknown, path: string, what: string) =>
		issues.check(present === undefined || required !== undefined, path, `needs ${what}`);
	needs(system.colors, system.alpha, 'colors', 'alpha (every colour gets an alpha ramp)');
	needs(system.shadows, system.colors, 'shadows', 'colors');
	needs(system.gap, system.spacing, 'gap', 'spacing');
	needs(system.border, system.spacing, 'border', 'spacing');
	needs(system.typography, system.fontSize, 'typography', 'fontSize');
}

/**
 * Checks the whole system and resolves every mode. Every combination of modes is
 * checked, so values that are only invalid together are still caught.
 * Throws a TfsError listing every problem.
 */
export function resolveSystem(system: SystemInput): ResolvedSystem {
	const issues = new Issues();
	const axes = system.axes ?? {};
	checkAxes(issues, axes);
	checkDependencies(issues, system);
	const groups = system.colors ? checkColors(issues, system.colors, axes) : {};
	if (system.spacing) checkSpacing(issues, system.spacing, axes);
	if (system.gap) checkRange(issues, 'gap', system.gap, axes);
	if (system.border) {
		checkRange(issues, 'border.radius', system.border.radius, axes);
		checkWidth(issues, system.border.width, axes);
	}
	if (system.shadows) checkShadows(issues, system.shadows, axes);
	if (system.fontSize) checkFontSize(issues, system.fontSize, axes);
	if (system.typography)
		checkRoles(issues, system.typography.roles, Object.keys(system.typography.fonts), axes);

	// Mode values are only checked once the structure above is sound; otherwise they are noise.
	const structureSound = issues.list.length === 0;

	// Domains that modes never change are checked regardless.
	if (system.alpha) checkAlpha(issues, system.alpha);
	if (system.time) checkTime(issues, system.time);
	if (system.easings) checkEasings(issues, system.easings);
	if (system.typography) checkFonts(issues, system.typography.fonts);

	if (structureSound) {
		const seen = new Set<string>();
		for (const selection of allSelections(axes)) {
			const found = new Issues();
			checkValues(found, system, resolveValues(system, selection), describeSelection(selection));
			for (const issue of found.list) {
				const key = `${issue.path.replace(/ \([^)]*\)/g, '')}|${issue.message}`;
				if (!seen.has(key)) issues.list.push(issue);
				seen.add(key);
			}
		}
	}
	if (issues.list.length > 0) throw new TfsError(issues.list);

	return {
		input: system,
		groups,
		ordinary: resolveValues(system, {}),
		modes: modeContexts(axes).map((context) => ({
			...context,
			values: resolveValues(system, { [context.axis]: context.mode }),
		})),
	};
}

export { TfsError, type Issue };
export type { SystemInput };
