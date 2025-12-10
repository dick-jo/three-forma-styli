import type { Oklch } from 'culori';
import type {
	ColorDiagnostic,
	LuminanceConstraintConfig,
	LuminanceValidation,
} from './types.js';

/**
 * Validates luminance constraints for a set of colors
 *
 * Checks that the luminance delta between background and foreground color groups
 * meets the minimum requirement for readability.
 *
 * @param colors - Record of color keys to Oklch colors to validate
 * @param config - Constraint configuration (polarity, minDelta, color groups)
 * @returns Diagnostic information about constraint satisfaction
 *
 * @example
 * ```ts
 * const result = validateLuminance(
 *   { bg: oklch(0.2, 0, 0), primary: oklch(0.8, 0.1, 250) },
 *   {
 *     polarity: 'negative',
 *     minDelta: 0.4,
 *     backgroundColors: ['bg'],
 *     foregroundColors: ['primary'],
 *   }
 * );
 * ```
 */
export function validateLuminance(
	colors: Record<string, Oklch | undefined>,
	config: LuminanceConstraintConfig
): LuminanceValidation {
	const { polarity, minDelta, backgroundColors, foregroundColors } = config;

	// Get luminance values for each group
	const bgLuminances = backgroundColors
		.map((key) => colors[key]?.l)
		.filter((l): l is number => l !== undefined);

	const fgLuminances = foregroundColors
		.map((key) => colors[key]?.l)
		.filter((l): l is number => l !== undefined);

	// Handle empty groups
	if (bgLuminances.length === 0 || fgLuminances.length === 0) {
		return {
			deltaValid: false,
			actualDelta: 0,
			requiredDelta: minDelta,
			backgroundConstraint: 0,
			backgroundConstraintType: polarity === 'negative' ? 'max' : 'min',
			foregroundConstraint: 0,
			foregroundConstraintType: polarity === 'negative' ? 'min' : 'max',
			colors: {},
		};
	}

	// Calculate min and max for both groups
	const maxBg = Math.max(...bgLuminances);
	const minBg = Math.min(...bgLuminances);
	const maxFg = Math.max(...fgLuminances);
	const minFg = Math.min(...fgLuminances);

	// Calculate actual delta based on polarity
	// Negative polarity: foreground (bright) - background (dark)
	// Positive polarity: background (bright) - foreground (dark)
	const actualDelta = polarity === 'negative' ? minFg - maxBg : minBg - maxFg;

	// Check delta constraint
	const deltaValid = actualDelta >= minDelta;

	// Calculate constraint boundaries for UI display
	// Negative polarity: backgrounds can't exceed (minFg - minDelta), foregrounds can't go below (maxBg + minDelta)
	// Positive polarity: backgrounds can't go below (maxFg + minDelta), foregrounds can't exceed (minBg - minDelta)
	const backgroundConstraint =
		polarity === 'negative' ? minFg - minDelta : maxFg + minDelta;

	const foregroundConstraint =
		polarity === 'negative' ? maxBg + minDelta : minBg - minDelta;

	// Build per-color diagnostics
	const colorDiagnostics: Record<string, ColorDiagnostic> = {};

	// Background colors
	for (const key of backgroundColors) {
		const color = colors[key];
		if (color?.l !== undefined) {
			// For negative polarity: headroom = constraint (max) - luminance
			// For positive polarity: headroom = luminance - constraint (min)
			const headroom =
				polarity === 'negative'
					? backgroundConstraint - color.l
					: color.l - backgroundConstraint;

			colorDiagnostics[key] = {
				group: 'background',
				luminance: color.l,
				headroom,
			};
		}
	}

	// Foreground colors
	for (const key of foregroundColors) {
		const color = colors[key];
		if (color?.l !== undefined) {
			// For negative polarity: headroom = luminance - constraint (min)
			// For positive polarity: headroom = constraint (max) - luminance
			const headroom =
				polarity === 'negative'
					? color.l - foregroundConstraint
					: foregroundConstraint - color.l;

			colorDiagnostics[key] = {
				group: 'foreground',
				luminance: color.l,
				headroom,
			};
		}
	}

	return {
		deltaValid,
		actualDelta,
		requiredDelta: minDelta,
		backgroundConstraint,
		backgroundConstraintType: polarity === 'negative' ? 'max' : 'min',
		foregroundConstraint,
		foregroundConstraintType: polarity === 'negative' ? 'min' : 'max',
		colors: colorDiagnostics,
	};
}
