// Spacing system configuration
import { DesignSystem, SpacingMode } from "@three-forma-styli/core";

// Export spacing themes directly as an object
export const SPACING_MODES: Record<string, SpacingMode> = {
  default: {
    isDefault: true,
    tokens: {
      unit: "px",
      base: 8,
      min: 4,
      range: 12,
    },
  },
  small: {
    tokens: {
      unit: "px",
      base: 4,
      min: 2,
      range: 12,
    },
  },
  large: {
    tokens: {
      unit: "px",
      base: 16,
      min: 8,
      range: 12,
    },
  },
};

// Export combined spacing configuration
export const spacing: DesignSystem["spacing"] = {
  modes: Object.entries(SPACING_MODES).map(([name, theme]) => ({
    name,
    ...theme,
  })),
};
