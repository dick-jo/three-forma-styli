import type { OklchChannels } from '../runtime/oklch.js';

/** sRGB channels 0–1, as Figma expects. */
type Rgb = { readonly r: number; readonly g: number; readonly b: number };

function toLinearSrgb({ l, c, h }: OklchChannels): [number, number, number] {
	const radians = (h * Math.PI) / 180;
	const a = c * Math.cos(radians);
	const b = c * Math.sin(radians);
	const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
		-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
		-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
	];
}

const inGamut = (channels: number[]) =>
	channels.every((value) => value >= -1e-6 && value <= 1 + 1e-6);
const encode = (value: number) =>
	value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * OKLCH → sRGB. Colours outside sRGB keep their lightness and hue and lose only
 * as much chroma as needed (the CSS Color 4 approach), so Figma shows the
 * closest colour it can.
 */
export function oklchToSrgb(color: OklchChannels): Rgb {
	let linear = toLinearSrgb(color);
	if (!inGamut(linear)) {
		let [low, high] = [0, color.c];
		for (let step = 0; step < 24; step++) {
			const chroma = (low + high) / 2;
			if (inGamut(toLinearSrgb({ ...color, c: chroma }))) low = chroma;
			else high = chroma;
		}
		linear = toLinearSrgb({ ...color, c: low });
	}
	const [r, g, b] = linear.map((value) => Number(clamp(encode(clamp(value))).toFixed(6)));
	return { r: r!, g: g!, b: b! };
}
