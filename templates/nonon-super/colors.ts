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
  dark: {
    isDefault: true,
    tokens: {
      primary: lch(37.36, 1.2, 105.08),
      accent: lch(56.71, 87.71, 349.25),
      ink: lch(37.36, 1.2, 105.08),
      bg: lch(80.24, 10.73, 93.95),
      ev: lch(90.25, 14.66, 93.69),
      dv: lch(76.29, 9.82, 92.89),
      hvn: lch(98.56, 5.43, 204.61),
      hel: lch(27.97, 0, 0),
      swt: lch(78.11, 42.57, 314.93),
      slt: lch(67.8, 57.52, 301.2),
      "canon-white": lch(100, 0, 0),
      "canon-nonon-blue": lch(63.6, 57.41, 259.56),
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
