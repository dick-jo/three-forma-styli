// src/config/time.ts
import { DesignSystem, TimeMode } from "../types";

// Export time modes
const TIME_MODES: Record<string, TimeMode> = {
  default: {
    isDefault: true,
    tokens: {
      standard: {
        unit: "ms",
        base: 100, // Base increment of 100ms
        min: 50, // Minimum time of 50ms
        range: 10, // 10 steps (from 1 to 10)
      },
      animation: {
        unit: "ms",
        base: 1000, // Base increment of 1000ms (1s)
        min: 500, // Minimum time of 500ms
        range: 10, // 10 steps (from 1 to 10)
      },
      shorthands: {
        // Common UI interaction timings
        "ix-hover": "2", // 100ms - standard hover timing
        "ix-active": "1", // 50ms - quick active state
        "ix-transition": "3", // 200ms - general transition timing
      },
    },
  },
  // Additional modes can be added here as needed
};

// Export combined time configuration
export const time: DesignSystem["time"] = {
  modes: Object.entries(TIME_MODES).map(([name, mode]) => ({
    name,
    ...mode,
  })),
};
