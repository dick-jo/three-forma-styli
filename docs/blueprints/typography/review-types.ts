import type { TypographyFont } from '@three-forma-styli/core';
import type { AuthoredTypographyRole } from '../../../packages/core/src/typography/authoring.js';
import type { AxisCatalogue, ModeCatalogue } from '../axes/separate-files/support/authoring.js';

// Review-only shapes. Public exports and full authoring types belong to the runbook.
type Calibration = {
	readonly min: number;
	readonly start: number;
	readonly step: number;
};

export type FontSizeDraft<Axes extends AxisCatalogue> = Calibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Axes, Partial<Calibration>>;
};

// Reuse the existing role grammar; this first pass has no role mode changes.
export type TypographyDraft<Fonts extends Record<string, TypographyFont>> = {
	readonly fonts: Fonts;
	readonly roles: Readonly<
		Record<
			string,
			Pick<AuthoredTypographyRole, 'weights' | 'weight' | 'sizes'> & {
				readonly font: Extract<keyof Fonts, string>;
			}
		>
	>;
};
