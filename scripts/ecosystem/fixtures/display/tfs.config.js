import { defineTfsProject } from '@three-forma-styli/compiler';
import { defineAlpha, defineTypography } from '@three-forma-styli/core';

export default defineTfsProject({
	system: {
		alpha: defineAlpha({
			defaultScale: 'display',
			scales: {
				display: {
					values: { min: 0.08, 'lo-x': 0.18, lo: 0.3, hi: 0.5, 'hi-x': 0.64, max: 0.84 },
				},
			},
		}),
		colors: {
			modes: [
				{
					name: 'gallery',
					isDefault: true,
					tokens: {
						stage: { mode: 'oklch', l: 0.12, c: 0.025, h: 252 },
						ink: { mode: 'oklch', l: 0.95, c: 0.015, h: 90 },
						signal: { mode: 'oklch', l: 0.76, c: 0.2, h: 146 },
					},
				},
			],
		},
		spacing: {
			modes: [
				{
					name: 'screen',
					isDefault: true,
					tokens: { unit: 'px', base: 12, min: 4, range: 8 },
				},
				{
					name: 'stage',
					tokens: { unit: 'px', base: 24, min: 8, range: 8 },
				},
			],
		},
		typography: defineTypography({
			modes: [
				{
					name: 'screen',
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
					name: 'stage',
					tokens: {
						unit: 'rem',
						base: 2,
						min: 1,
						increment: 0.5,
						range: 8,
					},
				},
			],
			fonts: {
				display: {
					family: 'Arial Black',
					fallbacks: ['Arial', 'sans-serif'],
					verification: 'unavailable',
				},
				technical: {
					family: 'ui-monospace',
					fallbacks: ['monospace'],
					verification: 'unavailable',
				},
			},
			roles: {
				poster: {
					font: 'display',
					weights: { min: 400, hi: 700, max: 900 },
					weight: 'hi',
					textTransform: 'uppercase',
					sizes: {
						min: {
							fontSize: 2,
							weight: 'min',
							lineHeight: 1.05,
							letterSpacing: 0.01,
						},
						base: {
							fontSize: 5,
							lineHeight: 0.95,
							letterSpacing: -0.025,
						},
						max: {
							fontSize: 8,
							weight: 'max',
							lineHeight: 0.86,
							letterSpacing: -0.045,
						},
					},
					modeOverrides: {
						stage: {
							sizes: {
								base: { lineHeight: 0.9 },
								max: { lineHeight: 0.82, letterSpacing: -0.055 },
							},
						},
					},
				},
				technical: {
					font: 'technical',
					weights: { min: 400, max: 700 },
					weight: 'min',
					sizes: {
						base: {
							fontSize: 1,
							lineHeight: 1.2,
							letterSpacing: 0.04,
						},
						max: {
							fontSize: 3,
							weight: 'max',
							lineHeight: 1.1,
							letterSpacing: 0.02,
						},
					},
				},
			},
		}),
		time: {
			scales: [
				{
					name: 'interaction',
					isDefault: true,
					tokens: { unit: 'ms', base: 120, min: 60, range: 5 },
				},
			],
		},
		motion: {
			easings: {
				crisp: [0.2, 0, 0.2, 1],
				reveal: [0.1, 0.7, 0.2, 1],
			},
			composites: {
				respond: {
					base: { duration: 1, easing: 'crisp' },
					variants: {
						emphatic: { duration: 3, easing: 'reveal' },
					},
					displayOrder: ['base', 'emphatic'],
					reducedMotion: {
						base: { duration: 0, delay: 0 },
					},
				},
			},
		},
		shadows: {
			unit: 'px',
			box: {
				float: {
					base: [
						{ x: 0, y: 2, blur: 4, color: { color: 'ink', alpha: 'lo-x' } },
						{ x: 0, y: 18, blur: 56, spread: -12, color: { color: 'signal', alpha: 'lo-x' } },
					],
				},
			},
			text: {
				signal: {
					base: [
						{ x: 0, y: 0, blur: 3, color: { color: 'signal', alpha: 'hi-x' } },
						{ x: 0, y: 0, blur: 24, color: { color: 'signal', alpha: 'lo-x' } },
					],
				},
			},
		},
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
