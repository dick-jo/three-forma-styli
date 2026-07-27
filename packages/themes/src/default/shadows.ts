import type { DesignSystem } from '@three-forma-styli/core';

export const shadows: NonNullable<DesignSystem['shadows']> = {
	unit: 'px',
	box: {
		elevation: {
			base: [
				{ x: 0, y: 1, blur: 2, color: { color: 'shadow', alpha: 'lo' } },
				{ x: 0, y: 6, blur: 18, spread: -4, color: { color: 'shadow', alpha: 'lo-x' } },
			],
			variants: {
				min: [{ x: 0, y: 1, blur: 2, color: { color: 'shadow', alpha: 'lo-x' } }],
				lo: [
					{ x: 0, y: 1, blur: 2, color: { color: 'shadow', alpha: 'lo' } },
					{ x: 0, y: 3, blur: 8, spread: -2, color: { color: 'shadow', alpha: 'lo-x' } },
				],
				hi: [
					{ x: 0, y: 2, blur: 4, color: { color: 'shadow', alpha: 'lo' } },
					{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shadow', alpha: 'lo' } },
				],
				max: [
					{ x: 0, y: 3, blur: 6, color: { color: 'shadow', alpha: 'hi' } },
					{ x: 0, y: 20, blur: 48, spread: -8, color: { color: 'shadow', alpha: 'lo' } },
				],
			},
			displayOrder: ['min', 'lo', 'base', 'hi', 'max'],
		},
		glow: {
			base: [
				{ x: 0, y: 0, blur: 3, color: { color: 'pri', alpha: 'lo' } },
				{ x: 0, y: 0, blur: 16, color: { color: 'pri', alpha: 'lo-x' } },
			],
			variants: {
				min: [{ x: 0, y: 0, blur: 3, color: { color: 'pri', alpha: 'lo-x' } }],
				lo: [{ x: 0, y: 0, blur: 8, color: { color: 'pri', alpha: 'lo-x' } }],
				hi: [
					{ x: 0, y: 0, blur: 4, color: { color: 'pri', alpha: 'lo' } },
					{ x: 0, y: 0, blur: 24, color: { color: 'pri', alpha: 'lo' } },
				],
				max: [
					{ x: 0, y: 0, blur: 6, color: { color: 'pri', alpha: 'hi' } },
					{ x: 0, y: 0, blur: 40, color: { color: 'pri', alpha: 'lo' } },
				],
			},
			displayOrder: ['min', 'lo', 'base', 'hi', 'max'],
		},
	},
	text: {
		glow: {
			base: [
				{ x: 0, y: 0, blur: 2, color: { color: 'pri', alpha: 'lo' } },
				{ x: 0, y: 0, blur: 10, color: { color: 'pri', alpha: 'lo-x' } },
			],
			variants: {
				min: [{ x: 0, y: 0, blur: 2, color: { color: 'pri', alpha: 'lo-x' } }],
				lo: [{ x: 0, y: 0, blur: 5, color: { color: 'pri', alpha: 'lo-x' } }],
				hi: [
					{ x: 0, y: 0, blur: 3, color: { color: 'pri', alpha: 'lo' } },
					{ x: 0, y: 0, blur: 16, color: { color: 'pri', alpha: 'lo' } },
				],
				max: [
					{ x: 0, y: 0, blur: 4, color: { color: 'pri', alpha: 'hi' } },
					{ x: 0, y: 0, blur: 24, color: { color: 'pri', alpha: 'lo' } },
				],
			},
			displayOrder: ['min', 'lo', 'base', 'hi', 'max'],
		},
	},
};
