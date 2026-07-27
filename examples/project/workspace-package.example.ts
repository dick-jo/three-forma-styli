import { defineTfsProject } from '@three-forma-styli/compiler';
import { border, color, gap, spacing, time, typography } from '@three-forma-styli/themes/default';

/** Package-shaped output; the adjacent human-owned package.json declares exports. */
export default defineTfsProject({
	system: { colors: color, spacing, gap, border, time, typography },
	output: {
		layout: 'workspace-package',
		directory: './generated',
		targets: {
			runtime: { css: { fileStem: 'design-system' }, contracts: {} },
			review: { workbench: { title: 'TFS workspace package' } },
			design: { dtcg: true, figmaVariables: true },
		},
	},
});
