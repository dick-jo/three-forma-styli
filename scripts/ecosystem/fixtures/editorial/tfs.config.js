import { defineTfsProject } from '@three-forma-styli/compiler';

export default defineTfsProject({
	system: {
		colors: {
			alphaSchedule: {
				soft: 0.12,
				strong: 0.68,
			},
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
		typography: {
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
					weights: {
						book: 400,
						emphasis: 700,
					},
					base: {
						fontSize: 2,
						weight: 'book',
						lineHeight: 1.55,
						letterSpacing: 0,
					},
					variants: {
						aside: {
							fontSize: 1,
							weight: 'book',
							lineHeight: 1.45,
							letterSpacing: 0.005,
						},
						lead: {
							fontSize: 4,
							weight: 'book',
							lineHeight: 1.35,
							letterSpacing: -0.01,
						},
					},
					displayOrder: ['aside', 'base', 'lead'],
				},
				caption: {
					font: 'annotation',
					weights: {
						plain: 400,
						emphasis: 600,
					},
					textTransform: 'uppercase',
					base: {
						fontSize: 'min',
						weight: 'emphasis',
						lineHeight: 1.25,
						letterSpacing: 0.06,
					},
					variants: {
						expanded: {
							fontSize: 1,
							weight: 'plain',
							lineHeight: 1.35,
							letterSpacing: 0.04,
						},
					},
					displayOrder: ['base', 'expanded'],
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
