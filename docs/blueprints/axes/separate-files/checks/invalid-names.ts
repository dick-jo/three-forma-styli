/** Deliberate editor errors, kept out of the main domain examples. */
import type { axes } from '../axes.js';
import type { colors } from '../color.js';
import type { alpha } from '../alpha.js';
import type { ColorReference, ModeCatalogue, SpacingRange } from '../support/authoring.js';

const invalidAxis: ModeCatalogue<typeof axes, {}> = {
	// @ts-expect-error axis names come from axes.ts
	szie: {},
};

const invalidMode: ModeCatalogue<typeof axes, {}> = {
	size: {
		// @ts-expect-error 'small' is not the authored mode 's'
		small: {},
	},
};

const modeOnWrongAxis: ModeCatalogue<typeof axes, {}> = {
	theme: {
		// @ts-expect-error 's' belongs to Size, not Theme
		s: {},
	},
};

const invalidColor: ColorReference<typeof colors, typeof alpha> = {
	// @ts-expect-error the ordinary catalogue does not contain this identity
	color: 'shaddow',
	alpha: 'lo',
};

const invalidAlpha: ColorReference<typeof colors, typeof alpha> = {
	color: 'shd',
	// @ts-expect-error Alpha's existing position is 'lo', not 'low'
	alpha: 'low',
};

const invalidRange: SpacingRange = {
	min: 'min',
	s: 1,
	l: 2,
	// @ts-expect-error an unknown position cannot replace the required max
	maximum: 3,
};

// Unchanged and mode-varying identities both belong to the ordinary catalogue.
const shared: ColorReference<typeof colors, typeof alpha> = { color: 'pri' };
const themed: ColorReference<typeof colors, typeof alpha> = { color: 'shd', alpha: 'lo' };
const transparent: ColorReference<typeof colors, typeof alpha> = { color: 'pri', alpha: 'non' };
