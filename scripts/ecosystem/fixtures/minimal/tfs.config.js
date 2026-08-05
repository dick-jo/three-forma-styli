import { defineTfsProject } from '@three-forma-styli/compiler';
import { defineAlpha } from '@three-forma-styli/core';

export default defineTfsProject({
	system: {
		alpha: defineAlpha({
			defaultScale: 'standard',
			scales: {
				standard: {
					values: { min: 0.08, 'lo-x': 0.16, lo: 0.28, hi: 0.48, 'hi-x': 0.72, max: 0.88 },
				},
			},
		}),
		colors: {
			modes: [
				{
					name: 'paper',
					isDefault: true,
					tokens: {
						canvas: { mode: 'oklch', l: 0.97, c: 0.01, h: 92 },
						content: { mode: 'oklch', l: 0.18, c: 0.02, h: 84 },
						accent: { mode: 'oklch', l: 0.62, c: 0.19, h: 34 },
					},
				},
			],
		},
		spacing: {
			modes: [
				{
					name: 'comfortable',
					isDefault: true,
					tokens: { unit: 'rem', base: 0.5, min: 0.25, range: 6 },
				},
			],
		},
	},
	output: {
		directory: './generated',
		css: true,
		dtcg: true,
	},
});
