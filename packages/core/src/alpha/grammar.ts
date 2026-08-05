/** The fixed semantic positions available in every TFS alpha scale. */
export const ALPHA_POSITIONS = ['min', 'lo-x', 'lo', 'hi', 'hi-x', 'max'] as const;

/** Includes the compiler-owned transparent boundary used by generated contracts. */
export const ALPHA_POSITIONS_WITH_NON = ['non', ...ALPHA_POSITIONS] as const;
