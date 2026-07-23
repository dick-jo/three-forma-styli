/**
 * Configuration for luminance constraint validation
 *
 * @property polarity - 'negative' means dark backgrounds (low L), light foregrounds (high L)
 *                      'positive' means light backgrounds (high L), dark foregrounds (low L)
 * @property minDelta - Minimum required luminance difference between groups
 * @property backgroundColors - Array of color keys to treat as background (e.g., ['bg', 'ev'])
 * @property foregroundColors - Array of color keys to treat as foreground (e.g., ['primary', 'ink'])
 *
 * TFS currently evaluates this constraint using authored OKLCH L. It does not
 * calculate WCAG relative luminance or a contrast ratio.
 */
export interface LuminanceConstraintConfig {
	readonly polarity: 'negative' | 'positive';
	readonly minDelta: number;
	readonly backgroundColors: readonly string[];
	readonly foregroundColors: readonly string[];
}

/**
 * Per-color diagnostic information
 */
export interface ColorDiagnostic {
	readonly group: 'background' | 'foreground';
	/** Authored OKLCH L under the current TFS luminance metric. */
	readonly luminance: number;
	/** Distance from the constraint boundary. Positive = safe, zero = at limit, negative = violation */
	readonly headroom: number;
}

/**
 * Result of luminance validation with full OKLCH-L diagnostics.
 *
 * The explicit `metric` discriminator keeps this result honest and allows a
 * future, separate WCAG relative-luminance diagnostic to coexist safely.
 */
export interface LuminanceValidation {
	/** The exact measurement used by this constraint. Not WCAG relative luminance. */
	readonly metric: 'oklch-l';

	// Delta validation (primary constraint)
	readonly deltaValid: boolean;
	readonly actualDelta: number;
	readonly requiredDelta: number;

	// Computed boundaries for UI display
	// For negative polarity: background has MAX constraint, foreground has MIN
	// For positive polarity: background has MIN constraint, foreground has MAX
	readonly backgroundConstraint: number;
	readonly backgroundConstraintType: 'min' | 'max';
	readonly foregroundConstraint: number;
	readonly foregroundConstraintType: 'min' | 'max';

	// Per-color diagnostics
	readonly colors: Readonly<Record<string, Readonly<ColorDiagnostic>>>;
}
