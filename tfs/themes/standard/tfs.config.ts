import { defineConfig } from 'three-forma-styli';
import { axes } from './axes.js';
import { border } from './border.js';
import { alpha, colors } from './color.js';
import { easings, time } from './motion.js';
import { shadows } from './shadow.js';
import { gap, spacing } from './spacing.js';
import { fontSize, typography } from './typography.js';

// Lets every define…() check mode and colour names across files while you type.
declare module 'three-forma-styli' {
	interface Register {
		axes: typeof axes;
		colors: typeof colors;
	}
}

export default defineConfig({
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
});
