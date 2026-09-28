import { axes } from './axes.js';
import { alpha } from './alpha.js';
import { colors } from './color.js';
import { spacing } from './spacing.js';
import { gap } from './gap.js';
import { border } from './border.js';
import { shadows } from './shadow.js';
import { time } from './time.js';
import { easings } from './easing.js';
import { fontSize } from './font-size.js';
import { typography } from './typography.js';

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
		typography,
	},
	output: { directory: './generated' },
};
