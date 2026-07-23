import type { LuminanceValidation } from '../constraints/types.js';

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
export interface RuntimeColorTheme<ColorNames extends readonly string[] = readonly string[]> {
	readonly polarity: 'negative' | 'positive';
	readonly colors: Readonly<Record<ColorNames[number], RuntimeOklchColor>>;
}

export interface RuntimeColorThemeSchema<ColorNames extends readonly string[] = readonly string[]> {
	/** Exact color keys that the runtime payload must contain. */
	readonly colorNames: ColorNames;
}

export interface RuntimeLuminanceConfig<ColorName extends string = string> {
	readonly minDelta: number;
	readonly backgroundColors: readonly ColorName[];
	readonly foregroundColors: readonly ColorName[];
}

export interface RuntimeColorThemeConfig<
	ColorNames extends readonly string[] = readonly string[],
> extends RuntimeColorThemeSchema<ColorNames> {
	/** Optional alpha variants. No variants are generated when omitted. */
	readonly alphaSchedule?: Readonly<Record<string, number>>;
	readonly luminance: RuntimeLuminanceConfig<NoInfer<ColorNames[number]>>;
	/** Mirrors the color member of TFS's build-time generator prefixes. */
	readonly prefixes?: Readonly<{ color?: string }>;
	/** Native OKLCH is fixed; alpha naming mirrors the build-time generator option. */
	readonly colorFormat?: Readonly<{ alphaModifier?: string }>;
}

export interface RuntimeColorThemeResult<ColorNames extends readonly string[] = readonly string[]> {
	readonly theme: RuntimeColorTheme<ColorNames>;
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
