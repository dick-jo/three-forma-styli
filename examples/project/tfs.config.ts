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

const projectColors = {
	...color,
	groups: {
		foundation: { identities: ['bg', 'ev', 'shadow', 'pri', 'neu', 'ink'] },
		sentiment: { identities: ['pos', 'neg'] },
	},
} as const;

/** Canonical v0.5 review project: one command produces runtime, design and review surfaces. */
export default defineTfsProject({
	system: {
		alpha,
		colors: projectColors,
		spacing,
		gap,
		border,
		time,
		motion,
		shadows,
		typography,
	},
	runtime: {
		colorThemes: {
			colors: { include: [{ group: 'foundation' }, { group: 'sentiment' }] },
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
			review: { workbench: { title: 'TFS v0.5 reference system' } },
			design: { dtcg: true, figmaVariables: true },
		},
	},
});
