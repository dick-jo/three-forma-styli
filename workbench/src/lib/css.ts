/** Reads a custom property's current value as the browser resolves it on `element`. */
export function readToken(element: HTMLElement | undefined, token: string): string {
	return element ? getComputedStyle(element).getPropertyValue(`--${token}`).trim() : '';
}

export type Oklch = { l: number; c: number; h: number };

export function parseOklch(value: string): Oklch | undefined {
	const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(value);
	return match ? { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) } : undefined;
}

const round = (value: number) => String(Number(value.toFixed(4)));

/** Same output format as TFS's generated colours. */
export function formatOklch({ l, c, h }: Oklch, alpha?: number): string {
	const channels = `${round(l)} ${round(c)} ${round(h)}`;
	return alpha === undefined ? `oklch(${channels})` : `oklch(${channels} / ${round(alpha)})`;
}

/** Splits "12px" into 12 and "px". */
export function parseLength(value: string): { number: number; unit: string } {
	const match = /^(-?[\d.]+)([a-z%]*)$/.exec(value);
	return match ? { number: Number(match[1]), unit: match[2]! } : { number: 0, unit: '' };
}
