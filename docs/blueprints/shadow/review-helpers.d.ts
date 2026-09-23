/**
 * Declaration only, for checking the authoring example in an editor.
 * There is no helper implementation here or corresponding public TFS export.
 * These supporting type names are not proposed library API.
 */
import type { AlphaIdentity, ColorIdentity } from './context.js';
import type { ShadowLayer, ShadowRange } from './review-types.js';

type LayerForColor = Omit<ShadowLayer, 'color'> & {
	readonly alpha?: AlphaIdentity;
	readonly color?: never;
};

export declare function shadowsForColors<
	const Colors extends readonly ColorIdentity[],
	const Prefix extends string,
>(input: {
	readonly prefix: Prefix;
	readonly colors: Colors;
	readonly range: ShadowRange<LayerForColor>;
}): Readonly<Record<`${Prefix}-${Colors[number]}`, ShadowRange>>;
