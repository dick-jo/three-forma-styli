import { axes } from '../axes/separate-files/axes.js';
import { spacing } from './spacing.js';
import { gap } from './gap.js';
import { border } from './border.js';

export const designSystem = {
	axes,
	spacing,
	gap,
	border,
} as const;
