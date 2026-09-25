import { axes } from '../axes/separate-files/axes.js';
import { spacing } from './spacing.js';
import { gap } from './gap.js';
import { radius } from './border-radius.js';
import { width } from './border-width.js';

export const designSystem = {
	axes,
	spacing,
	gap,
	border: { radius, width },
} as const;
