import { ALPHA_POSITIONS, type Oklch } from '../define/color.js';
import type { Easing, Layer, LayerRange, SpacingRef } from '../resolve/input.js';
import type { ModalValues, ResolvedSystem } from '../resolve/index.js';
import { TfsError } from '../resolve/issues.js';
import { SHADOW_POSITIONS } from '../resolve/shadow.js';
import { RANGE_POSITIONS } from '../resolve/spacing.js';
import { cssVar, length, num } from './format.js';

/** One CSS custom property: name without the leading `--`, and its CSS value. */
export type Token = { readonly name: string; readonly value: string };

const ALPHA_WITH_NON = ['non', ...ALPHA_POSITIONS] as const;

function oklchCss(color: Oklch, alpha?: number): string {
	const channels = `${num(color.l)} ${num(color.c)} ${num(color.h)}`;
	return alpha === undefined ? `oklch(${channels})` : `oklch(${channels} / ${num(alpha)})`;
}

function spacingRef(ref: SpacingRef): string {
	return cssVar(ref === 'min' ? 'sp-min' : `sp-${ref}`);
}

function layerCss(layer: Layer, unit: string): string {
	const color =
		layer.color.alpha === undefined
			? `clr-${layer.color.color}`
			: `clr-${layer.color.color}-a-${layer.color.alpha}`;
	return [
		...(layer.inset ? ['inset'] : []),
		length(layer.x, unit),
		length(layer.y, unit),
		length(layer.blur, unit),
		...(layer.spread !== undefined ? [length(layer.spread, unit)] : []),
		cssVar(color),
	].join(' ');
}

function shadowTokens(prefix: string, range: LayerRange, unit: string): Token[] {
	return SHADOW_POSITIONS.map((position) => ({
		name: `${prefix}-${position}`,
		value: range[position]!.map((layer) => layerCss(layer, unit)).join(', '),
	}));
}

function easingCss(easing: Easing): string {
	if (easing.type === 'cubicBezier') return `cubic-bezier(${easing.value.map(num).join(', ')})`;
	const points = easing.value;
	const identity =
		points.length === 2 &&
		points[0]![0] === 0 &&
		points[0]![1] === 0 &&
		points[1]![0] === 1 &&
		points[1]![1] === 1;
	return identity
		? 'linear'
		: `linear(${points.map(([input, output]) => `${num(output!)} ${num(input! * 100)}%`).join(', ')})`;
}

/** Every token for one resolved selection, in a stable reading order. */
export function tokensFor(resolved: ResolvedSystem, values: ModalValues): Token[] {
	const { input } = resolved;
	const tokens: Token[] = [];
	const add = (name: string, value: string) => tokens.push({ name, value });

	if (input.alpha) {
		add('a-non', '0');
		for (const position of ALPHA_POSITIONS)
			add(`a-${position}`, num(input.alpha.values[position]!));
		for (const [name, scale] of Object.entries(input.alpha.scales ?? {})) {
			add(`a-${name}-non`, '0');
			for (const position of ALPHA_POSITIONS)
				add(`a-${name}-${position}`, num(scale.values[position]!));
		}
	}
	if (values.colors && input.alpha) {
		const alpha = { non: 0, ...input.alpha.values } as Record<string, number>;
		for (const [name, color] of Object.entries(values.colors.tokens)) {
			add(`clr-${name}`, oklchCss(color));
			for (const position of ALPHA_WITH_NON)
				add(`clr-${name}-a-${position}`, oklchCss(color, alpha[position]));
		}
	}
	if (values.spacing) {
		const { unit, count, min, step } = values.spacing;
		add('sp-min', length(min, unit));
		for (let n = 1; n <= count; n++) add(`sp-${n}`, length(step * n, unit));
	}
	if (values.gap)
		for (const position of RANGE_POSITIONS)
			add(`gap-${position}`, spacingRef(values.gap[position]));
	if (values.radius)
		for (const position of RANGE_POSITIONS)
			add(`bdr-${position}`, spacingRef(values.radius[position]));
	if (values.width) add('bdw', length(values.width.value, values.width.unit));
	if (values.shadows) {
		const { unit, ordinary, ranges } = values.shadows;
		if (ordinary) tokens.push(...shadowTokens('shd', ordinary, unit));
		for (const [name, range] of Object.entries(ranges))
			tokens.push(...shadowTokens(`shd-${name}`, range, unit));
	}
	if (input.time) {
		const scales = [
			['t', input.time] as const,
			...Object.entries(input.time.scales ?? {}).map(
				([name, scale]) => [`t-${name}`, scale] as const
			),
		];
		for (const [prefix, scale] of scales) {
			for (const position of ['min', 'lo', 'hi', 'max'])
				add(`${prefix}-${position}`, `${num(scale.values[position]!)}${scale.unit}`);
		}
	}
	if (input.easings)
		for (const [name, easing] of Object.entries(input.easings))
			add(`ease-${name}`, easingCss(easing));
	if (values.fontSize) {
		const { unit, count, min, start, step } = values.fontSize;
		add('fs-min', length(min, unit));
		for (let n = 1; n <= count; n++) add(`fs-${n}`, length(start + step * (n - 1), unit));
	}

	const seen = new Set<string>();
	const collisions = tokens.flatMap((token) =>
		seen.has(token.name) ? [token.name] : (seen.add(token.name), [])
	);
	if (collisions.length > 0) {
		throw new TfsError(
			collisions.map((name) => ({
				path: `--${name}`,
				message: 'two different values produce this token name; rename one identity',
			}))
		);
	}
	return tokens;
}
