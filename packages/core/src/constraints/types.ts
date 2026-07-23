/**
 * Design-system separation policy shared by build-time and runtime themes.
 *
 * TFS currently evaluates this constraint using authored OKLCH L. It does not
 * calculate WCAG relative luminance or a contrast ratio.
 */
export interface LuminancePolicy<ColorName extends string = string> {
	/** Minimum required OKLCH-L difference between the two groups. */
	readonly minimumLuminanceDelta: number;
	/** Color keys treated as surfaces/backgrounds. */
	readonly backgroundColors: readonly ColorName[];
	/** Color keys treated as content/foregrounds. */
	readonly foregroundColors: readonly ColorName[];
}

/** A separation policy paired with the polarity of one concrete color theme. */
export interface LuminanceConstraintConfig extends LuminancePolicy {
	/** `negative` has dark backgrounds; `positive` has light backgrounds. */
	readonly polarity: 'negative' | 'positive';
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
