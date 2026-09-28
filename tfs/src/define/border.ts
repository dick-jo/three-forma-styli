import type { ModeCatalogue } from './axes.js';
import type { SpacingRangeDraft } from './spacing.js';

export type BorderDraft = {
	readonly radius: SpacingRangeDraft;
	readonly width: {
		readonly unit: string;
		readonly value: number;
		readonly modes?: ModeCatalogue<{ readonly value?: number }>;
	};
};

export function defineBorder<const T extends BorderDraft>(border: T): T {
	return border;
}
