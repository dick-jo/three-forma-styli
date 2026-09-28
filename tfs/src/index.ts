export { defineAxes, type AxisCatalogue, type Register } from './define/axes.js';
export {
	defineAlpha,
	defineColors,
	deriveAlphaScale,
	oklch,
	type AlphaPosition,
	type ColorIdentity,
	type Oklch,
} from './define/color.js';
export { defineGap, defineSpacing } from './define/spacing.js';
export { defineBorder } from './define/border.js';
export { defineShadows, shadowsForColors } from './define/shadow.js';
export {
	cubicBezier,
	defineEasings,
	defineTime,
	linear,
	type EasingValue,
} from './define/motion.js';
export { defineFonts, defineFontSize, defineTypography } from './define/typography.js';
export {
	resolveSystem,
	TfsError,
	type Issue,
	type ResolvedSystem,
	type SystemInput,
} from './resolve/index.js';
