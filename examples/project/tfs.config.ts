import { defineTfsProject } from '@three-forma-styli/cli';
import { border, color, gap, spacing, time, typography } from '@three-forma-styli/themes/default';

/** A complete portable build using the default theme's system font stacks. */
export default defineTfsProject({
	system: {
		colors: color,
		spacing,
		gap,
		border,
		time,
		typography,
	},
	output: {
		directory: './generated',
		css: true,
		indexCss: true,
		typographyCss: true,
		typographyModule: true,
		typescript: true,
		systemTypescript: true,
		specimen: { title: 'TFS default project' },
		dtcg: true,
		figmaVariables: true,
	},
});
