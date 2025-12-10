// Color system configuration
import { ColorMode, DesignSystem, TransparencySchedule, oklch } from "@three-forma-styli/core";

// Define transparency schedule
export const TRANSPARENCY_SCHEDULE: TransparencySchedule = {
  min: 0.07,
  "lo-x": 0.125,
  lo: 0.25,
  hi: 0.68,
  "hi-x": 0.85,
  max: 0.93,
};

// Export color themes directly as an object
export const COLOR_MODES: Record<string, ColorMode> = {
  dark: {
    isDefault: true,
    tokens: {
      bg: oklch(0.2603, 0.0000, 129.63),      // Very dark background
      ev: oklch(0.2935, 0.0018, 286.29),      // Elevated surface
      primary: oklch(0.7969, 0.1178, 296.37), // Purple/pink brand color
      neutral: oklch(0.9302, 0.0371, 299.19), // Light desaturated purple
      ink: oklch(0.9333, 0.0371, 299.20),     // Text/icons
      positive: oklch(0.7625, 0.2030, 150.49), // Green
      negative: oklch(0.6875, 0.2113, 7.38),   // Red
    },
    transparencySchedule: TRANSPARENCY_SCHEDULE,
  },
};

// Export combined color configuration
export const color: DesignSystem["colors"] = {
  modes: Object.entries(COLOR_MODES).map(([name, mode]) => ({
    name,
    ...mode,
  })),
  transparencySchedule: TRANSPARENCY_SCHEDULE,
};
