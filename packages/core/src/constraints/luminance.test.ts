import { describe, it, expect } from 'vitest';
import { validateLuminance } from './luminance';
import { oklch } from '../utils';

describe('validateLuminance', () => {
	// ===========================================
	// NEGATIVE POLARITY (dark backgrounds)
	// ===========================================

	describe('negative polarity (dark backgrounds)', () => {
		it('returns valid when delta exceeds minimum', () => {
			const colors = {
				bg: oklch(0.2, 0, 0), // dark
				primary: oklch(0.8, 0, 0), // light
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(true);
			expect(result.actualDelta).toBeCloseTo(0.6, 2);
		});

		it('returns invalid when delta is below minimum', () => {
			const colors = {
				bg: oklch(0.4, 0, 0),
				primary: oklch(0.5, 0, 0), // too close
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(false);
			expect(result.actualDelta).toBeCloseTo(0.1, 2);
		});

		it('returns valid when delta slightly exceeds minimum', () => {
			const colors = {
				bg: oklch(0.29, 0, 0),
				primary: oklch(0.7, 0, 0), // 0.41 delta
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(true);
			expect(result.actualDelta).toBeCloseTo(0.41, 2);
		});

		it('uses max background and min foreground for delta calculation', () => {
			// With multiple colors, delta is calculated from the closest pair
			const colors = {
				bg: oklch(0.1, 0, 0), // darkest background
				ev: oklch(0.25, 0, 0), // brightest background (this is used)
				primary: oklch(0.7, 0, 0), // dimmest foreground (this is used)
				ink: oklch(0.9, 0, 0), // brightest foreground
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary', 'ink'],
			});

			// Delta should be minFg (0.7) - maxBg (0.25) = 0.45
			expect(result.actualDelta).toBeCloseTo(0.45, 2);
			expect(result.deltaValid).toBe(true);
		});

		it('calculates correct constraint boundaries', () => {
			const colors = {
				bg: oklch(0.2, 0, 0),
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Background MAX = minFg - minDelta = 0.8 - 0.4 = 0.4
			expect(result.backgroundConstraint).toBeCloseTo(0.4, 2);
			expect(result.backgroundConstraintType).toBe('max');

			// Foreground MIN = maxBg + minDelta = 0.2 + 0.4 = 0.6
			expect(result.foregroundConstraint).toBeCloseTo(0.6, 2);
			expect(result.foregroundConstraintType).toBe('min');
		});
	});

	// ===========================================
	// POSITIVE POLARITY (light backgrounds)
	// ===========================================

	describe('positive polarity (light backgrounds)', () => {
		it('returns valid when delta exceeds minimum', () => {
			const colors = {
				bg: oklch(0.9, 0, 0), // light
				primary: oklch(0.3, 0, 0), // dark
			};

			const result = validateLuminance(colors, {
				polarity: 'positive',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(true);
			expect(result.actualDelta).toBeCloseTo(0.6, 2);
		});

		it('returns invalid when delta is below minimum', () => {
			const colors = {
				bg: oklch(0.6, 0, 0),
				primary: oklch(0.5, 0, 0), // too close
			};

			const result = validateLuminance(colors, {
				polarity: 'positive',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(false);
			expect(result.actualDelta).toBeCloseTo(0.1, 2);
		});

		it('uses min background and max foreground for delta calculation', () => {
			const colors = {
				bg: oklch(0.95, 0, 0), // brightest background
				ev: oklch(0.85, 0, 0), // dimmest background (this is used)
				primary: oklch(0.4, 0, 0), // brightest foreground (this is used)
				ink: oklch(0.2, 0, 0), // dimmest foreground
			};

			const result = validateLuminance(colors, {
				polarity: 'positive',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary', 'ink'],
			});

			// Delta should be minBg (0.85) - maxFg (0.4) = 0.45
			expect(result.actualDelta).toBeCloseTo(0.45, 2);
			expect(result.deltaValid).toBe(true);
		});

		it('calculates correct constraint boundaries', () => {
			const colors = {
				bg: oklch(0.9, 0, 0),
				primary: oklch(0.3, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'positive',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Background MIN = maxFg + minDelta = 0.3 + 0.4 = 0.7
			expect(result.backgroundConstraint).toBeCloseTo(0.7, 2);
			expect(result.backgroundConstraintType).toBe('min');

			// Foreground MAX = minBg - minDelta = 0.9 - 0.4 = 0.5
			expect(result.foregroundConstraint).toBeCloseTo(0.5, 2);
			expect(result.foregroundConstraintType).toBe('max');
		});
	});

	// ===========================================
	// PER-COLOR DIAGNOSTICS
	// ===========================================

	describe('per-color diagnostics', () => {
		it('returns color diagnostics for negative polarity', () => {
			const colors = {
				bg: oklch(0.2, 0, 0),
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Background constraint (max) = minFg - minDelta = 0.8 - 0.4 = 0.4
			// Foreground constraint (min) = maxBg + minDelta = 0.2 + 0.4 = 0.6

			expect(result.colors.bg.group).toBe('background');
			expect(result.colors.bg.luminance).toBeCloseTo(0.2, 5);
			expect(result.colors.bg.headroom).toBeCloseTo(0.2, 5); // 0.4 (max) - 0.2 (luminance) = 0.2

			expect(result.colors.primary.group).toBe('foreground');
			expect(result.colors.primary.luminance).toBeCloseTo(0.8, 5);
			expect(result.colors.primary.headroom).toBeCloseTo(0.2, 5); // 0.8 (luminance) - 0.6 (min) = 0.2
		});

		it('returns color diagnostics for positive polarity', () => {
			const colors = {
				bg: oklch(0.9, 0, 0),
				primary: oklch(0.3, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'positive',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Background constraint (min) = maxFg + minDelta = 0.3 + 0.4 = 0.7
			// Foreground constraint (max) = minBg - minDelta = 0.9 - 0.4 = 0.5

			expect(result.colors.bg.group).toBe('background');
			expect(result.colors.bg.luminance).toBeCloseTo(0.9, 5);
			expect(result.colors.bg.headroom).toBeCloseTo(0.2, 5); // 0.9 (luminance) - 0.7 (min) = 0.2

			expect(result.colors.primary.group).toBe('foreground');
			expect(result.colors.primary.luminance).toBeCloseTo(0.3, 5);
			expect(result.colors.primary.headroom).toBeCloseTo(0.2, 5); // 0.5 (max) - 0.3 (luminance) = 0.2
		});

		it('shows zero headroom for colors at the constraint boundary', () => {
			const colors = {
				bg: oklch(0.3, 0, 0), // at the max (0.7 - 0.4 = 0.3)
				ev: oklch(0.15, 0, 0), // safe
				primary: oklch(0.7, 0, 0), // at the min (0.3 + 0.4 = 0.7)
				ink: oklch(0.9, 0, 0), // safe
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary', 'ink'],
			});

			// Background constraint (max) = minFg - minDelta = 0.7 - 0.4 = 0.3
			// Foreground constraint (min) = maxBg + minDelta = 0.3 + 0.4 = 0.7

			expect(result.colors.bg.headroom).toBeCloseTo(0, 5); // at the max
			expect(result.colors.ev.headroom).toBeCloseTo(0.15, 5); // 0.3 - 0.15 = 0.15
			expect(result.colors.primary.headroom).toBeCloseTo(0, 5); // at the min
			expect(result.colors.ink.headroom).toBeCloseTo(0.2, 5); // 0.9 - 0.7 = 0.2
		});

		it('shows negative headroom for violating colors', () => {
			const colors = {
				bg: oklch(0.5, 0, 0), // violating (over the max of 0.3)
				primary: oklch(0.7, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Background constraint (max) = minFg - minDelta = 0.7 - 0.4 = 0.3
			// bg luminance 0.5 is above max 0.3, so headroom is negative
			expect(result.colors.bg.headroom).toBeCloseTo(-0.2, 5); // 0.3 - 0.5 = -0.2
			expect(result.deltaValid).toBe(false);
		});

		it('returns diagnostics for multiple colors in each group', () => {
			const colors = {
				bg: oklch(0.1, 0, 0),
				ev: oklch(0.25, 0, 0),
				primary: oklch(0.7, 0, 0),
				neutral: oklch(0.75, 0, 0),
				ink: oklch(0.9, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary', 'neutral', 'ink'],
			});

			// Should have all 5 colors in diagnostics
			expect(Object.keys(result.colors)).toHaveLength(5);

			// Background colors
			expect(result.colors.bg.group).toBe('background');
			expect(result.colors.ev.group).toBe('background');

			// Foreground colors
			expect(result.colors.primary.group).toBe('foreground');
			expect(result.colors.neutral.group).toBe('foreground');
			expect(result.colors.ink.group).toBe('foreground');
		});

		it('returns empty colors object for empty groups', () => {
			const colors = {
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: [],
				foregroundColors: ['primary'],
			});

			expect(result.colors).toEqual({});
		});

		it('omits missing colors from diagnostics', () => {
			const colors = {
				bg: oklch(0.2, 0, 0),
				// primary is missing
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'],
			});

			// Should only include bg since primary doesn't exist
			expect(Object.keys(result.colors)).toHaveLength(0);
			// Actually, bg is included but the foreground group is empty
			// so we hit the early return with empty colors
		});

		it('includes only defined colors in diagnostics', () => {
			const colors: Record<string, ReturnType<typeof oklch> | undefined> = {
				bg: oklch(0.2, 0, 0),
				ev: undefined,
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary'],
			});

			// ev should not be in the colors object since it's undefined
			expect(result.colors.bg).toBeDefined();
			expect(result.colors.ev).toBeUndefined();
			expect(result.colors.primary).toBeDefined();
			expect(Object.keys(result.colors)).toHaveLength(2);
		});
	});

	// ===========================================
	// EDGE CASES
	// ===========================================

	describe('edge cases', () => {
		it('handles empty background colors array', () => {
			const colors = {
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: [],
				foregroundColors: ['primary'],
			});

			expect(result.deltaValid).toBe(false);
			expect(result.actualDelta).toBe(0);
		});

		it('handles empty foreground colors array', () => {
			const colors = {
				bg: oklch(0.2, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: [],
			});

			expect(result.deltaValid).toBe(false);
			expect(result.actualDelta).toBe(0);
		});

		it('handles missing colors gracefully', () => {
			const colors = {
				bg: oklch(0.2, 0, 0),
				// primary is missing
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg'],
				foregroundColors: ['primary'], // references missing color
			});

			expect(result.deltaValid).toBe(false);
		});

		it('ignores undefined colors in the record', () => {
			const colors: Record<string, ReturnType<typeof oklch> | undefined> = {
				bg: oklch(0.2, 0, 0),
				ev: undefined, // explicitly undefined
				primary: oklch(0.8, 0, 0),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['bg', 'ev'],
				foregroundColors: ['primary'],
			});

			// Should still work, just ignores ev
			expect(result.deltaValid).toBe(true);
			expect(result.actualDelta).toBeCloseTo(0.6, 2);
		});

		it('works with arbitrary color names', () => {
			const colors = {
				myCustomBackground: oklch(0.15, 0, 0),
				ethereumBlue: oklch(0.75, 0.1, 250),
			};

			const result = validateLuminance(colors, {
				polarity: 'negative',
				minDelta: 0.4,
				backgroundColors: ['myCustomBackground'],
				foregroundColors: ['ethereumBlue'],
			});

			expect(result.deltaValid).toBe(true);
			expect(result.actualDelta).toBeCloseTo(0.6, 2);
		});
	});
});
