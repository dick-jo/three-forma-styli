// src/config/typography.ts
import { DesignSystem, TypographyMode } from "../types";

// Export typography themes as an object
export const TYPOGRAPHY_MODES: Record<string, TypographyMode> = {
  default: {
    isDefault: true,
    tokens: {
      unit: "rem",
      base: 0.875,
      min: 0.625,
      increment: 0.125,
      range: 12, // Gives sizes from min to min + (range * increment)
    },
  },
  small: {
    tokens: {
      unit: "rem",
      base: 0.75,
      min: 0.625,
      increment: 0.125,
      range: 12, // Smaller increments
    },
  },
  large: {
    tokens: {
      unit: "rem",
      base: 1.125,
      min: 0.75,
      increment: 0.5,
      range: 12,
    },
  },
};

// Export combined typography configuration
export const typography: DesignSystem["typography"] = {
  modes: Object.entries(TYPOGRAPHY_MODES).map(([name, theme]) => ({
    name,
    ...theme,
  })),
};
