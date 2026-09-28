import type { AuthoredTypographyRole } from '@three-forma-styli/core';
import type { ProjectFont } from '@three-forma-styli/compiler';

// Review-only shapes. Public API changes belong to the implementation milestone.
export type FontDraft = Pick<
	ProjectFont,
	'sources' | 'category' | 'family' | 'fallbacks' | 'strategy' | 'display'
>;

export type FontRoleDraft<Fonts> = Omit<AuthoredTypographyRole, 'font' | 'modeOverrides'> & {
	font: Extract<keyof Fonts, string>;
};
