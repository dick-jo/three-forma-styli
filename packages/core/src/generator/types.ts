/**
 * Intermediate Representation (IR) Types
 *
 * The IR is the normalized, fully-expanded output of the generator layer.
 * It contains all computed token values ready for transformation to any output format.
 */

/**
 * A single token value in the IR
 */
export interface TokenValue {
	/** Token family (color, spacing, gap, etc.) */
	family:
		'color' | 'spacing' | 'gap' | 'typography' | 'borderRadius' | 'borderWidth' | 'time' | 'motion';

	/** Full token name without -- prefix (e.g., 'clr-bg', 'sp-1', 'gap-s') */
	name: string;

	/** Computed CSS value (e.g., '8px', 'oklch(0.26 0 180)') */
	value: string;

	/** Raw numeric value before formatting (useful for TS output) */
	rawValue?: number;

	/** Unit if applicable (e.g., 'px', 'rem', 'ms') */
	unit?: string;

	/** For tokens that reference others (e.g., gap-s references sp-1) */
	reference?: string;

	/** Additional metadata for specific token types */
	metadata?: TokenMetadata;
}

export interface TokenMetadata {
	/** For color tokens: is this an alpha variant? */
	isAlphaVariant?: boolean;

	/** For color tokens: which alpha level (min, lo, hi, etc.) */
	alphaLevel?: string;

	/** For color tokens: the base color this variant derives from */
	baseColor?: string;

	/** For time tokens: is this a shorthand? */
	isShorthand?: boolean;

	/** For time tokens: which simultaneously emitted scale owns this token. */
	timeScale?: string;

	/** For motion tokens: which semantic recipe owns this token. */
	motionRecipe?: string;

	/** For motion tokens: base or an authored variant name. */
	motionVariant?: string;
}

/**
 * Mode category information
 */
export interface ModeInfo {
	/** Name of the default mode */
	default: string;

	/** Names of override modes */
	overrides: string[];
}

export interface ScaleInfo {
	/** Name of the scale that receives the unqualified token namespace. */
	default: string;
	/** Every emitted scale name, in authored order. */
	names: string[];
}

export interface TypographyContractRecipe {
	fontSizeToken: string;
	fontWeightToken: string;
	weight: string;
	lineHeightToken: string;
	letterSpacingToken: string;
	atomicFontSizeToken: string;
	fontSizeReference: import('../types.js').FontSizeReference;
	lineHeight: number;
	letterSpacingEm: number;
	textTransformToken?: string;
	textTransform?: import('../types.js').TypographyTextTransform;
	fontKerningToken?: string;
	fontOpticalSizingToken?: string;
	fontFeatureSettingsToken?: string;
	fontVariationSettingsToken?: string;
}

export interface TypographyContract {
	/** Shared semantic namespace for --{namespace}-* tokens and global helper classes. */
	namespace: string;
	fonts: Record<
		string,
		{
			family: string;
			fallbacks: string[];
			verified: boolean;
			warnings: string[];
		}
	>;
	roles: Record<
		string,
		{
			font: string;
			fontFamilyToken: string;
			fontStyleToken: string;
			defaultStyle: 'normal' | 'italic' | 'oblique';
			weights: Record<string, number>;
			weightTokens: Record<string, string>;
			styles: Partial<
				Record<
					'normal' | 'italic' | 'oblique',
					{
						value: 'normal' | 'italic' | 'oblique';
						weights: string[];
					}
				>
			>;
			base: TypographyContractRecipe;
			variants: Record<string, TypographyContractRecipe>;
			displayOrder: string[];
		}
	>;
}

export interface MotionContractTimeValue {
	/** CSS custom property name without the leading `--`; null means literal zero. */
	token: string | null;
	css: string;
	milliseconds: number;
	seconds: number;
}

export interface MotionContractValue {
	token: string;
	duration: MotionContractTimeValue;
	delay: MotionContractTimeValue;
	easing: {
		name: string;
		token: string;
		css: string;
		value: import('../types.js').MotionEasing;
	};
}

export interface MotionContract {
	namespace: string;
	easings: Record<
		string,
		{
			token: string;
			css: string;
			value: import('../types.js').MotionEasing;
		}
	>;
	recipes: Record<
		string,
		{
			base: MotionContractValue;
			variants: Record<string, MotionContractValue>;
			displayOrder: string[];
		}
	>;
}

/**
 * The complete Intermediate Representation
 */
export interface IR {
	/** All default mode tokens, keyed by token name */
	tokens: Record<string, TokenValue>;

	/** Switchable mode metadata by selector category. */
	modes: {
		color: ModeInfo;
		size: ModeInfo;
	};

	/** Simultaneously emitted atomic scales. */
	scales: {
		time: ScaleInfo;
	};

	/** Override tokens by mode name, only contains tokens that differ from default */
	overrideTokens: Record<string, Record<string, TokenValue>>;

	/** Structured typography decisions for typed and non-CSS transformers. */
	typography?: TypographyContract;

	/** Structured semantic motion decisions for CSS and JavaScript consumers. */
	motion?: MotionContract;
}

/**
 * Generator configuration
 */
export interface GeneratorConfig {
	/** CSS variable name prefixes */
	prefixes: {
		color: string;
		spacing: string;
		gap: string;
		typography: string;
		/** Semantic typography recipe prefix. */
		typographyRole: string;
		borderRadius: string;
		borderWidth: string;
		time: string;
		motion: string;
	};

	/** Color output format */
	colorFormat: {
		base: 'hex' | 'hex-p3' | 'oklch' | 'rgb';
		alpha: 'rgba' | 'oklch' | 'hexa' | 'hexa-p3';
		alphaModifier: string;
	};
}

/** User-facing generator options. Every nested field is optional. */
export interface GeneratorOptions {
	prefixes?: Partial<GeneratorConfig['prefixes']>;
	colorFormat?: Partial<GeneratorConfig['colorFormat']>;
}

/**
 * Default generator configuration
 */
export const defaultGeneratorConfig: GeneratorConfig = {
	prefixes: {
		color: 'clr',
		spacing: 'sp',
		gap: 'gap',
		typography: 'fs',
		typographyRole: 'text',
		borderRadius: 'bdr',
		borderWidth: 'bdw',
		time: 't',
		motion: 'motion',
	},
	colorFormat: {
		base: 'oklch',
		alpha: 'oklch',
		alphaModifier: 'a',
	},
};

/**
 * Result from individual token family generators
 */
export interface GeneratorResult {
	/** Tokens for the default mode */
	defaultTokens: TokenValue[];

	/** Tokens for override modes, keyed by mode name */
	overrideTokens: Record<string, TokenValue[]>;

	/** Mode information */
	modeInfo: ModeInfo;
}

/** Time scales are all root tokens and therefore have no override-mode surface. */
export interface TimeGeneratorResult {
	defaultTokens: TokenValue[];
	scaleInfo: ScaleInfo;
}

/** Motion recipes are root fragments and do not participate in CSS modes. */
export interface MotionGeneratorResult {
	defaultTokens: TokenValue[];
	contract: MotionContract;
}
