import { ALPHA_POSITIONS, LO_HI_POSITIONS, S_L_POSITIONS } from '../const.js';
import type { SpacingRef } from '../resolve/input.js';
import type { ModalValues, ResolvedSystem } from '../resolve/index.js';
import { TfsError } from '../resolve/issues.js';
import { rowsInOrder } from './names.js';
import { oklchToSrgb } from './srgb.js';
import type { FontStacks } from './tokens.js';

/**
 * generated/figma.json: what the TFS Figma plugin applies. Variables (colours,
 * numbers) go into one collection per axis, holding only the chosen modes, plus a
 * `base` collection for values no mode changes. Text and shadows become styles.
 * Everything Figma cannot hold is listed in `skipped`, never faked.
 */

export type FigmaValue =
	| { readonly r: number; readonly g: number; readonly b: number; readonly a: number }
	| number
	| { readonly alias: string };

export type FigmaVariable = {
	readonly name: string;
	readonly type: 'COLOR' | 'FLOAT';
	readonly scopes: readonly string[];
	/** One value per mode of its collection, in the same order. */
	readonly values: readonly FigmaValue[];
};

export type FigmaData = {
	readonly version: 1;
	readonly collections: readonly {
		readonly name: string;
		readonly modes: readonly string[];
		readonly variables: readonly FigmaVariable[];
	}[];
	readonly textStyles: readonly {
		readonly name: string;
		readonly family: string;
		readonly weight: number;
		readonly fontSize: { readonly px: number; readonly variable: string };
		readonly lineHeightPercent: number;
		readonly letterSpacingPercent: number;
		readonly textCase?: 'UPPER' | 'LOWER' | 'TITLE';
	}[];
	readonly effectStyles: readonly {
		readonly name: string;
		readonly layers: readonly {
			readonly inset: boolean;
			readonly x: number;
			readonly y: number;
			readonly blur: number;
			readonly spread: number;
			readonly color: string;
		}[];
	}[];
	readonly skipped: readonly string[];
};

/** `output.figma` in tfs.config.ts. */
export type FigmaOptions = {
	/** Modes to carry into Figma per axis (Figma allows 4 per collection). Default: all. */
	readonly modes?: Readonly<Record<string, readonly string[]>>;
};

/** Figma has no root font size; rem and em resolve against this. */
const ROOT_PX = 16;
const FIGMA_MODE_LIMIT = 4;
const BASE_COLLECTION = 'base';
const GENERIC_FAMILIES = new Set([
	'system-ui',
	'sans-serif',
	'serif',
	'monospace',
	'ui-monospace',
	'ui-sans-serif',
	'ui-serif',
	'cursive',
	'fantasy',
]);

function px(value: number, unit: string): number | undefined {
	if (unit === 'px') return value;
	if (unit === 'rem' || unit === 'em') return Number((value * ROOT_PX).toFixed(4));
	return undefined;
}

const round = (value: number) => Number(value.toFixed(4));

type Spec = {
	name: string;
	type: FigmaVariable['type'];
	scopes: string[];
	get: (values: ModalValues) => FigmaValue | undefined;
};

function variableSpecs(resolved: ResolvedSystem): Spec[] {
	const { input } = resolved;
	const specs: Spec[] = [];
	const alpha: Record<string, number> = { non: 0, ...input.alpha?.values };
	const spacingRef = (ref: SpacingRef) => ({ alias: ref === 'min' ? 'sp/min' : `sp/${ref}` });

	for (const color of Object.keys(input.colors?.tokens ?? {})) {
		const rgb = (values: ModalValues, a: number) => {
			const channels = values.colors?.tokens[color];
			return channels ? { ...oklchToSrgb(channels), a } : undefined;
		};
		specs.push({
			name: `clr/${color}`,
			type: 'COLOR',
			scopes: ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'],
			get: (v) => rgb(v, 1),
		});
		for (const position of ['non', ...ALPHA_POSITIONS]) {
			specs.push({
				name: `clr/${color}/${position}`,
				type: 'COLOR',
				scopes: ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'],
				get: (v) => rgb(v, alpha[position]!),
			});
		}
	}
	if (input.spacing) {
		specs.push({
			name: 'sp/min',
			type: 'FLOAT',
			scopes: ['WIDTH_HEIGHT', 'GAP'],
			get: (v) => px(v.spacing!.min, v.spacing!.unit),
		});
		for (let n = 1; n <= input.spacing.count; n++) {
			specs.push({
				name: `sp/${n}`,
				type: 'FLOAT',
				scopes: ['WIDTH_HEIGHT', 'GAP'],
				get: (v) => px(v.spacing!.step * n, v.spacing!.unit),
			});
		}
	}
	for (const position of input.gap ? S_L_POSITIONS : []) {
		specs.push({
			name: `gap/${position}`,
			type: 'FLOAT',
			scopes: ['GAP'],
			get: (v) => spacingRef(v.gap![position]),
		});
	}
	for (const position of input.border ? S_L_POSITIONS : []) {
		specs.push({
			name: `bdr/${position}`,
			type: 'FLOAT',
			scopes: ['CORNER_RADIUS'],
			get: (v) => spacingRef(v.radius![position]),
		});
	}
	if (input.border)
		specs.push({
			name: 'bdw',
			type: 'FLOAT',
			scopes: ['STROKE_FLOAT'],
			get: (v) => px(v.width!.value, v.width!.unit),
		});
	if (input.fontSize) {
		const fs = (v: ModalValues, value: (f: NonNullable<ModalValues['fontSize']>) => number) =>
			px(value(v.fontSize!), v.fontSize!.unit);
		specs.push({
			name: 'fs/min',
			type: 'FLOAT',
			scopes: ['FONT_SIZE'],
			get: (v) => fs(v, (f) => f.min),
		});
		for (let n = 1; n <= input.fontSize.count; n++) {
			specs.push({
				name: `fs/${n}`,
				type: 'FLOAT',
				scopes: ['FONT_SIZE'],
				get: (v) => fs(v, (f) => f.start + f.step * (n - 1)),
			});
		}
	}
	return specs;
}

function chosenModes(resolved: ResolvedSystem, options: FigmaOptions): Record<string, string[]> {
	const issues: { path: string; message: string }[] = [];
	const chosen: Record<string, string[]> = {};
	for (const [axis, { modes }] of Object.entries(resolved.input.axes)) {
		const selected = [...(options.modes?.[axis] ?? modes)];
		const path = `output.figma.modes.${axis}`;
		for (const mode of selected)
			if (!modes.includes(mode))
				issues.push({ path, message: `"${mode}" is not a mode of ${axis}` });
		if (selected.length > FIGMA_MODE_LIMIT)
			issues.push({
				path,
				message: `Figma allows ${FIGMA_MODE_LIMIT} modes per collection; choose up to ${FIGMA_MODE_LIMIT} of ${modes.join(', ')}`,
			});
		chosen[axis] = selected;
	}
	for (const axis of Object.keys(options.modes ?? {})) {
		if (!(axis in resolved.input.axes))
			issues.push({
				path: `output.figma.modes.${axis}`,
				message: `"${axis}" is not a registered axis`,
			});
	}
	if (issues.length > 0) throw new TfsError(issues);
	return chosen;
}

/** The first family of a font-family value, if Figma could have it. */
function figmaFamily(stack: string | undefined): string | undefined {
	const first = stack?.split(',')[0]?.trim().replace(/^"|"$/g, '');
	return first && !GENERIC_FAMILIES.has(first) ? first : undefined;
}

function figmaData(
	resolved: ResolvedSystem,
	stacks: FontStacks,
	options: FigmaOptions = {}
): FigmaData {
	const { input } = resolved;
	const chosen = chosenModes(resolved, options);
	const skipped: string[] = [];
	const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

	const collections = new Map<string, FigmaVariable[]>();
	const add = (collection: string, variable: FigmaVariable) =>
		collections.set(collection, [...(collections.get(collection) ?? []), variable]);
	for (const spec of variableSpecs(resolved)) {
		const ordinary = spec.get(resolved.ordinary);
		const owner = Object.keys(input.axes).find((axis) =>
			resolved.modes.some((mode) => mode.axis === axis && !same(spec.get(mode.values), ordinary))
		);
		const values = owner
			? chosen[owner]!.map((name) =>
					spec.get(resolved.modes.find((m) => m.axis === owner && m.mode === name)!.values)
				)
			: [ordinary];
		if (values.some((value) => value === undefined)) {
			skipped.push(`${spec.name}: its unit has no pixel equivalent`);
			continue;
		}
		add(owner ?? BASE_COLLECTION, {
			name: spec.name,
			type: spec.type,
			scopes: spec.scopes,
			values: values as FigmaValue[],
		});
	}

	const textStyles: FigmaData['textStyles'][number][] = [];
	for (const [role, definition] of Object.entries(input.typography?.roles ?? {})) {
		const family = figmaFamily(stacks[definition.font]);
		if (!family) {
			skipped.push(
				`text styles for ${role}: font "${definition.font}" is a system font with no Figma equivalent`
			);
			continue;
		}
		if (definition.modes)
			skipped.push(`${role}: size values changed by modes use their ordinary values in Figma`);
		for (const [size, row] of rowsInOrder(definition.sizes)) {
			const variable = row.fontSize === 'min' ? 'fs/min' : `fs/${row.fontSize}`;
			const fontSize = resolved.ordinary.fontSize!;
			const sizePx = px(
				row.fontSize === 'min' ? fontSize.min : fontSize.start + fontSize.step * (row.fontSize - 1),
				fontSize.unit
			);
			if (sizePx === undefined) continue;
			const transform = definition.textTransform;
			textStyles.push({
				name: `${role}/${size}`,
				family,
				weight:
					typeof definition.weights === 'number'
						? definition.weights
						: definition.weights[row.weight!]!,
				fontSize: { px: sizePx, variable },
				lineHeightPercent: round(row.lineHeight * 100),
				letterSpacingPercent: round(row.letterSpacing * 100),
				...(transform === 'uppercase'
					? { textCase: 'UPPER' as const }
					: transform === 'lowercase'
						? { textCase: 'LOWER' as const }
						: transform === 'capitalize'
							? { textCase: 'TITLE' as const }
							: {}),
			});
		}
		if ((definition.styles ?? []).includes('italic'))
			skipped.push(`${role}: italic is not exported as separate text styles`);
	}

	const effectStyles: FigmaData['effectStyles'][number][] = [];
	const shadows = resolved.ordinary.shadows;
	if (shadows) {
		if (input.shadows?.modes)
			skipped.push('shadows: shapes changed by modes use their ordinary values in Figma');
		const ranges = [
			...(shadows.ordinary ? [['', shadows.ordinary] as const] : []),
			...Object.entries(shadows.ranges).map(([n, r]) => [`${n}/`, r] as const),
		];
		for (const [prefix, range] of ranges) {
			for (const position of LO_HI_POSITIONS) {
				effectStyles.push({
					name: `shd/${prefix}${position}`,
					layers: range[position]!.map((layer) => ({
						inset: layer.inset ?? false,
						x: px(layer.x, shadows.unit) ?? 0,
						y: px(layer.y, shadows.unit) ?? 0,
						blur: px(layer.blur, shadows.unit) ?? 0,
						spread: px(layer.spread ?? 0, shadows.unit) ?? 0,
						color: layer.color.alpha
							? `clr/${layer.color.color}/${layer.color.alpha}`
							: `clr/${layer.color.color}`,
					})),
				});
			}
		}
	}

	const times = input.time ? 1 + Object.keys(input.time.scales ?? {}).length : 0;
	if (times)
		skipped.push(`time (${times} scale${times === 1 ? '' : 's'}): Figma has no duration variables`);
	const easings = Object.keys(input.easings ?? {}).length;
	if (easings) skipped.push(`easing (${easings}): Figma has no easing variables`);

	const order = [...Object.keys(input.axes), BASE_COLLECTION];
	return {
		version: 1,
		collections: order.flatMap((name) =>
			collections.has(name)
				? [
						{
							name,
							modes: name === BASE_COLLECTION ? ['value'] : chosen[name]!,
							variables: collections.get(name)!,
						},
					]
				: []
		),
		textStyles,
		effectStyles,
		skipped,
	};
}

export function emitFigmaJson(
	resolved: ResolvedSystem,
	stacks: FontStacks,
	options: FigmaOptions = {}
): string {
	return `${JSON.stringify(figmaData(resolved, stacks, options), null, '\t')}\n`;
}
