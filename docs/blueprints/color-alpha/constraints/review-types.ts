import type { LuminancePolicy, Oklch } from '@three-forma-styli/core';

// Review-only shape for this single-palette placement comparison.
// Exact member-name inference and mode participation are not implemented here.
export type ColorDraft = {
	readonly tokens: Readonly<Record<string, Oklch>>;
	readonly constraints?: {
		readonly luminance?: LuminancePolicy;
	};
};
