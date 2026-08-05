import type { LuminancePolicy, LuminanceValidation } from '../constraints/types.js';
import type { ResolvedAlphaScaleValues } from '../types.js';

/** Storage-friendly OKLCH color accepted by the browser runtime API. */
export interface RuntimeOklchColor {
	/** OKLCH lightness, from 0 through 1. */
	readonly l: number;
	/** Non-negative OKLCH chroma. Wide-gamut values are preserved. */
	readonly c: number;
	/** OKLCH hue in degrees, from 0 through 360. */
	readonly h: number;
}

/** The deliberately small, serializable shape accepted from an untrusted source. */
export interface RuntimeColorTheme<ColorIdentities extends readonly string[] = readonly string[]> {
	readonly polarity: 'negative' | 'positive';
	readonly colors: Readonly<Record<ColorIdentities[number], RuntimeOklchColor>>;
}

export interface RuntimeColorThemeSchema<
	ColorIdentities extends readonly string[] = readonly string[],
> {
	/** Exact color keys that the runtime payload must contain. */
	readonly colorIdentities: ColorIdentities;
}

export type RuntimeLuminanceConfig<ColorIdentity extends string = string> =
	LuminancePolicy<ColorIdentity>;

export interface RuntimeColorThemeConfig<
	ColorIdentities extends readonly string[] = readonly string[],
> extends RuntimeColorThemeSchema<ColorIdentities> {
	/** Optional alpha variants. No variants are generated when omitted. */
	readonly alphaSchedule?: ResolvedAlphaScaleValues;
	readonly luminance: RuntimeLuminanceConfig<NoInfer<ColorIdentities[number]>>;
	/** Mirrors the color member of TFS's build-time generator prefixes. */
	readonly prefixes?: Readonly<{ color?: string }>;
	/** Native OKLCH is fixed; alpha naming mirrors the build-time generator option. */
	readonly colorFormat?: Readonly<{ alphaModifier?: 'a' }>;
}

export interface RuntimeColorThemeResult<
	ColorIdentities extends readonly string[] = readonly string[],
> {
	readonly theme: RuntimeColorTheme<ColorIdentities>;
	/** Null-prototype, frozen record ready for DOM assignment. */
	readonly customProperties: Readonly<Record<string, string>>;
	/** TFS palette-separation diagnostics measured from the emitted 4dp OKLCH L values. */
	readonly luminance: LuminanceValidation;
}

/** A path-aware failure raised before untrusted theme data reaches CSS. */
export class RuntimeColorThemeValidationError extends TypeError {
	readonly path: string;

	constructor(path: string, message: string) {
		super(`${path} ${message}`);
		this.name = 'RuntimeColorThemeValidationError';
		this.path = path;
	}
}

/**
 * A valid runtime payload whose emitted palette violates the configured TFS
 * OKLCH-L separation constraint. This is distinct from malformed input.
 */
export class RuntimeLuminanceConstraintError<
	ColorIdentities extends readonly string[] = readonly string[],
> extends Error {
	readonly result: RuntimeColorThemeResult<ColorIdentities>;

	constructor(result: RuntimeColorThemeResult<ColorIdentities>) {
		const { actualDelta, requiredDelta, metric } = result.luminance;
		super(
			`Runtime theme violates the ${metric} luminance constraint: measured delta ${actualDelta}, requires at least ${requiredDelta}.`
		);
		this.name = 'RuntimeLuminanceConstraintError';
		this.result = result;
	}
}
