import type {
	AxisCatalogue,
	ModeCatalogue,
	SpacingRange,
} from '../axes/separate-files/support/authoring.js';

// Review-only declarations, not new public exports or a compiler implementation.
type Calibration = { readonly min: number; readonly step: number };

export type SpacingDraft<Axes extends AxisCatalogue> = Calibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Axes, Partial<Calibration>>;
};

export type SpacingRangeDraft<Axes extends AxisCatalogue> = SpacingRange & {
	readonly modes?: ModeCatalogue<Axes, Partial<SpacingRange>>;
};

export type BorderWidthDraft<Axes extends AxisCatalogue> = {
	readonly unit: string;
	readonly value: number;
	readonly modes?: ModeCatalogue<Axes, { readonly value?: number }>;
};

export type BorderDraft<Axes extends AxisCatalogue> = {
	readonly radius?: SpacingRangeDraft<Axes>;
	readonly width?: BorderWidthDraft<Axes>;
};
