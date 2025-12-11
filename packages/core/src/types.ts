// Updated types.ts with consistent patterns for all token types
import type { Oklch } from "culori";

// COLOURS ---------------------------------------------- //

/**
 * Color tokens for a design system.
 *
 * Uses OKLCH color space for perceptually uniform color manipulation:
 * - L (lightness): 0-1 scale (0 = black, 1 = white)
 * - C (chroma): 0-0.5 typical range (saturation)
 * - H (hue): 0-360 degrees
 *
 * Recommended core colors (7):
 * - bg: Page background
 * - ev: Elevated surfaces (cards, panels)
 * - pri: Main brand/action color
 * - neu: Achromatic scale (grays)
 * - ink: Text and icons
 * - pos: Success/positive sentiment
 * - neg: Error/negative sentiment
 *
 * But you can use any color names you want.
 */
export type ColorTokens = Record<string, Oklch>;

/**
 * Default color mode - defines the base color tokens
 */
export interface DefaultColorMode {
  isDefault: true;
  tokens: ColorTokens;
  alphaSchedule?: AlphaSchedule;
}

/**
 * Override color mode - only needs to specify tokens that differ from default
 */
export interface OverrideColorMode {
  isDefault?: false;
  tokens: ColorTokens;  // Partial by nature - only override what changes
  alphaSchedule?: AlphaSchedule;
}

/**
 * Color mode can be either default (full tokens) or override (partial tokens)
 */
export type ColorMode = DefaultColorMode | OverrideColorMode;

/**
 * Alpha schedule defines opacity levels for alpha variants.
 * Each key becomes a suffix (e.g., "lo" -> --clr-pri-a-lo)
 * Each value is between 0 (fully transparent) and 1 (fully opaque).
 *
 * Recommended schedule (least opaque to most opaque):
 *   { non: 0, min: 0.07, "lo-x": 0.125, lo: 0.25, hi: 0.68, "hi-x": 0.85, max: 0.93 }
 *
 * Simple alternative:
 *   { non: 0, low: 0.25, high: 0.75 }
 */
export interface AlphaSchedule {
  [level: string]: number;
}

// SPACING ---------------------------------------------- //
export interface SpacingSystem {
  unit: string;
  base: number;
  min: number;
  range: number;
}

export interface SpacingMode {
  isDefault?: boolean;
  tokens: SpacingSystem;
}

// GAP ---------------------------------------------- //
export interface GapSystem {
  spacingMode?: string; // If not specified, uses the default spacing mode
  unit?: string;
  min: number | "min";
  s: number | "min";
  l: number | "min";
  max: number | "min";
}

export interface GapMode {
  isDefault?: boolean;
  tokens: GapSystem;
}

// TYPOGRAPHY ------------------------------------------- //
export interface FontSizeSystem {
  unit: string; // e.g., 'rem'
  base: number; // Base font size (1rem = 16px typically)
  min: number; // Minimum font size (smaller than base)
  increment: number; // Fixed increment between sizes (e.g., 0.25rem)
  range: number; // Number of steps in the scale
}

export interface TypographyMode {
  isDefault?: boolean;
  tokens: FontSizeSystem;
}

// BORDER ----------------------------------------------- //
export interface BorderRadiusSystem {
  spacingMode?: string; // If not specified, uses the default spacing mode
  unit?: string;
  min: number | "min";
  s: number | "min";
  l: number | "min";
  max: number | "min";
}

export interface BorderRadiusMode {
  isDefault?: boolean;
  tokens: BorderRadiusSystem;
}

export interface BorderWidthSystem {
  unit: string; // Unit for border width (px, rem, etc.)
  value: number; // Single discrete value
}

export interface BorderWidthMode {
  isDefault?: boolean;
  tokens: BorderWidthSystem;
}

export interface BorderSystem {
  radius: {
    modes: Array<BorderRadiusMode & { name: string }>;
  };
  width: {
    modes: Array<BorderWidthMode & { name: string }>;
  };
  // Future border properties can be added here
}

// TIME ------------------------------------------------- //

/**
 * Time system tokens.
 * Generates tokens using multiplicative formula: t-{n} = base * n
 *
 * The default mode gets unprefixed tokens (--t-1, --t-2, etc.)
 * Other modes get their name as prefix (--t-anim-1, --t-anim-2, etc.)
 *
 * Example:
 *   TIME_MODES = {
 *     default: { isDefault: true, tokens: { unit: 'ms', base: 100, min: 50, range: 10 } },
 *     anim: { tokens: { unit: 'ms', base: 1000, min: 500, range: 10 } }
 *   }
 *   // Generates: --t-1, --t-2, ..., --t-anim-1, --t-anim-2, ...
 */
export interface TimeSystem {
  unit: string;   // e.g., 'ms'
  base: number;   // base increment (e.g., 100)
  min: number;    // minimum time value
  range: number;  // number of steps
}

export interface TimeMode {
  isDefault?: boolean;
  tokens: TimeSystem;
}

// MAIN CONFIG ------------------------------------------ //

/**
 * Full design system with all token families.
 * Use this when generating a complete design system.
 */
export interface DesignSystem {
  colors: {
    modes: Array<ColorMode & { name: string }>;
    alphaSchedule: AlphaSchedule;
  };
  spacing: {
    modes: Array<SpacingMode & { name: string }>;
  };
  gap: {
    modes: Array<GapMode & { name: string }>;
  };
  typography: {
    modes: Array<TypographyMode & { name: string }>;
  };
  border: BorderSystem;
  time: {
    modes: Array<TimeMode & { name: string }>;
  };
}

/**
 * Partial design system - all token families optional.
 * Use this when generating only specific token types (e.g., just colors).
 *
 * Note: Some families have dependencies:
 * - gap requires spacing (for resolving references)
 * - border.radius requires spacing (for resolving references)
 *
 * @example
 * ```ts
 * // Generate only colors
 * const ir = generate({
 *   colors: {
 *     modes: [{ name: 'default', isDefault: true, tokens: { bg, primary, ink } }],
 *     alphaSchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 },
 *   },
 * });
 * ```
 */
export interface PartialDesignSystem {
  colors?: {
    modes: Array<ColorMode & { name: string }>;
    alphaSchedule: AlphaSchedule;
  };
  spacing?: {
    modes: Array<SpacingMode & { name: string }>;
  };
  gap?: {
    modes: Array<GapMode & { name: string }>;
  };
  typography?: {
    modes: Array<TypographyMode & { name: string }>;
  };
  border?: BorderSystem;
  time?: {
    modes: Array<TimeMode & { name: string }>;
  };
}

// GENERATOR CONFIG ------------------------------------- //

/**
 * Configuration for CSS variable generation.
 * This is user-configurable and controls output formatting.
 */
export interface GeneratorConfig {
  /** CSS variable name prefixes */
  prefixes?: {
    color?: string;        // Default: "clr" (--clr-primary)
    spacing?: string;      // Default: "sp" (--sp-1)
    gap?: string;          // Default: "gap" (--gap-s)
    typography?: string;   // Default: "fs" (--fs-1)
    borderRadius?: string; // Default: "bdr" (--bdr-s)
    borderWidth?: string;  // Default: "bdw" (--bdw)
    time?: string;         // Default: "t" (--t-1)
  };

  /** Separators for building variable names */
  separators?: {
    modifier?: string; // Default: "-" (for "-a-" in --clr-primary-a-lo)
    value?: string;    // Default: "-" (for "-lo" in --clr-primary-a-lo)
  };

  /** CSS selectors for output */
  selectors?: {
    root?: string;      // Default: ":root"
    themeMode?: string; // Default: '[data-theme-mode="{mode}"]'
  };

  /** Color output formats */
  colorFormats?: {
    base?: 'hex' | 'oklch' | 'rgb';     // Default: "oklch" - Format for opaque colors
    alpha?: 'rgba' | 'oklch' | 'hexa';  // Default: "oklch" - Format for transparent colors
    alphaModifier?: string;             // Default: "a" - Modifier for alpha variants (e.g., "a" for --clr-primary-a-min, "tr" for --clr-primary-tr-min)
  };
}
