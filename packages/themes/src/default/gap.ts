import { DesignSystem, GapMode } from "@three-forma-styli/core";

export const gapThemes: Record<string, GapMode> = {
  default: {
    isDefault: true,
    tokens: {
      spacingMode: "default", // Explicitly based on default spacing
      min: "min", // Use spacing min
      s: 1, // 1x base spacing
      l: 2, // 2x base spacing
      max: 3, // 3x base spacing
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
