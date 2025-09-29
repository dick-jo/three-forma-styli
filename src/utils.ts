// src/utils.ts
import { formatHex, rgb } from "culori";
import type { Lch } from "culori";

// LCH WRAPPER ------------------------------------------ //
export function lch(l: number, c: number, h: number): Lch {
  return { mode: "lch", l, c, h };
}

// LCH to RGB ------------------------------------------- //
export function lchToHex(lchColor: Lch): string {
  return formatHex(lchColor);
}

// APPLY TRANSPARENCY ----------------------------------- //
export function applyTransparency(lchColor: Lch, opacity: number): string {
  // Create a copy of the color with alpha
  const colorWithAlpha: Lch = {
    ...lchColor,
    alpha: opacity, // Directly use input value as alpha
  };

  // Convert to RGB
  const rgbColor = rgb(colorWithAlpha);

  // Clamp values to ensure they're always in the 0-255 range
  const r = Math.max(0, Math.min(255, Math.round(rgbColor.r * 255)));
  const g = Math.max(0, Math.min(255, Math.round(rgbColor.g * 255)));
  const b = Math.max(0, Math.min(255, Math.round(rgbColor.b * 255)));

  // Format as rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
