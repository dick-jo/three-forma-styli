/** Workshop context only. These values use the existing Color/Alpha shapes. */
import { oklch, type AlphaSystem, type PartialDesignSystem } from '@three-forma-styli/core';

export const colors = {
	modes: [
		{
			name: 'light',
			isDefault: true,
			tokens: {
				bg: oklch(0.96, 0, 0),
				ev: oklch(0.99, 0, 0),
				shd: oklch(0.2, 0, 0),
				neu: oklch(0.35, 0, 0),
				pri: oklch(0.55, 0.15, 285),
			},
		},
		{
			name: 'dark',
			tokens: {
				bg: oklch(0.24, 0, 0),
				ev: oklch(0.3, 0, 0),
				shd: oklch(0.06, 0, 0),
				neu: oklch(0.88, 0, 0),
				pri: oklch(0.78, 0.12, 285),
			},
		},
	],
} as const satisfies NonNullable<PartialDesignSystem['colors']>;

export const alpha = {
	defaultScale: 'neu',
	scales: {
		neu: {
			values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
		},
	},
} as const satisfies AlphaSystem;

export type ColorIdentity = keyof (typeof colors.modes)[0]['tokens'];
export type AlphaIdentity = 'non' | keyof (typeof alpha.scales.neu)['values'];
