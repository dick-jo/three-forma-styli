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
	family: 'color' | 'spacing' | 'gap' | 'typography' | 'borderRadius' | 'borderWidth' | 'time';

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

	/** For time tokens: which time category (standard, animation, etc.) */
	timeCategory?: string;
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

/**
 * The complete Intermediate Representation
 */
export interface IR {
	/** All default mode tokens, keyed by token name */
	tokens: Record<string, TokenValue>;

	/** Mode metadata by category */
	modes: {
		color: ModeInfo;
		size: ModeInfo;
		time: ModeInfo;
	};

	/** Override tokens by mode name, only contains tokens that differ from default */
	overrideTokens: Record<string, Record<string, TokenValue>>;
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
		borderRadius: string;
		borderWidth: string;
		time: string;
	};

	/** Separators for building variable names */
	separators: {
		modifier: string;
		value: string;
	};

	/** Mode category assignments */
	modeCategories: {
		color: string[];
		size: string[];
		time: string[];
	};

	/** Color output format */
	colorFormat: {
		base: 'hex' | 'oklch' | 'rgb';
		alpha: 'rgba' | 'oklch' | 'hexa';
		alphaModifier: string;
	};
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
		borderRadius: 'bdr',
		borderWidth: 'bdw',
		time: 't',
	},
	separators: {
		modifier: '-',
		value: '-',
	},
	modeCategories: {
		color: ['colors'],
		size: ['spacing', 'gap', 'typography', 'borderRadius', 'borderWidth'],
		time: ['time'],
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
