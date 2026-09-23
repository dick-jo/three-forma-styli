import { oklch } from '@three-forma-styli/core';
import { axes } from './axes.js';
import type { ColorDraft, Selection } from './review-types.js';

// Companion example: two axes intentionally change the same Color identity.
export const contrastExample = {
	axes: {
		...axes,
		contrast: {
			default: 'standard',
			modes: ['standard', 'high'],
			activation: { attribute: 'data-contrast-mode' },
		},
	},
	colors: {
		tokens: { bg: oklch(0.96, 0, 0) },
		overrides: [
			{
				when: { theme: 'dark' },
				set: { tokens: { bg: oklch(0.24, 0, 0) } },
			},
			{
				when: { contrast: 'high' },
				set: { tokens: { bg: oklch(0.99, 0, 0) } },
			},
			// Explicitly settle the combination. Moving this entry changes nothing.
			{
				when: { theme: 'dark', contrast: 'high' },
				set: { tokens: { bg: oklch(0.06, 0, 0) } },
			},
		],
	} satisfies ColorDraft<
		Selection<typeof axes> & { readonly contrast?: 'standard' | 'high' },
		'bg'
	>,
} as const;
