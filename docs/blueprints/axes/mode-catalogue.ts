import { oklch, type AlphaSystem } from '@three-forma-styli/core';
import { axes } from './axes.js';

// Authoring alternative for review, not a supported compiler input. See authoring-options.md.
export const designSystem = {
	axes,
	alpha: {
		defaultScale: 'neu',
		scales: {
			neu: {
				values: { min: 0.07, 'lo-x': 0.125, lo: 0.25, hi: 0.68, 'hi-x': 0.85, max: 0.93 },
			},
		},
	} satisfies AlphaSystem,
	colors: {
		// This illustrative accent stays the same in both palettes.
		tokens: { pri: oklch(0.68, 0.16, 285) },
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
				dark: {
					tokens: {
						bg: oklch(0.24, 0, 0),
						ev: oklch(0.3, 0, 0),
						ink: oklch(0.88, 0, 0),
						neu: oklch(0.88, 0, 0),
						shd: oklch(0.06, 0, 0),
					},
				},
			},
		},
	},
	spacing: {
		unit: 'px',
		range: 12,
		modes: {
			size: {
				// `base` retains the current name for the multiplication step.
				regular: { base: 8, min: 4 },
				s: { base: 6, min: 3 },
				l: { base: 10, min: 5 },
			},
		},
	},
	// References follow active Spacing. No mode catalogue needed here.
	gap: { min: 'min', s: 1, l: 2, max: 3 },
	border: {
		radius: { min: 'min', s: 1, l: 2, max: 3 },
		width: { unit: 'px', value: 1 },
	},
	time: {
		defaultScale: 'neu',
		scales: {
			neu: { unit: 'ms', values: { min: 50, lo: 100, hi: 200, max: 400 } },
			anim: { unit: 'ms', values: { min: 500, lo: 1000, hi: 2000, max: 4000 } },
		},
	},
	easings: {
		// Direct structured values are already allowed by the Easing contract.
		neu: { type: 'cubicBezier', value: [0.2, 0, 0.38, 0.9] },
		pri: { type: 'cubicBezier', value: [0.34, 1.56, 0.64, 1] },
	},
	shadows: {
		unit: 'px',
		defaultRange: 'neu',
		ranges: {
			neu: {
				min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'min' } }],
				lo: [
					{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
					{ x: 0, y: 6, blur: 18, spread: -4, color: { color: 'shd', alpha: 'min' } },
				],
				hi: [
					{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
					{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo-x' } },
				],
				max: [
					{ x: 0, y: 3, blur: 6, color: { color: 'shd', alpha: 'lo' } },
					{ x: 0, y: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
				],
			},
		},
		// Optional genuine change to the shadow itself; other modes use the values above.
		modes: {
			size: {
				s: {
					ranges: {
						neu: {
							max: [
								{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
								{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo' } },
							],
						},
					},
				},
			},
		},
	},
} as const;
