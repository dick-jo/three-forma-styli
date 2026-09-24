import { oklch } from '@three-forma-styli/core';

export const colors = {
	// The complete ordinary palette. It happens to be dark.
	tokens: {
		bg: oklch(0.2, 0, 0),
		ink: oklch(0.9, 0, 0),
		shd: oklch(0.05, 0, 0),
	},
	modes: {
		theme: {
			// No Dark entry needed: it changes nothing from the ordinary palette.
			light: {
				tokens: {
					bg: oklch(0.96, 0, 0),
					ink: oklch(0.15, 0, 0),
				},
			},
		},
	},
} as const;
