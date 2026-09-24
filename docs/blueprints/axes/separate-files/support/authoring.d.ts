/**
 * Editor-only review types, not new public TFS exports or a production schema.
 * Project names come from the authored sources. No project modules are imported here.
 */
import type { AlphaSystem, Oklch } from '@three-forma-styli/core';

export type AxisCatalogue = Readonly<
	Record<
		string,
		{
			readonly modes: readonly [string, ...string[]];
			readonly activation: { readonly attribute: string };
		}
	>
>;

export type ModeCatalogue<Axes extends AxisCatalogue, Fields> = {
	readonly [Axis in keyof Axes]?: {
		readonly [Mode in Axes[Axis]['modes'][number]]?: Fields;
	};
};

export type ColorDraft<Axes extends AxisCatalogue> = {
	readonly tokens: Readonly<Record<string, Oklch>>;
	readonly modes?: ModeCatalogue<Axes, { readonly tokens?: Readonly<Record<string, Oklch>> }>;
};

/** Every identity belongs to the complete ordinary set. Modes only change values. */
export type ColorIdentity<Colors> = Colors extends { readonly tokens: infer Tokens }
	? Extract<keyof Tokens, string>
	: never;
export type AlphaIdentity<Alpha extends AlphaSystem> =
	'non' | Extract<keyof Alpha['scales'][Alpha['defaultScale']]['values'], string>;

export type ColorReference<Colors, Alpha extends AlphaSystem> = {
	readonly color: ColorIdentity<Colors>;
	readonly alpha?: AlphaIdentity<Alpha>;
};

type Calibration = { readonly base: number; readonly min: number };
export type SpacingDraft<Axes extends AxisCatalogue> = Calibration & {
	readonly unit: string;
	readonly range: number;
	readonly modes?: ModeCatalogue<Axes, Partial<Calibration>>;
};

/** Numeric derived references retain today's shape; numeric validity is a build check. */
export type SpacingRange = Readonly<Record<'min' | 's' | 'l' | 'max', 'min' | number>>;

type ShadowPosition = 'min' | 'lo' | 'hi' | 'max';
type Layer<Colors, Alpha extends AlphaSystem> = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
	readonly color: ColorReference<Colors, Alpha>;
};
type Layers<Colors, Alpha extends AlphaSystem> = readonly [
	Layer<Colors, Alpha>,
	...Layer<Colors, Alpha>[],
];
type ShadowRange<Colors, Alpha extends AlphaSystem> = Readonly<
	Record<ShadowPosition, Layers<Colors, Alpha>>
>;

export type ShadowDraft<Axes extends AxisCatalogue, Colors, Alpha extends AlphaSystem> = {
	readonly unit: string;
	readonly defaultRange?: string;
	readonly ranges: Readonly<Record<string, ShadowRange<Colors, Alpha>>>;
	readonly modes?: ModeCatalogue<
		Axes,
		{ readonly ranges: Readonly<Record<string, Partial<ShadowRange<Colors, Alpha>>>> }
	>;
};
