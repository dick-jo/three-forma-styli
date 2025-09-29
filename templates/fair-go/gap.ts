import { DesignSystem, GapMode } from "../types";

export const gapThemes: Record<string, GapMode> = {
  default: {
    isDefault: true,
    tokens: {
      spacingMode: "default",
      min: "min",
      s: 1,
      l: 2,
      max: 3,
    },
  },
  small: {
    tokens: {
      spacingMode: "small", // Explicitly based on small spacing
      min: "min",
      s: 1,
      l: 2,
      max: 3,
    },
  },
  large: {
    tokens: {
      spacingMode: "large", // Explicitly based on large spacing
      min: "min",
      s: 1,
      l: 2,
      max: 3,
    },
  },
};

// Export combined gap configuration
export const gap: DesignSystem["gap"] = {
  modes: Object.entries(gapThemes).map(([name, theme]) => ({
    name,
    ...theme,
  })),
};
