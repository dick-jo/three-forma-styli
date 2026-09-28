/** An OKLCH colour as plain data: lightness 0–1, chroma ≥ 0, hue in degrees. */
export type OklchChannels = { readonly l: number; readonly c: number; readonly h: number };

function num(value: number): string {
	return String(Number(value.toFixed(4)));
}

/**
 * Native `oklch()` CSS. Values are not gamut-mapped, so wide-gamut colours keep
 * their chroma and the browser renders them for the display. Build output and
 * runtime themes both use this, so they always match.
 */
export function formatOklch(color: OklchChannels, alpha?: number): string {
	const channels = `${num(color.l)} ${num(color.c)} ${num(color.h)}`;
	return alpha === undefined ? `oklch(${channels})` : `oklch(${channels} / ${num(alpha)})`;
}
