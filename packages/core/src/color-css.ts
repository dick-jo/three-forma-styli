/** Minimal structural color shape used by dependency-free native CSS formatting. */
export interface NativeOklchColor {
	readonly l: number;
	readonly c?: number;
	readonly h?: number;
}

/** Format native OKLCH using TFS's stable build-time precision. */
export function formatNativeOklch(color: NativeOklchColor): string {
	const l = color.l.toFixed(4);
	const c = (color.c ?? 0).toFixed(4);
	const h = (color.h || 0).toFixed(2);
	return `oklch(${l} ${c} ${h})`;
}

/** Format native OKLCH with alpha using TFS's stable build-time precision. */
export function formatNativeOklchWithAlpha(color: NativeOklchColor, opacity: number): string {
	const l = color.l.toFixed(4);
	const c = (color.c ?? 0).toFixed(4);
	const h = (color.h || 0).toFixed(2);
	const alpha = opacity.toFixed(4);
	return `oklch(${l} ${c} ${h} / ${alpha})`;
}
