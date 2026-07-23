// Updated types.ts with consistent patterns for all token types
import type { Oklch } from 'culori';
import type { LuminancePolicy } from './constraints/types.js';

// COLOURS ---------------------------------------------- //

/**
 * Color tokens for a design system.
 *
 * Uses OKLCH color space for perceptually uniform color manipulation:
 * - L (lightness): 0-1 scale (0 = black, 1 = white)
 * - C (chroma): 0-0.5 typical range (saturation)
 * - H (hue): 0-360 degrees
 *
 * Recommended core colors (7):
 * - bg: Page background
 * - ev: Elevated surfaces (cards, panels)
 * - pri: Main brand/action color
 * - neu: Achromatic scale (grays)
 * - ink: Text and icons
 * - pos: Success/positive sentiment
 * - neg: Error/negative sentiment
 *
 * But you can use any color names you want.
 */
export type ColorTokens = Record<string, Oklch>;

/** Portable author-owned facts attached to a mode (for example a label or polarity). */
export type ModeMetadata = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Default color mode - defines the base color tokens
 */
export interface DefaultColorMode {
	isDefault: true;
	metadata?: ModeMetadata;
	tokens: ColorTokens;
	alphaSchedule?: AlphaSchedule;
}

/**
 * Override color mode - only needs to specify tokens that differ from default
 */
export interface OverrideColorMode {
	isDefault?: false;
	metadata?: ModeMetadata;
	tokens: ColorTokens; // Partial by nature - only override what changes
	alphaSchedule?: AlphaSchedule;
}

/**
 * Color mode can be either default (full tokens) or override (partial tokens)
 */
export type ColorMode = DefaultColorMode | OverrideColorMode;

/**
 * Alpha schedule defines opacity levels for alpha variants.
 * Each key becomes a suffix (e.g., "lo" -> --clr-pri-a-lo)
 * Each value is between 0 (fully transparent) and 1 (fully opaque).
 *
 * Recommended schedule (least opaque to most opaque):
 *   { non: 0, min: 0.07, "lo-x": 0.125, lo: 0.25, hi: 0.68, "hi-x": 0.85, max: 0.93 }
 *
 * Simple alternative:
 *   { non: 0, low: 0.25, high: 0.75 }
 */
export interface AlphaSchedule {
	[level: string]: number;
}

/** Deliberate subset accepted from user-authored runtime theme payloads. */
export interface RuntimeColorThemesPolicy {
	readonly colorNames: readonly string[];
}

// SPACING ---------------------------------------------- //
export interface SpacingSystem {
	unit: string;
	base: number;
	min: number;
	range: number;
}

export interface SpacingMode {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: SpacingSystem;
}

// GAP ---------------------------------------------- //
export interface GapSystem {
	spacingMode?: string; // If not specified, uses the default spacing mode
	unit?: string;
	min: number | 'min';
	s: number | 'min';
	l: number | 'min';
	max: number | 'min';
}

export interface GapMode {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: GapSystem;
}

// TYPOGRAPHY ------------------------------------------- //
export interface FontSizeSystem {
	unit: string; // e.g., 'rem'
	base: number; // Base font size (1rem = 16px typically)
	min: number; // Minimum font size (smaller than base)
	increment: number; // Fixed increment between sizes (e.g., 0.25rem)
	range: number; // Number of steps in the scale
}

export interface TypographyMode {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: FontSizeSystem;
}

export type FontSizeReference = 'min' | number;
export type TypographyFontStyle = 'normal' | 'italic' | 'oblique';
export type TypographyAvailableWeights = number[] | { min: number; max: number };

export interface TypographyVariableAxis {
	min: number;
	default?: number;
	max: number;
}

export interface TypographyFontFaceCapabilities {
	style: TypographyFontStyle;
	/** Physical CSS oblique angle, when the prepared face declares one. */
	obliqueAngle?: number;
	/** Exact static cuts or inclusive variable-font range for this face style. */
	weights: TypographyAvailableWeights;
	/** OpenType feature tags reported by the prepared face. */
	features?: string[];
	/** Variable axes reported by the prepared face. */
	axes?: Record<string, TypographyVariableAxis>;
}

interface TypographyFontIdentity {
	/** CSS font-family name, without fallback families. */
	family: string;
	/** CSS fallback family names, in priority order. */
	fallbacks?: string[];
}

/** A physical font source with explicit verification status. */
export type TypographyFont = TypographyFontIdentity &
	(
		| {
				/** Authoritative capabilities supplied by TFS font preparation. */
				verification: 'prepared';
				capabilities: { faces: TypographyFontFaceCapabilities[] };
				diagnostics?: { warnings: string[] };
		  }
		| {
				/** Explicit escape hatch for system or externally managed font stacks. */
				verification: 'unavailable';
				capabilities?: never;
		  }
	);

export type TypographyFeatureValue = boolean | number;
export type TypographyTextTransform =
	'none' | 'capitalize' | 'uppercase' | 'lowercase' | 'full-width' | 'full-size-kana' | 'math-auto';

export interface TypographySettings {
	/** Prefer normal CSS properties where they exist; this is the OpenType escape hatch. */
	features?: Record<string, TypographyFeatureValue>;
	/** Variable-axis values other than weight/style, which have dedicated role fields. */
	variations?: Record<string, number>;
	fontKerning?: 'auto' | 'normal' | 'none';
	fontOpticalSizing?: 'auto' | 'none';
	/** Presentational casing/glyph transform; source text remains unchanged. */
	textTransform?: TypographyTextTransform;
}

/** A complete role-local size recipe. Letter spacing is expressed in em. */
export interface TypographyRecipe extends TypographySettings {
	fontSize: FontSizeReference;
	/** Role-local weight alias selected by this complete recipe. */
	weight: string;
	lineHeight: number;
	letterSpacing: number;
}

/**
 * Deliberate changes to one complete semantic recipe inside an atomic typography
 * mode. Core derives nothing here: omitted fields retain the authored recipe.
 */
export type TypographyModeRecipeOverride = Partial<
	Pick<TypographyRecipe, 'fontSize' | 'weight' | 'lineHeight' | 'letterSpacing' | 'textTransform'>
>;

export interface TypographyRoleModeOverride {
	base?: TypographyModeRecipeOverride;
	variants?: Record<string, TypographyModeRecipeOverride>;
}

export interface TypographyRoleStyle {
	/** Role weight aliases intentionally permitted for this style. */
	weights: string[];
}

export interface TypographyRole extends TypographySettings {
	/** Key of a font in typography.fonts. */
	font: string;
	/** The unsuffixed/default recipe, emitted as --text-{role}-* by default. */
	base: TypographyRecipe;
	/** Optional, arbitrarily named alternatives such as min, s, l, and max. */
	variants?: Record<string, TypographyRecipe>;
	/**
	 * Optional tuple changes keyed by an existing non-default typography mode.
	 * This keeps role calibration explicit when display or compact contexts need
	 * more than a globally scaled --fs-* ramp.
	 */
	modeOverrides?: Record<string, TypographyRoleModeOverride>;
	/**
	 * Optional specimen/presentation order. Must contain `base` and every variant
	 * exactly once. This is authored per role; core assigns no semantic meaning to names.
	 */
	displayOrder?: string[];
	/** Role-local semantic aliases mapped to intentional CSS weight values. */
	weights: Record<string, number>;
	/**
	 * Explicit style/weight combinations. When omitted, normal exposes all role weights.
	 * Prepared font capabilities validate every requested combination.
	 */
	styles?: Partial<Record<TypographyFontStyle, TypographyRoleStyle>>;
	defaultStyle?: TypographyFontStyle;
}

interface TypographyScaleSystem {
	modes: Array<TypographyMode & { name: string }>;
}

/**
 * Atomic font-size modes may stand alone. A semantic layer is self-contained:
 * roles can only exist alongside the font registry they reference.
 */
export type TypographySystem = TypographyScaleSystem &
	(
		| {
				fonts: Record<string, TypographyFont>;
				roles?: Record<string, TypographyRole>;
		  }
		| {
				fonts?: undefined;
				roles?: undefined;
		  }
	);

export interface PreparedFontManifestLike {
	schemaVersion: number;
	families: Record<
		string,
		{
			family: string;
			faces: Array<{
				/** Kept as string so imported JSON manifests are accepted without a cast. */
				style: string;
				obliqueAngle?: number;
				weight: number | { min: number; max: number };
				stretch?: number | { min: number; max: number };
				features?: string[];
				axes?: Record<string, TypographyVariableAxis>;
				warnings?: string[];
			}>;
		}
	>;
}

export interface PreparedTypographyFontOptions {
	/** Derive a safe generic fallback stack without spelling out CSS families. */
	category?: 'sans' | 'serif' | 'mono';
	/** Advanced explicit stack. Takes precedence over category. */
	fallbacks?: string[];
}

// BORDER ----------------------------------------------- //
export interface BorderRadiusSystem {
	spacingMode?: string; // If not specified, uses the default spacing mode
	unit?: string;
	min: number | 'min';
	s: number | 'min';
	l: number | 'min';
	max: number | 'min';
}

export interface BorderRadiusMode {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: BorderRadiusSystem;
}

export interface BorderWidthSystem {
	unit: string; // Unit for border width (px, rem, etc.)
	value: number; // Single discrete value
}

export interface BorderWidthMode {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: BorderWidthSystem;
}

export interface BorderSystem {
	radius: {
		modes: Array<BorderRadiusMode & { name: string }>;
	};
	width: {
		modes: Array<BorderWidthMode & { name: string }>;
	};
	// Future border properties can be added here
}

// TIME ------------------------------------------------- //

/**
 * One atomic time scale. Values use the multiplicative formula `base * step`.
 */
export interface TimeScaleTokens {
	unit: string; // e.g., 'ms'
	base: number; // base increment (e.g., 100)
	min: number; // minimum time value
	range: number; // number of steps
}

/**
 * A named time scale. Every scale is emitted into the same root token set:
 * the default scale is `--t-*`; additional scales are `--t-{name}-*`.
 *
 * Scales are namespaces, not switchable CSS modes.
 */
export interface TimeScale {
	isDefault?: boolean;
	metadata?: ModeMetadata;
	tokens: TimeScaleTokens;
}

export interface TimeSystem {
	scales: Array<TimeScale & { name: string }>;
}

// MOTION ----------------------------------------------- //

/**
 * Reference one value from an atomic time scale. A bare step uses the default
 * scale; qualified references address another simultaneously emitted scale.
 */
export type TimeReference =
	| 'min'
	| number
	| Readonly<{
			scale: string;
			step: 'min' | number;
	  }>;

/** A portable cubic Bézier curve shared by CSS and JavaScript motion engines. */
export type MotionEasing = readonly [number, number, number, number];

export interface MotionRecipeBase {
	duration: TimeReference;
	easing: string;
	/** Omitted delay resolves to a literal zero milliseconds. */
	delay?: 0 | TimeReference;
}

/**
 * A named alternative inherits omitted easing and delay decisions from base.
 * Duration may also be inherited, although a variant normally changes it.
 */
export type MotionRecipeVariant = Partial<MotionRecipeBase>;

/**
 * A reduced-motion override may resolve duration or delay to literal zero.
 * Omitted fields preserve the corresponding authored recipe decision.
 */
export interface ReducedMotionRecipeVariant {
	duration?: 0 | TimeReference;
	easing?: string;
	delay?: 0 | TimeReference;
}

/**
 * Reduced-motion is an explicit semantic decision, not a global duration
 * multiplier. A recipe can preserve its motion when it is essential, or
 * provide a base override inherited by every variant. Individual variants may
 * override that reduced value or opt back into their original motion.
 */
export type ReducedMotionRecipe =
	| 'preserve'
	| {
			base: ReducedMotionRecipeVariant;
			variants?: Record<string, ReducedMotionRecipeVariant | 'preserve'>;
	  };

export interface MotionRecipe {
	/** Unsuffixed/default fragment, emitted as --motion-{recipe}. */
	base: MotionRecipeBase;
	/** Arbitrarily named alternatives such as min, lo, hi and max. */
	variants?: Record<string, MotionRecipeVariant>;
	/** Optional review order containing base and every variant exactly once. */
	displayOrder?: string[];
	/** Required behavior for the user's reduced-motion preference. */
	reducedMotion: ReducedMotionRecipe;
}

/**
 * Semantic transition fragments. Recipe names describe interactions or motion
 * intent; call sites continue to own selectors and animated CSS properties.
 */
export interface MotionSystem {
	easings: Record<string, MotionEasing>;
	recipes: Record<string, MotionRecipe>;
}

// SHADOWS ---------------------------------------------- //

/** Reference a semantic color token and, optionally, one alpha-ramp member. */
export interface ShadowColorReference {
	color: string;
	alpha?: string;
}

interface ShadowLayerBase {
	x: number;
	y: number;
	blur: number;
	color: ShadowColorReference;
}

export interface BoxShadowLayer extends ShadowLayerBase {
	spread?: number;
	inset?: boolean;
}

export interface TextShadowLayer extends ShadowLayerBase {}

export interface ShadowRecipe<Layer extends ShadowLayerBase> {
	/** Ordered layers; earlier layers are painted on top, matching CSS. */
	base: readonly Layer[];
	/** Arbitrarily named complete alternatives such as min, lo, hi and max. */
	variants?: Record<string, readonly Layer[]>;
	/** Optional review order containing base and every variant exactly once. */
	displayOrder?: string[];
}

/**
 * Box and text shadows are separate because their CSS grammars differ:
 * text-shadow has neither spread nor inset.
 */
export interface ShadowSystem {
	unit: string;
	box?: Record<string, ShadowRecipe<BoxShadowLayer>>;
	text?: Record<string, ShadowRecipe<TextShadowLayer>>;
}

// MAIN CONFIG ------------------------------------------ //

/**
 * Full design system with all token families.
 * Use this when generating a complete design system.
 */
export interface DesignSystem {
	colors: {
		modes: Array<ColorMode & { name: string }>;
		alphaSchedule: AlphaSchedule;
		luminance?: LuminancePolicy;
		runtimeThemes?: RuntimeColorThemesPolicy;
	};
	spacing: {
		modes: Array<SpacingMode & { name: string }>;
	};
	gap: {
		modes: Array<GapMode & { name: string }>;
	};
	typography: TypographySystem;
	border: BorderSystem;
	time: TimeSystem;
	motion?: MotionSystem;
	shadows?: ShadowSystem;
}

/**
 * Partial design system - all token families optional.
 * Use this when generating only specific token types (e.g., just colors).
 *
 * Note: Some families have dependencies:
 * - gap requires spacing (for resolving references)
 * - border.radius requires spacing (for resolving references)
 *
 * @example
 * ```ts
 * // Generate only colors
 * const ir = generate({
 *   colors: {
 *     modes: [{ name: 'default', isDefault: true, tokens: { bg, primary, ink } }],
 *     alphaSchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 },
 *   },
 * });
 * ```
 */
export interface PartialDesignSystem {
	colors?: {
		modes: Array<ColorMode & { name: string }>;
		alphaSchedule: AlphaSchedule;
		luminance?: LuminancePolicy;
		runtimeThemes?: RuntimeColorThemesPolicy;
	};
	spacing?: {
		modes: Array<SpacingMode & { name: string }>;
	};
	gap?: {
		modes: Array<GapMode & { name: string }>;
	};
	typography?: TypographySystem;
	border?: BorderSystem;
	time?: TimeSystem;
	motion?: MotionSystem;
	shadows?: ShadowSystem;
}
