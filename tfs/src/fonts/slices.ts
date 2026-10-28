import type { Font } from 'fontkit';

/**
 * Each font file is split by Unicode range into separate files, declared with
 * `unicode-range`, so a page downloads only the slices its characters need.
 * `latin` and `latin-ext` are Google Fonts' ranges (as served by its CSS API,
 * 2026-10); `other` is everything else the font covers, so no glyph is lost.
 */
const SLICES = ['latin', 'latin-ext', 'other'] as const;
export type Slice = (typeof SLICES)[number];

type Range = readonly [number, number];

function parse(ranges: string): Range[] {
	return ranges.split(', ').map((range) => {
		const [start, end = start] = range.replace('U+', '').split('-');
		return [parseInt(start!, 16), parseInt(end, 16)];
	});
}

const GOOGLE: Record<Exclude<Slice, 'other'>, Range[]> = {
	latin: parse(
		'U+0-FF, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
	),
	'latin-ext': parse(
		'U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'
	),
};

const within = (ranges: readonly Range[], codePoint: number) =>
	ranges.some(([start, end]) => codePoint >= start && codePoint <= end);

/** Sorted code points as the fewest ranges. */
function compress(codePoints: readonly number[]): Range[] {
	const ranges: [number, number][] = [];
	for (const codePoint of codePoints) {
		const last = ranges.at(-1);
		if (last && codePoint === last[1] + 1) last[1] = codePoint;
		else ranges.push([codePoint, codePoint]);
	}
	return ranges;
}

/** CSS `unicode-range` value; FontTools' `--unicodes` accepts it too. */
function format(ranges: readonly Range[]): string {
	const hex = (codePoint: number) => codePoint.toString(16).toUpperCase();
	return ranges
		.map(([start, end]) => (start === end ? `U+${hex(start)}` : `U+${hex(start)}-${hex(end)}`))
		.join(', ');
}

/** The slices a font has characters for, each with its `unicode-range`. */
export function slicesOf(font: Font): { readonly slice: Slice; readonly unicodeRange: string }[] {
	const covered = [...new Set(font.characterSet)].sort((a, b) => a - b);
	const google = Object.entries(GOOGLE) as [Slice, Range[]][];
	const named = google
		.filter(([, ranges]) => covered.some((codePoint) => within(ranges, codePoint)))
		.map(([slice, ranges]) => ({ slice, unicodeRange: format(ranges) }));
	const rest = covered.filter(
		(codePoint) => !google.some(([, ranges]) => within(ranges, codePoint))
	);
	return rest.length === 0
		? named
		: [...named, { slice: 'other', unicodeRange: format(compress(rest)) }];
}
