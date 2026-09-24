import { oklch } from '@three-forma-styli/core';
import type { axes } from '../../axes/separate-files/axes.js';
import type { alpha } from '../alpha.js';
import type { ColorDraft } from '../review-types.js';

// Ordinary token authoring. These illustrative values need no separation policy.
export const colors = {
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.3, 0, 0),
		pri: oklch(0.5, 0.16, 285),
		neu: oklch(0.75, 0, 0),
		ink: oklch(0.9, 0, 0),
	},
} as const satisfies ColorDraft<typeof axes, typeof alpha>;
