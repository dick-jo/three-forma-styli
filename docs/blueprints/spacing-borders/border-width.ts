import type { axes } from '../axes/separate-files/axes.js';
import type { BorderWidthDraft } from './review-types.js';

export const width = {
	unit: 'px',
	value: 1,
} as const satisfies BorderWidthDraft<typeof axes>;
