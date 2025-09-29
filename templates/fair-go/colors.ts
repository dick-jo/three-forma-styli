// src/config/colors.ts
import { ColorMode, DesignSystem, TransparencySchedule } from "../types";
import { lch } from "../utils";

// Define transparency schedule
export const TRANSPARENCY_SCHEDULE: TransparencySchedule = {
  invisible: 0.0,
  min: 0.07,
  "light-x": 0.125,
  light: 0.25,
  heavy: 0.68,
  "heavy-x": 0.85,
  max: 0.93,
};

// Export color themes directly as an object
export const COLOR_MODES: Record<string, ColorMode> = {
  default: {
    isDefault: true,
    tokens: {
      primary: lch(23.27, 45.08, 20.32),
      "primary-heavy": lch(6.02, 25.54, 17.22),
      ink: lch(23.27, 45.08, 20.32),
      bg: lch(97.77, 9.56, 88.8),
      ev: lch(100, 0, 0),
      dv: lch(89.79, 10.36, 87.44),
      "dv-heavy": lch(58.66, 31.03, 80.39),
      "sentiment-positive": lch(67.44, 67.44, 148.22),
      "sentiment-negative": lch(56.67, 83.18, 21.58),
    },
    transparencySchedule: TRANSPARENCY_SCHEDULE,
  },
};

// Export combined color configuration
export const colors: DesignSystem["colors"] = {
  modes: Object.entries(COLOR_MODES).map(([name, mode]) => ({
    name,
    ...mode,
  })),
  transparencySchedule: TRANSPARENCY_SCHEDULE,
};
