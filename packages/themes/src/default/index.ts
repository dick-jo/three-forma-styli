import { DesignSystem } from '@three-forma-styli/core';
import { alpha, color } from './color.js';
import { spacing } from './spacing.js';
import { gap } from './gap.js';
import { typography } from './typography.js';
import { border } from './border.js';
import { time } from './time.js';
import { motion } from './motion.js';
import { shadows } from './shadows.js';

// Default starter theme - a complete, ready-to-use design system
export const designSystem: DesignSystem = {
	alpha,
	colors: color,
	spacing,
	gap,
	typography,
	border,
	time,
	motion,
	shadows,
};

// Also export as default for convenience
export default designSystem;

// Also export individual parts for customization
export { alpha, color, spacing, gap, typography, border, time, motion, shadows };
export { ALPHA_VALUES } from './color.js';
export { TYPOGRAPHY_FONTS, TYPOGRAPHY_MODES, TYPOGRAPHY_ROLES } from './typography.js';
