// src/utils.ts
import { toGamut, oklch as toOklch, formatHex, formatRgb, converter } from "culori";
import type { Oklch, Rgb } from "culori";

/**
 * Create an OKLCH color object
 * @param l - Lightness (0-1 scale)
 * @param c - Chroma (typically 0-0.5)
 * @param h - Hue (0-360 degrees)
 */
export function oklch(l: number, c: number, h: number): Oklch {
  return { mode: "oklch", l, c, h };
}

/**
 * Convert OKLCH to gamut-mapped RGB
 * Internal helper for format conversions
 */
function toGamutMappedRgb(oklchColor: Oklch): Rgb {
  return toGamut('rgb', 'oklch')(oklchColor);
}

/**
 * Convert OKLCH color to CSS oklch() string
 * Applies gamut mapping to ensure color is displayable in sRGB
 */
export function oklchToCss(oklchColor: Oklch): string {
  // Map to sRGB gamut while preserving perceptual intent
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  // Convert back to OKLCH for CSS output
  const gamutMapped = toOklch(gamutMappedRgb);

  // Format as oklch() string
  const l = gamutMapped.l.toFixed(4);
  const c = gamutMapped.c.toFixed(4);
  const h = (gamutMapped.h || 0).toFixed(2);

  return `oklch(${l} ${c} ${h})`;
}

/**
 * Convert OKLCH color to hex string
 * Applies gamut mapping to ensure color is displayable in sRGB
 */
export function oklchToHex(oklchColor: Oklch): string {
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  return formatHex(gamutMappedRgb);
}

/**
 * Convert OKLCH color to CSS rgb() string
 * Applies gamut mapping to ensure color is displayable in sRGB
 */
export function oklchToRgb(oklchColor: Oklch): string {
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  return formatRgb(gamutMappedRgb);
}

/**
 * Apply alpha to OKLCH color
 * Returns oklch() string with alpha channel
 */
export function applyAlpha(oklchColor: Oklch, opacity: number): string {
  // Map to sRGB gamut
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  // Convert back to OKLCH for CSS output
  const gamutMapped = toOklch(gamutMappedRgb);

  // Format as oklch() with alpha
  const l = gamutMapped.l.toFixed(4);
  const c = gamutMapped.c.toFixed(4);
  const h = (gamutMapped.h || 0).toFixed(2);
  const a = opacity.toFixed(4);

  return `oklch(${l} ${c} ${h} / ${a})`;
}

/**
 * Apply alpha to OKLCH color and return as rgba() string
 */
export function applyAlphaRgba(oklchColor: Oklch, opacity: number): string {
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  const r = Math.round(gamutMappedRgb.r * 255);
  const g = Math.round(gamutMappedRgb.g * 255);
  const b = Math.round(gamutMappedRgb.b * 255);

  // Format opacity: remove trailing zeros but keep meaningful precision
  const formattedOpacity = opacity === 0 ? '0' : parseFloat(opacity.toFixed(4)).toString();
  return `rgba(${r}, ${g}, ${b}, ${formattedOpacity})`;
}

/**
 * Apply alpha to OKLCH color and return as 8-digit hex with alpha
 */
export function applyAlphaHexa(oklchColor: Oklch, opacity: number): string {
  const gamutMappedRgb = toGamutMappedRgb(oklchColor);
  const hex = formatHex(gamutMappedRgb);
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');

  return `${hex}${alpha}`;
}

/**
 * Format color based on specified format type
 */
export function formatColor(
  oklchColor: Oklch,
  format: 'hex' | 'oklch' | 'rgb'
): string {
  switch (format) {
    case 'hex':
      return oklchToHex(oklchColor);
    case 'rgb':
      return oklchToRgb(oklchColor);
    case 'oklch':
    default:
      return oklchToCss(oklchColor);
  }
}

/**
 * Format color with alpha based on specified format type
 */
export function formatColorWithAlpha(
  oklchColor: Oklch,
  opacity: number,
  format: 'rgba' | 'oklch' | 'hexa'
): string {
  switch (format) {
    case 'rgba':
      return applyAlphaRgba(oklchColor, opacity);
    case 'hexa':
      return applyAlphaHexa(oklchColor, opacity);
    case 'oklch':
    default:
      return applyAlpha(oklchColor, opacity);
  }
}
