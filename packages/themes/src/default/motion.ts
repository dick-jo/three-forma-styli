import type { DesignSystem, MotionRecipe } from '@three-forma-styli/core';

const interactionRange = (easing: string): MotionRecipe => ({
	base: { duration: 2, easing },
	variants: {
		min: { duration: 'min' },
		lo: { duration: 1 },
		hi: { duration: 3 },
		max: { duration: 4 },
	},
	displayOrder: ['min', 'lo', 'base', 'hi', 'max'],
	reducedMotion: {
		base: { duration: 0, delay: 0 },
	},
});

/**
 * Property-agnostic transition fragments. Applications decide which selector
 * and CSS properties use them; these names are merely the stock theme's intent.
 */
export const motion: NonNullable<DesignSystem['motion']> = {
	easings: {
		standard: [0.2, 0, 0.38, 0.9],
		enter: [0, 0, 0.38, 0.9],
		exit: [0.2, 0, 1, 0.9],
	},
	recipes: {
		hover: interactionRange('standard'),
		press: interactionRange('standard'),
		focus: interactionRange('standard'),
		enter: interactionRange('enter'),
		exit: interactionRange('exit'),
	},
};
