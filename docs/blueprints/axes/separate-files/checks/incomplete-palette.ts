/** Valid spelling is insufficient: this deliberately broken palette lacks dark shd. */
import { oklch } from '@three-forma-styli/core';
import type { axes } from '../axes.js';
import type { alpha } from '../alpha.js';
import type { ColorDraft, ColorReference } from '../support/authoring.js';

export const incompleteColors = {
	modes: {
		theme: {
			light: { tokens: { bg: oklch(0.96, 0, 0), shd: oklch(0.2, 0, 0) } },
			dark: { tokens: { bg: oklch(0.24, 0, 0) } },
		},
	},
} as const satisfies ColorDraft<typeof axes>;

// The editor recognises the name. Per-mode resolution must still reject this in dark.
export const knownButUnavailable = {
	color: 'shd',
	alpha: 'lo',
} as const satisfies ColorReference<typeof incompleteColors, typeof alpha>;
