import { oklch } from '@three-forma-styli/core';
import { axes } from './axes.js';
import type { SystemDraft } from './review-types.js';

// Proposed shared override syntax. Domain fields and values are review context.
export const designSystem = {
	axes,
	colors: {
		tokens: {
			bg: oklch(0.96, 0, 0),
			ink: oklch(0.25, 0, 0),
			shd: oklch(0.2, 0, 0),
		},
		overrides: [
			{
				when: { theme: 'dark' },
				set: {
					tokens: {
						bg: oklch(0.24, 0, 0),
						ink: oklch(0.88, 0, 0),
						shd: oklch(0.06, 0, 0),
					},
				},
			},
		],
	},
	spacing: {
		unit: 'px',
		// Retains today's input name: base is the step, so --sp-1 is 8px.
		base: 8,
		min: 4,
		range: 12,
		overrides: [
			{ when: { size: 's' }, set: { base: 6, min: 3 } },
			{ when: { size: 'l' }, set: { base: 10, min: 5 } },
		],
	},
	// These Spacing references follow the selected Size mode automatically.
	gap: { min: 'min', s: 1, l: 2, max: 3 },
	border: {
		radius: { min: 'min', s: 1, l: 2, max: 3 },
		width: { unit: 'px', value: 1 },
	},
	// Color changes follow the reference; the lengths stay as authored here.
	shadows: {
		unit: 'px',
		defaultRange: 'neu',
		ranges: {
			neu: {
				min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd' } }],
				lo: [{ x: 0, y: 2, blur: 4, color: { color: 'shd' } }],
				hi: [{ x: 0, y: 4, blur: 8, color: { color: 'shd' } }],
				max: [{ x: 0, y: 8, blur: 16, color: { color: 'shd' } }],
			},
		},
	},
} as const satisfies SystemDraft<typeof axes>;
