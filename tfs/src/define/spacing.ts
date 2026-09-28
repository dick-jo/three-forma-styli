import type { ModeCatalogue, ModesCheck } from './axes.js';

type SpacingCalibration = { readonly min: number; readonly step: number };

/** --sp-min, then --sp-n = step × n for n = 1…count. */
export type SpacingDraft = SpacingCalibration & {
	readonly unit: string;
	readonly count: number;
	readonly modes?: ModeCatalogue<Partial<SpacingCalibration>>;
};

/** Four positions, each `'min'` or a numbered Spacing position. */
type SpacingRange = Readonly<Record<'min' | 's' | 'l' | 'max', 'min' | number>>;

export type SpacingRangeDraft = SpacingRange & {
	readonly modes?: ModeCatalogue<Partial<SpacingRange>>;
};

export function defineSpacing<const T extends SpacingDraft>(spacing: T & ModesCheck<T>): T {
	return spacing;
}

export function defineGap<const T extends SpacingRangeDraft>(gap: T & ModesCheck<T>): T {
	return gap;
}
