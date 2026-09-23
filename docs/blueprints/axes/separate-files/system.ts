import { axes } from './axes.js';
import { alpha } from './alpha.js';
import { colors } from './color.js';
import { spacing } from './spacing.js';
import { gap } from './gap.js';
import { radius } from './border-radius.js';
import { shadows } from './shadow.js';

export const designSystem = {
	axes,
	alpha,
	colors,
	spacing,
	gap,
	border: { radius, width: { unit: 'px', value: 1 } },
	shadows,
} as const;
