// src/utils.ts
import { toGamut, formatHex, formatRgb } from "culori";
import type { Oklch, P3, Rgb } from "culori";
import { formatNativeOklch, formatNativeOklchWithAlpha } from './color-css.js';

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
 * Convert OKLCH color to CSS oklch() string.
 *
 * Preserves author intent — no gamut mapping is applied. The CSS oklch() function
 * carries wide-gamut values natively; the browser handles gamut mapping per display
 * at render time, which is both higher-quality and per-display-correct compared to
 * a build-time sRGB clip. For formats that *require* sRGB (hex, rgb), use the
 * dedicated converters which clip as needed.
 */
export function oklchToCss(oklchColor: Oklch): string {
  return formatNativeOklch(oklchColor);
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
 * Apply alpha to OKLCH color.
 * Returns oklch() string with alpha channel — no gamut mapping (see oklchToCss).
 */
export function applyAlpha(oklchColor: Oklch, opacity: number): string {
  return formatNativeOklchWithAlpha(oklchColor, opacity);
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

/** Convert OKLCH to Display-P3 component bytes for profile-aware consumers. */
export function oklchToHexP3(oklchColor: Oklch): string {
  const p3 = toGamut('p3', 'oklch')(oklchColor) as P3;
  const toByte = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${toByte(p3.r)}${toByte(p3.g)}${toByte(p3.b)}`;
}

/** Add an alpha byte to Display-P3 component bytes. */
export function applyAlphaHexaP3(oklchColor: Oklch, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${oklchToHexP3(oklchColor)}${alpha}`;
}

/**
 * Format color based on specified format type
 */
export function formatColor(
  oklchColor: Oklch,
  format: 'hex' | 'hex-p3' | 'oklch' | 'rgb'
): string {
  switch (format) {
    case 'hex':
      return oklchToHex(oklchColor);
    case 'hex-p3':
      return oklchToHexP3(oklchColor);
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
  format: 'rgba' | 'oklch' | 'hexa' | 'hexa-p3'
): string {
  switch (format) {
    case 'rgba':
      return applyAlphaRgba(oklchColor, opacity);
    case 'hexa':
      return applyAlphaHexa(oklchColor, opacity);
    case 'hexa-p3':
      return applyAlphaHexaP3(oklchColor, opacity);
    case 'oklch':
    default:
      return applyAlpha(oklchColor, opacity);
  }
}
