import { axes } from './axes.js';
import { alpha, colors } from './color.js';
import { spacing, gap } from './spacing.js';
import { border } from './border.js';
import { shadows } from './shadow.js';
import { time, easings } from './motion.js';
import { fontSize, fonts, typography } from './typography.js';

// Assembly. Output options are illustrative; their exact shape is runbook work.
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
		fonts,
		typography,
	},
	output: { directory: './generated' },
};
