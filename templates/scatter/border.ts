// src/config/border.ts
import { BorderRadiusMode, BorderWidthMode, BorderSystem } from "../types";

// Export border radius modes
const BORDER_RADIUS_MODES: Record<string, BorderRadiusMode> = {
  default: {
    isDefault: true,
    tokens: {
      spacingMode: "default", // Explicitly based on default spacing
      unit: "px", // Default unit is pixels
      min: "min", // Use spacing min
      s: 1, // 1x base spacing
      l: 2, // 2x base spacing
      max: 3, // 3x base spacing
    },
  },
  small: {
    tokens: {
      spacingMode: "small", // Explicitly based on small spacing
      unit: "px",
      min: "min",
      s: 1,
      l: 2,
      max: 3,
    },
  },
  large: {
    tokens: {
      spacingMode: "large", // Explicitly based on large spacing
      unit: "px",
      min: "min",
      s: 1,
      l: 2,
      max: 3,
    },
  },
};

// Export border width modes with discrete values
const BORDER_WIDTH_MODES: Record<string, BorderWidthMode> = {
  default: {
    isDefault: true,
    tokens: {
      unit: "px",
      value: 1, // 1px border width
    },
  },
  small: {
    tokens: {
      unit: "px",
      value: 0.5, // 0.5px border width
    },
  },
  large: {
    tokens: {
      unit: "px",
      value: 2, // 2px border width
    },
  },
};

// Export combined border configuration
export const border: BorderSystem = {
  radius: {
    modes: Object.entries(BORDER_RADIUS_MODES).map(([name, mode]) => ({
      name,
      ...mode,
    })),
  },
  width: {
    modes: Object.entries(BORDER_WIDTH_MODES).map(([name, mode]) => ({
      name,
      ...mode,
    })),
  },
  // Additional border properties can be added here in the future
};
