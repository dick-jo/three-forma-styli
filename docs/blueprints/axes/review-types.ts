/** Supporting editor checks only. These are not proposed TFS type exports. */
import type { Oklch, SpacingSystem } from '@three-forma-styli/core';

export type AxisCatalogue = Readonly<
	Record<
		string,
		{
			readonly default: string;
			readonly modes: readonly [string, ...string[]];
			readonly activation:
				| { readonly attribute: string; readonly media?: never }
				| { readonly media: Readonly<Record<string, string>>; readonly attribute?: never };
		}
	>
>;

export type Selection<Axes extends AxisCatalogue> = {
	readonly [Axis in keyof Axes]?: Axes[Axis]['modes'][number];
};

type Overrides<ModeSelection, Patch> = {
	readonly overrides?: readonly {
		readonly when: ModeSelection;
		readonly set: Patch;
	}[];
};

export type ColorDraft<ModeSelection, Identity extends string> = {
	readonly tokens: Readonly<Record<Identity, Oklch>>;
} & Overrides<ModeSelection, { readonly tokens: Readonly<Partial<Record<Identity, Oklch>>> }>;

type ColorIdentity = 'bg' | 'ink' | 'shd';
type SpacingReference = 'min' | number;
type SpacingRange = Readonly<Record<'min' | 's' | 'l' | 'max', SpacingReference>>;

type Layer = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly color: { readonly color: ColorIdentity };
};
type ShadowRange = Readonly<Record<'min' | 'lo' | 'hi' | 'max', readonly [Layer, ...Layer[]]>>;

export type SystemDraft<Axes extends AxisCatalogue> = {
	readonly axes: Axes;
	readonly colors: ColorDraft<Selection<Axes>, ColorIdentity>;
	readonly spacing: SpacingSystem & Overrides<Selection<Axes>, Partial<SpacingSystem>>;
	readonly gap: SpacingRange;
	readonly border: {
		readonly radius: SpacingRange;
		readonly width: { readonly unit: string; readonly value: number };
	};
	readonly shadows: {
		readonly unit: string;
		readonly defaultRange: 'neu';
		readonly ranges: { readonly neu: ShadowRange };
	};
};
