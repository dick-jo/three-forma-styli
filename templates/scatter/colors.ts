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
  dark: {
    isDefault: true,
    tokens: {
      primary: lch(91.48, 13.74, 298.19),
      accent: lch(74.96, 43.87, 298.94),
      ink: lch(91.84, 13.74, 298.19),
      background: lch(14.2, 0, 0),
      surface: lch(18.03, 0.67, 285.39),
      "shimmer-a": lch(80.5, 37.1, 303.79),
      "shimmer-b": lch(89.86, 23.15, 66.06),
      "shimmer-c": lch(93.43, 34.15, 182.92),
      "sentiment-positive": lch(74.98, 74.07, 146.95),
      "sentiment-negative": lch(61.24, 69.83, 9.81),
      "canon-network-ethereum": lch(54.72, 60.63, 283.89),
      "canon-network-sanko": lch(45.56, 78.33, 38.63),
      "canon-network-base": lch(41.31, 98.64, 291.22),
      "canon-network-arbitrum": lch(62.47, 51.33, 257.17),
      "canon-network-polygon": lch(44.57, 88.25, 305.05),
      "canon-network-berachain": lch(40.2, 38.73, 51.41),
      "canon-network-blast": lch(75.86, 76.54, 99.24),
      "canon-network-abstract": lch(78.03, 60.6, 144.26),
      "canon-network-apechain": lch(41.21, 89.95, 290.47),
      "canon-network-ink": lch(39.36, 101.25, 303.07),
      "canon-network-superposition": lch(93.4, 0, 0),
      "canon-network-hyperliquid": lch(91.11, 60.32, 196.38),
      "canon-network-mantle": lch(86.55, 0, 0),
      "canon-network-sepolia": lch(49.5, 0, 0),
      "canon-network-berachain-bartio": lch(49.5, 0, 0),
      "canon-network-abstract-testnet": lch(49.5, 0, 0),
    },
    transparencySchedule: TRANSPARENCY_SCHEDULE,
  },
  light: {
    tokens: {
      primary: lch(22.01, 13.79, 296.94),
      accent: lch(49.85, 72.22, 298.04),
      ink: lch(22.01, 13.79, 296.94),
      background: lch(99.85, 0.72, 199.65),
      surface: lch(98.94, 0.5, 105.22),
      "canon-network-superposition": lch(27.97, 0, 0),
    },
  },
  automata: {
    tokens: {
      primary: lch(24.98, 5.93, 68.96),
      accent: lch(24.98, 5.93, 68.96),
      ink: lch(24.98, 5.93, 68.96),
      background: lch(81.94, 11.1, 96.37),
      surface: lch(95, 11.75, 97.12),
    },
  },
  monokuro: {
    tokens: {
      primary: lch(100, 0, 0), // Pure white
      ink: lch(100, 0, 0), // Pure white
      background: lch(0, 0, 0), // Pure black
      surface: lch(9.8, 0, 0), // #181818 equivalent
    },
    transparencySchedule: {
      invisible: 0.0,
      min: 0.125, // Custom value for monokuro
      "light-x": 0.1675, // Custom value for monokuro
      light: 0.25,
      heavy: 0.68,
      "heavy-x": 0.85,
      max: 0.93,
    },
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
