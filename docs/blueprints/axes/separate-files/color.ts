import { oklch } from '@three-forma-styli/core';
import type { axes } from './axes.js';
import type { ColorDraft } from './support/authoring.js';

export const colors = {
	// Complete ordinary palette. Dark has no changes; Light supplies differences.
	tokens: {
		pri: oklch(0.68, 0.16, 285),
		bg: oklch(0.24, 0, 0),
		ev: oklch(0.3, 0, 0),
		ink: oklch(0.88, 0, 0),
		neu: oklch(0.88, 0, 0),
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
					shd: oklch(0.2, 0, 0),
				},
			},
		},
	},
} as const satisfies ColorDraft<typeof axes>;
