import {
	ALPHA_POSITIONS,
	LO_HI_POSITIONS,
	PREFIXES as P,
	S_L_POSITIONS,
	TEXT_CLASS_PREFIX,
} from '../const.js';
import type { ResolvedSystem } from '../resolve/index.js';
import { checkLuminance } from '../runtime/luminance.js';
import { name } from './format.js';
import { rowName, rowsInOrder } from './names.js';

/**
 * What Workbench shows, as token and class names it can read from the real CSS.
 * Workbench holds no naming rules of its own; every name comes from here.
 */
export type WorkbenchData = {
	readonly problems: readonly string[];
	readonly axes: readonly {
		readonly name: string;
		readonly attribute: string;
		readonly modes: readonly string[];
	}[];
	readonly colors: readonly {
		readonly name: string;
		readonly token: string;
		readonly ramp: readonly { readonly token: string; readonly alpha: number }[];
	}[];
	readonly contrast: readonly {
		readonly palette: string;
		readonly ok: boolean;
		readonly delta: number;
		readonly required: number;
		readonly worst: string;
	}[];
	readonly spacing: { readonly min: string; readonly steps: readonly string[] } | null;
	readonly gap: readonly string[];
	readonly radius: readonly string[];
	readonly width: string | null;
	readonly shadows: readonly { readonly name: string; readonly tokens: readonly string[] }[];
	readonly time: readonly { readonly name: string; readonly tokens: readonly string[] }[];
	readonly easings: readonly { readonly name: string; readonly token: string }[];
	readonly roles: readonly {
		readonly name: string;
		readonly rows: readonly {
			readonly size: string;
			readonly className: string;
			readonly fontSize: string;
			readonly fontWeight: string;
			readonly lineHeight: string;
			readonly letterSpacing: string;
		}[];
		readonly styles: readonly { readonly name: string; readonly className: string }[];
		readonly weights: readonly { readonly name: string; readonly className: string }[];
	}[];
	readonly fonts: readonly { readonly id: string; readonly faces: readonly string[] }[];
};

export function workbenchData(
	resolved: ResolvedSystem | undefined,
	problems: readonly string[],
	fonts: WorkbenchData['fonts']
): WorkbenchData {
	const empty: WorkbenchData = {
		problems,
		axes: [],
		colors: [],
		contrast: [],
		spacing: null,
		gap: [],
		radius: [],
		width: null,
		shadows: [],
		time: [],
		easings: [],
		roles: [],
		fonts,
	};
	if (!resolved) return empty;
	const { input } = resolved;
	const alpha: Record<string, number> = { non: 0, ...input.alpha?.values };
	const rule = input.colors?.constraints?.luminance;
	const themeAxis = Object.keys(input.colors?.modes ?? {})[0];
	const palettes = [
		{ label: 'ordinary', values: resolved.ordinary.colors },
		...resolved.modes
			.filter((mode) => mode.axis === themeAxis)
			.map((mode) => ({ label: mode.mode, values: mode.values.colors })),
	];

	return {
		...empty,
		axes: Object.entries(input.axes).map(([axis, { modes, activation }]) => ({
			name: axis,
			attribute: activation.attribute,
			modes,
		})),
		colors: Object.keys(input.colors?.tokens ?? {}).map((color) => ({
			name: color,
			token: name(P.color, color),
			ramp: ['non', ...ALPHA_POSITIONS].map((position) => ({
				token: name(P.color, color, P.alpha, position),
				alpha: alpha[position]!,
			})),
		})),
		contrast:
			rule === undefined
				? []
				: palettes.flatMap(({ label, values }) => {
						if (!values?.polarity) return [];
						const result = checkLuminance(
							values.tokens,
							rule,
							values.polarity as 'negative' | 'positive'
						);
						const worst = Object.entries(result.colors).sort(
							([, a], [, b]) => a.headroom - b.headroom
						)[0]![0];
						return [
							{
								palette: label,
								ok: result.deltaValid,
								delta: result.actualDelta,
								required: result.requiredDelta,
								worst,
							},
						];
					}),
		spacing: input.spacing
			? {
					min: name(P.spacing, 'min'),
					steps: Array.from({ length: input.spacing.count }, (_, index) =>
						name(P.spacing, index + 1)
					),
				}
			: null,
		gap: input.gap ? S_L_POSITIONS.map((position) => name(P.gap, position)) : [],
		radius: input.border ? S_L_POSITIONS.map((position) => name(P.radius, position)) : [],
		width: input.border ? P.width : null,
		shadows: resolved.ordinary.shadows
			? [
					...(resolved.ordinary.shadows.ordinary
						? [{ name: 'ordinary', tokens: LO_HI_POSITIONS.map((p) => name(P.shadow, p)) }]
						: []),
					...Object.keys(resolved.ordinary.shadows.ranges).map((range) => ({
						name: range,
						tokens: LO_HI_POSITIONS.map((p) => name(P.shadow, range, p)),
					})),
				]
			: [],
		time: input.time
			? [
					{ name: 'ordinary', tokens: LO_HI_POSITIONS.map((p) => name(P.time, p)) },
					...Object.keys(input.time.scales ?? {}).map((scale) => ({
						name: scale,
						tokens: LO_HI_POSITIONS.map((p) => name(P.time, scale, p)),
					})),
				]
			: [],
		easings: Object.keys(input.easings ?? {}).map((easing) => ({
			name: easing,
			token: name(P.easing, easing),
		})),
		roles: Object.entries(input.typography?.roles ?? {}).map(([role, definition]) => ({
			name: role,
			rows: rowsInOrder(definition.sizes).map(([size]) => {
				const row = name(P.text, rowName(role, size));
				return {
					size,
					className: `${TEXT_CLASS_PREFIX}${rowName(role, size)}`,
					fontSize: name(row, 'font-size'),
					fontWeight: name(row, 'font-weight'),
					lineHeight: name(row, 'line-height'),
					letterSpacing: name(row, 'letter-spacing'),
				};
			}),
			styles: (definition.styles ?? ['normal']).map((style) => ({
				name: style,
				className: `${TEXT_CLASS_PREFIX}${role}-style-${style}`,
			})),
			weights:
				typeof definition.weights === 'number'
					? []
					: Object.keys(definition.weights).map((weight) => ({
							name: weight,
							className: `${TEXT_CLASS_PREFIX}${role}-weight-${weight}`,
						})),
		})),
	};
}
