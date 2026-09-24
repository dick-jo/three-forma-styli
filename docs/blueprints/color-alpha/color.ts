import { oklch } from '@three-forma-styli/core';
import type { axes } from '../axes/separate-files/axes.js';
import type { alpha } from './alpha.js';
import type { ColorDraft } from './review-types.js';

export const colors = {
	// Complete ordinary palette. Dark changes nothing; Light supplies differences.
	tokens: {
		neu: oklch(0.88, 0, 0),
		pri: oklch(0.6, 0.16, 285),
		duo: oklch(0.6, 0.12, 210),
		tri: oklch(0.6, 0.14, 150),
		tet: oklch(0.6, 0.15, 70),
		pen: oklch(0.6, 0.16, 25),
		bg: oklch(0.24, 0, 0),
		ev: oklch(0.3, 0, 0),
		ink: oklch(0.88, 0, 0),
		shd: oklch(0.06, 0, 0),
	},
	modes: {
		theme: {
			light: {
				tokens: {
					bg: oklch(0.96, 0, 0),
					ev: oklch(0.99, 0, 0),
					ink: oklch(0.25, 0, 0),
					neu: oklch(0.35, 0, 0),
					shd: oklch(0.12, 0, 0),
				},
			},
		},
	},
	// Optional author-owned selections; they do not introduce new swatches.
	groups: {
		accents: { identities: ['pri', 'duo', 'tri', 'tet', 'pen'] },
		glow: { identities: ['neu', 'pri', 'duo'] },
	},
	// Color ramps use alpha.defaultScale ('neu') unless alphaScale is supplied.
} as const satisfies ColorDraft<typeof axes, typeof alpha>;
