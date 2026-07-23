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
export interface RuntimeColorTheme {
	readonly polarity: 'negative' | 'positive';
	readonly colors: Readonly<Record<string, RuntimeOklchColor>>;
}

export interface RuntimeColorThemeSchema {
	/** Exact color keys that the runtime payload must contain. */
	readonly colorNames: readonly string[];
}

export interface RuntimeLuminanceConfig {
	readonly minDelta: number;
	readonly backgroundColors: readonly string[];
	readonly foregroundColors: readonly string[];
}

export interface RuntimeColorThemeConfig extends RuntimeColorThemeSchema {
	/** Optional alpha variants. No variants are generated when omitted. */
	readonly alphaSchedule?: Readonly<Record<string, number>>;
	readonly luminance: RuntimeLuminanceConfig;
	/** Mirrors the color member of TFS's build-time generator prefixes. */
	readonly prefixes?: Readonly<{ color?: string }>;
	/** Native OKLCH is fixed; alpha naming mirrors the build-time generator option. */
	readonly colorFormat?: Readonly<{ alphaModifier?: string }>;
}

export interface RuntimeColorThemeResult {
	readonly theme: RuntimeColorTheme;
	/** Null-prototype, frozen record ready for DOM assignment. */
	readonly customProperties: Readonly<Record<string, string>>;
	/** Existing TFS palette-separation diagnostics, explicitly measured in OKLCH L. */
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
