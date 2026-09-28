import { axes } from './axes.js';
import { alpha, colors } from './color.js';
import { spacing, gap } from './spacing.js';
import { border } from './border.js';
import { shadows } from './shadow.js';
import { time, easings } from './motion.js';
import { fontSize, typography } from './typography.js';

// Lets every define…() check mode and colour names across files while typing.
declare module 'three-forma-styli' {
	interface Register {
		axes: typeof axes;
		colors: typeof colors;
	}
}

// Assembly. Output options are illustrative until runbook step 8.
export default {
	system: {
		axes,
		alpha,
		colors,
		spacing,
		gap,
		border,
		shadows,
		time,
		easings,
		fontSize,
		typography,
	},
	runtime: {
		// Colours customers may set in their own themes at runtime.
		colorThemes: { colors: ['bg', 'ev', 'ink', 'neu', 'pri', 'duo'] },
	},
	output: { directory: './generated' },
};
