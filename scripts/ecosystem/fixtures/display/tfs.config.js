import { defineTfsProject } from '@three-forma-styli/compiler';

export default defineTfsProject({
	system: {
		colors: {
			alphaSchedule: {
				soft: 0.18,
				strong: 0.64,
			},
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
		typography: {
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
					weights: {
						quiet: 400,
						loud: 700,
						maximum: 900,
					},
					textTransform: 'uppercase',
					base: {
						fontSize: 5,
						weight: 'loud',
						lineHeight: 0.95,
						letterSpacing: -0.025,
					},
					variants: {
						micro: {
							fontSize: 2,
							weight: 'quiet',
							lineHeight: 1.05,
							letterSpacing: 0.01,
						},
						hero: {
							fontSize: 8,
							weight: 'maximum',
							lineHeight: 0.86,
							letterSpacing: -0.045,
						},
					},
					modeOverrides: {
						stage: {
							base: { lineHeight: 0.9 },
							variants: {
								hero: { lineHeight: 0.82, letterSpacing: -0.055 },
							},
						},
					},
					displayOrder: ['micro', 'base', 'hero'],
				},
				technical: {
					font: 'technical',
					weights: {
						plain: 400,
						strong: 700,
					},
					base: {
						fontSize: 1,
						weight: 'plain',
						lineHeight: 1.2,
						letterSpacing: 0.04,
					},
					variants: {
						loud: {
							fontSize: 3,
							weight: 'strong',
							lineHeight: 1.1,
							letterSpacing: 0.02,
						},
					},
					displayOrder: ['base', 'loud'],
				},
			},
		},
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
			recipes: {
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
						{ x: 0, y: 2, blur: 4, color: { color: 'ink', alpha: 'soft' } },
						{ x: 0, y: 18, blur: 56, spread: -12, color: { color: 'signal', alpha: 'soft' } },
					],
				},
			},
			text: {
				signal: {
					base: [
						{ x: 0, y: 0, blur: 3, color: { color: 'signal', alpha: 'strong' } },
						{ x: 0, y: 0, blur: 24, color: { color: 'signal', alpha: 'soft' } },
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
