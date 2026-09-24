/** Deliberately invalid: shd exists only in a mode, outside the ordinary set. */
import { oklch } from '@three-forma-styli/core';
import type { axes } from '../axes.js';
import type { alpha } from '../alpha.js';
import type { ColorDraft, ColorReference } from '../support/authoring.js';

export const incompleteColors = {
	tokens: { bg: oklch(0.96, 0, 0) },
	modes: {
		theme: {
			light: { tokens: { bg: oklch(0.96, 0, 0), shd: oklch(0.2, 0, 0) } },
			dark: { tokens: { bg: oklch(0.24, 0, 0) } },
		},
	},
} as const satisfies ColorDraft<typeof axes>;

// References derive their names from the ordinary set, so this is rejected too.
export const knownButUnavailable = {
	// @ts-expect-error a mode-only swatch is not in the complete ordinary catalogue
	color: 'shd',
	alpha: 'lo',
} as const satisfies ColorReference<typeof incompleteColors, typeof alpha>;
