import {
	ALPHA_POSITIONS,
	GENERATED_HEADER,
	LO_HI_POSITIONS,
	ROLE_SIZE_POSITIONS,
	S_L_POSITIONS,
} from '../const.js';
import type { ResolvedSystem } from '../resolve/index.js';
import { tokensFor, type FontStacks } from './tokens.js';

type Shape = {
	readonly axes: Record<string, { attribute: string; modes: readonly string[] }>;
	readonly colors: readonly string[];
	readonly colorGroups: Readonly<Record<string, readonly string[]>>;
	readonly tokenNames: readonly string[];
};

function shape(resolved: ResolvedSystem, stacks: FontStacks): Shape {
	const { input } = resolved;
	return {
		axes: Object.fromEntries(
			Object.entries(input.axes).map(([axis, { modes, activation }]) => [
				axis,
				{ attribute: activation.attribute, modes },
			])
		),
		colors: Object.keys(input.colors?.tokens ?? {}),
		colorGroups: resolved.groups,
		tokenNames: tokensFor(resolved, resolved.ordinary, stacks).map((token) => token.name),
	};
}

const json = (value: unknown) => JSON.stringify(value);

function union(values: readonly (string | number)[]): string {
	return values.length === 0 ? 'never' : values.map((value) => json(value)).join(' | ');
}

/** ./tokens runtime values. */
export function emitTokensJs(resolved: ResolvedSystem, stacks: FontStacks = {}): string {
	const { axes, colors, colorGroups } = shape(resolved, stacks);
	return `${GENERATED_HEADER}export const axes = ${json(axes)};
export const colors = ${json(colors)};
export const colorGroups = ${json(colorGroups)};

/** A generated custom property as a CSS value: cssVar('clr-pri') → 'var(--clr-pri)'. */
export function cssVar(name) {
	return \`var(--\${name})\`;
}
`;
}

/** ./tokens types: every authored name, the fixed positions, and every generated token name. */
export function emitTokensTypes(resolved: ResolvedSystem, stacks: FontStacks = {}): string {
	const { input } = resolved;
	const { axes, colors, colorGroups, tokenNames } = shape(resolved, stacks);
	const numbered = (count = 0) => [
		'min',
		...Array.from({ length: count }, (_, index) => index + 1),
	];
	const axesType = Object.entries(axes)
		.map(
			([axis, { attribute, modes }]) =>
				`\treadonly ${json(axis)}: { readonly attribute: ${json(attribute)}; readonly modes: readonly [${modes.map(json).join(', ')}] };`
		)
		.join('\n');
	const groupsType = Object.entries(colorGroups)
		.map(
			([group, members]) => `\treadonly ${json(group)}: readonly [${members.map(json).join(', ')}];`
		)
		.join('\n');
	const types: [string, string][] = [
		['ColorIdentity', '(typeof colors)[number]'],
		['ColorGroupName', 'keyof typeof colorGroups'],
		['AlphaPosition', union(['non', ...ALPHA_POSITIONS])],
		['AlphaScale', union(Object.keys(input.alpha?.scales ?? {}))],
		['SpacingPosition', union(input.spacing ? numbered(input.spacing.count) : [])],
		['GapPosition', union(S_L_POSITIONS)],
		['RadiusPosition', union(S_L_POSITIONS)],
		['ShadowPosition', union(LO_HI_POSITIONS)],
		['ShadowRange', union(Object.keys(resolved.ordinary.shadows?.ranges ?? {}))],
		['TimePosition', union(LO_HI_POSITIONS)],
		['TimeScale', union(Object.keys(input.time?.scales ?? {}))],
		['EasingIdentity', union(Object.keys(input.easings ?? {}))],
		['FontSizePosition', union(input.fontSize ? numbered(input.fontSize.count) : [])],
		['TextRole', union(Object.keys(input.typography?.roles ?? {}))],
		['TextSize', union(ROLE_SIZE_POSITIONS)],
		['TokenName', union(tokenNames)],
	];
	return `${GENERATED_HEADER}export declare const axes: {
${axesType}
};
export type AxisName = keyof typeof axes;
export type Mode<A extends AxisName> = (typeof axes)[A]['modes'][number];

export declare const colors: readonly [${colors.map(json).join(', ')}];
export declare const colorGroups: {
${groupsType}
};
/** The colours in a group: ColorGroup<'accents'>. */
export type ColorGroup<G extends ColorGroupName> = (typeof colorGroups)[G][number];

${types.map(([name, type]) => `export type ${name} = ${type};`).join('\n')}

/** A generated custom property as a CSS value: cssVar('clr-pri') → 'var(--clr-pri)'. */
export declare function cssVar(name: TokenName): string;
`;
}
