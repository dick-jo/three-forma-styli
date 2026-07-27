import type { ColorDiagnostic, LuminanceConstraintConfig, LuminanceValidation } from './types.js';

interface OklchLightness {
	readonly l: number;
}

function stableDiagnostic(value: number): number {
	return Number(value.toFixed(12));
}

/**
 * Validates luminance constraints for a set of colors.
 *
 * TFS's current public `luminance` metric is the authored OKLCH L component. It
 * is useful for controlling the perceptual lightness separation of a palette,
 * but it is not WCAG relative luminance or a contrast-ratio calculation.
 *
 * @param colors - Record of color keys to values containing an OKLCH L component
 * @param config - Constraint configuration (polarity, minimumLuminanceDelta, color groups)
 * @returns Diagnostic information about constraint satisfaction
 *
 * @example
 * ```ts
 * const result = validateLuminance(
 *   { bg: oklch(0.2, 0, 0), primary: oklch(0.8, 0.1, 250) },
 *   {
 *     polarity: 'negative',
 *     minimumLuminanceDelta: 0.4,
 *     backgroundColors: ['bg'],
 *     foregroundColors: ['primary'],
 *   }
 * );
 * ```
 */
export function validateLuminance(
	colors: Record<string, OklchLightness | undefined>,
	config: LuminanceConstraintConfig
): LuminanceValidation {
	const { polarity, minimumLuminanceDelta, backgroundColors, foregroundColors } = config;

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
			metric: 'oklch-l',
			deltaValid: false,
			actualDelta: 0,
			requiredDelta: minimumLuminanceDelta,
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
	const actualDelta = stableDiagnostic(polarity === 'negative' ? minFg - maxBg : minBg - maxFg);

	// Check delta constraint
	const deltaValid = actualDelta >= minimumLuminanceDelta;

	// Calculate constraint boundaries for UI display
	// Negative polarity: backgrounds can't exceed (minFg - minimumLuminanceDelta), foregrounds can't go below (maxBg + minimumLuminanceDelta)
	// Positive polarity: backgrounds can't go below (maxFg + minimumLuminanceDelta), foregrounds can't exceed (minBg - minimumLuminanceDelta)
	const backgroundConstraint = stableDiagnostic(
		polarity === 'negative' ? minFg - minimumLuminanceDelta : maxFg + minimumLuminanceDelta
	);

	const foregroundConstraint = stableDiagnostic(
		polarity === 'negative' ? maxBg + minimumLuminanceDelta : minBg - minimumLuminanceDelta
	);

	// Build per-color diagnostics
	const colorDiagnostics: Record<string, ColorDiagnostic> = {};

	// Background colors
	for (const key of backgroundColors) {
		const color = colors[key];
		if (color?.l !== undefined) {
			// For negative polarity: headroom = constraint (max) - luminance
			// For positive polarity: headroom = luminance - constraint (min)
			const headroom = stableDiagnostic(
				polarity === 'negative' ? backgroundConstraint - color.l : color.l - backgroundConstraint
			);

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
			const headroom = stableDiagnostic(
				polarity === 'negative' ? color.l - foregroundConstraint : foregroundConstraint - color.l
			);

			colorDiagnostics[key] = {
				group: 'foreground',
				luminance: color.l,
				headroom,
			};
		}
	}

	return {
		metric: 'oklch-l',
		deltaValid,
		actualDelta,
		requiredDelta: minimumLuminanceDelta,
		backgroundConstraint,
		backgroundConstraintType: polarity === 'negative' ? 'max' : 'min',
		foregroundConstraint,
		foregroundConstraintType: polarity === 'negative' ? 'min' : 'max',
		colors: colorDiagnostics,
	};
}
