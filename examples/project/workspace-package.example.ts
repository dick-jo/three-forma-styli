import { defineTfsProject } from '@three-forma-styli/compiler';
import {
	alpha,
	border,
	color,
	gap,
	motion,
	shadows,
	spacing,
	time,
	typography,
} from '@three-forma-styli/themes/default';

/** Package-shaped output; the adjacent human-owned package.json declares exports. */
export default defineTfsProject({
	system: { alpha, colors: color, spacing, gap, border, time, motion, shadows, typography },
	runtime: {
		colorThemes: {
			colors: { include: ['bg', 'ev', 'shadow', 'pri', 'neu', 'ink', 'pos', 'neg'] },
			enforce: ['luminance'],
		},
	},
	output: {
		layout: 'workspace-package',
		directory: './generated',
		targets: {
			runtime: {
				css: { fileStem: 'design-system' },
				contracts: { tokens: true, system: false },
			},
			review: { workbench: { title: 'TFS workspace package' } },
			design: { dtcg: true, figmaVariables: true },
		},
	},
});
