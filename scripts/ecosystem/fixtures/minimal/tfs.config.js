import { defineTfsProject } from '@three-forma-styli/compiler';

export default defineTfsProject({
	system: {
		colors: {
			alphaSchedule: {
				quiet: 0.16,
				loud: 0.72,
			},
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
