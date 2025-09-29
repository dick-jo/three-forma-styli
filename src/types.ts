// Updated types.ts with consistent patterns for all token types
import type { Lch } from "culori";

// COLOURS ---------------------------------------------- //
export interface ColorTokens {
  [tokenName: string]: Lch;
}

export interface ColorMode {
  isDefault?: boolean;
  tokens: ColorTokens;
  transparencySchedule?: TransparencySchedule;
  // luminositySchedule?: LuminositySchedule;
}

export interface TransparencySchedule {
  invisible: number;
  min: number;
  "light-x": number;
  light: number;
  heavy: number;
  "heavy-x": number;
  max: number;
}

// export interface LuminositySchedule {
//   min: number;
//   max: number;
// }

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
export interface TimeSystem {
  standard: {
    unit: string; // e.g., 'ms'
    base: number; // base increment (e.g., 100)
    min: number; // minimum time value
    range: number; // number of steps
  };
  animation: {
    unit: string; // e.g., 'ms'
    base: number; // base increment (e.g., 500)
    min: number; // minimum time value
    range: number; // number of steps
  };
  shorthands: {
    [name: string]: string; // Key is shorthand name, value is token reference (e.g., "1", "min", "anim-2")
  };
}

export interface TimeMode {
  isDefault?: boolean;
  tokens: TimeSystem;
}

// MAIN CONFIG ------------------------------------------ //
export interface DesignSystem {
  colors: {
    modes: Array<ColorMode & { name: string }>;
    transparencySchedule: TransparencySchedule;
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
