/** Numbers without float noise: at most four decimals, no trailing zeros. */
export function num(value: number): string {
	return String(Number(value.toFixed(4)));
}

export function length(value: number, unit: string): string {
	return `${num(value)}${unit}`;
}

export function cssVar(name: string): string {
	return `var(--${name})`;
}

/** Joins name parts with hyphens: name('clr', 'pri', 'a', 'lo') → 'clr-pri-a-lo'. */
export function name(...parts: readonly (string | number)[]): string {
	return parts.join('-');
}
