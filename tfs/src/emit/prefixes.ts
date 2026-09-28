/**
 * Every generated name starts with one of these. Fixed and opinionated for now;
 * making them configurable later means accepting overrides of this one table.
 */
export const PREFIXES = {
	alpha: 'a',
	color: 'clr',
	spacing: 'sp',
	gap: 'gap',
	radius: 'bdr',
	width: 'bdw',
	shadow: 'shd',
	time: 't',
	easing: 'ease',
	fontSize: 'fs',
	text: 'text',
} as const;

/** Joins name parts with hyphens: name('clr', 'pri', 'a', 'lo') → 'clr-pri-a-lo'. */
export function name(...parts: readonly (string | number)[]): string {
	return parts.join('-');
}

/** Typography classes share the text prefix: `.text--label-s`. */
export const TEXT_CLASS_PREFIX = `${PREFIXES.text}--`;
