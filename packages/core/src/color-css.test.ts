import { describe, expect, it } from 'vitest';
import { formatNativeOklch, formatNativeOklchWithAlpha } from './color-css.js';

describe('native OKLCH formatting', () => {
	it('preserves authored wide-gamut chroma at stable precision', () => {
		expect(formatNativeOklch({ l: 0.38, c: 0.22, h: 135 })).toBe('oklch(0.3800 0.2200 135.00)');
	});

	it('formats alpha without converting the color through sRGB', () => {
		expect(formatNativeOklchWithAlpha({ l: 0.38, c: 0.22, h: 135 }, 0.85)).toBe(
			'oklch(0.3800 0.2200 135.00 / 0.8500)'
		);
	});
});
