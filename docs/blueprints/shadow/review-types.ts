/** Editor checks for this mock only; these are not proposed library exports. */
import type { AlphaIdentity, ColorIdentity } from './context.js';

/** A named place in the range; not the shadow's x/y location. */
type ShadowPosition = 'min' | 'lo' | 'hi' | 'max';
type ColorReference = { readonly color: ColorIdentity; readonly alpha?: AlphaIdentity };

export type ShadowLayer = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
	readonly color: ColorReference;
};

export type ShadowRange<Layer = ShadowLayer> = Readonly<
	Record<ShadowPosition, readonly [Layer, ...Layer[]]>
>;

export type ShadowDraft = {
	readonly unit: string;
	readonly defaultRange?: string;
	readonly ranges: Readonly<Record<string, ShadowRange>>;
};
