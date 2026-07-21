import { describe, expect, it } from 'vitest';
import { applyAlpha, oklchToCss, oklchToHex, oklchToHexP3 } from './utils.js';

describe('OKLCH formatting', () => {
	const wideGamut = { mode: 'oklch' as const, l: 0.7, c: 0.4, h: 150 };

	it('preserves wide-gamut author values in native OKLCH output', () => {
		expect(oklchToCss(wideGamut)).toBe('oklch(0.7000 0.4000 150.00)');
		expect(applyAlpha(wideGamut, 0.5)).toBe('oklch(0.7000 0.4000 150.00 / 0.5000)');
	});

	it('still gamut maps formats that are limited to sRGB', () => {
		expect(oklchToHex(wideGamut)).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('retains a distinct Display-P3 conversion for profile-aware consumers', () => {
		expect(oklchToHexP3(wideGamut)).toMatch(/^#[0-9a-f]{6}$/i);
		expect(oklchToHexP3(wideGamut)).not.toBe(oklchToHex(wideGamut));
	});
});
