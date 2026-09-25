import type { LuminancePolicy, Oklch } from '@three-forma-styli/core';
import type { RuntimeColorTheme } from '@three-forma-styli/core/runtime';
import type { AxisCatalogue, ModeCatalogue } from '../../axes/separate-files/support/authoring.js';

// Review-only shape: preserves existing polarity vocabulary and shared Axis names.
// Required polarity/reference validation belongs to the later compiler implementation.

export type ColorDraft<Axes extends AxisCatalogue> = {
	readonly tokens: Readonly<Record<string, Oklch>>;
	readonly polarity?: RuntimeColorTheme['polarity'];
	readonly constraints?: {
		readonly luminance?: LuminancePolicy;
	};
	readonly modes?: ModeCatalogue<
		Axes,
		{
			readonly tokens?: Readonly<Record<string, Oklch>>;
			readonly polarity?: RuntimeColorTheme['polarity'];
		}
	>;
};
