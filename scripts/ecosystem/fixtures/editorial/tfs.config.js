import { defineTfsProject } from '@three-forma-styli/compiler';
import { defineAlpha, defineTypography } from '@three-forma-styli/core';

export default defineTfsProject({
	system: {
		alpha: defineAlpha({
			defaultScale: 'editorial',
			scales: {
				editorial: {
					values: { min: 0.06, 'lo-x': 0.12, lo: 0.22, hi: 0.42, 'hi-x': 0.68, max: 0.86 },
				},
			},
		}),
		colors: {
			modes: [
				{
					name: 'journal',
					isDefault: true,
					tokens: {
						paper: { mode: 'oklch', l: 0.95, c: 0.018, h: 78 },
						ink: { mode: 'oklch', l: 0.22, c: 0.025, h: 61 },
						annotation: { mode: 'oklch', l: 0.52, c: 0.08, h: 42 },
					},
				},
			],
		},
		typography: defineTypography({
			modes: [
				{
					name: 'reading',
					isDefault: true,
					tokens: {
						unit: 'rem',
						base: 1,
						min: 0.75,
						increment: 0.25,
						range: 8,
					},
				},
				{
					name: 'footnote',
					tokens: {
						unit: 'rem',
						base: 0.9375,
						min: 0.6875,
						increment: 0.21875,
						range: 8,
					},
				},
			],
			fonts: {
				editorial: {
					family: 'Charter',
					fallbacks: ['Georgia', 'serif'],
					verification: 'unavailable',
				},
				annotation: {
					family: 'system-ui',
					fallbacks: ['sans-serif'],
					verification: 'unavailable',
				},
			},
			roles: {
				article: {
					font: 'editorial',
					weights: { min: 400, max: 700 },
					weight: 'min',
					sizes: {
						min: {
							fontSize: 1,
							lineHeight: 1.45,
							letterSpacing: 0.005,
						},
						base: {
							fontSize: 2,
							lineHeight: 1.55,
							letterSpacing: 0,
						},
						max: {
							fontSize: 4,
							lineHeight: 1.35,
							letterSpacing: -0.01,
						},
					},
				},
				caption: {
					font: 'annotation',
					weights: { min: 400, max: 600 },
					weight: 'min',
					textTransform: 'uppercase',
					sizes: {
						min: {
							fontSize: 'min',
							weight: 'max',
							lineHeight: 1.25,
							letterSpacing: 0.06,
						},
						base: {
							fontSize: 1,
							lineHeight: 1.35,
							letterSpacing: 0.04,
						},
					},
				},
			},
		}),
	},
	output: {
		directory: './generated',
		css: true,
		indexCss: true,
		typographyCss: true,
		typographyModule: true,
		typescript: true,
		specimen: true,
		dtcg: true,
	},
});
