// src/config/time.ts
import { DesignSystem, TimeMode } from "@three-forma-styli/core";

// Time modes - default gets unprefixed tokens (--t-1), others get prefixed (--t-anim-1)
const TIME_MODES: Record<string, TimeMode> = {
  default: {
    isDefault: true,
    tokens: {
      unit: "ms",
      base: 100,
      min: 50,
      range: 10,
    },
  },
  anim: {
    tokens: {
      unit: "ms",
      base: 1000,
      min: 500,
      range: 10,
    },
  },
};

// Export combined time configuration
export const time: DesignSystem["time"] = {
  modes: Object.entries(TIME_MODES).map(([name, mode]) => ({
    name,
    ...mode,
  })),
};
