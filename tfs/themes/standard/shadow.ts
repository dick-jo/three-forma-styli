import { defineShadows } from 'three-forma-styli';

export const shadows = defineShadows({
	unit: 'px',

	// Elevation, cast whichever way a surface needs: --shd-down-* (most things),
	// --shd-up-* (sheets rising from the bottom), --shd-left-* / --shd-right-* (drawers).
	// offset is how far each layer falls.
	directions: ['down', 'up', 'left', 'right'],
	min: [{ offset: 1, blur: 2, color: { color: 'shd', alpha: 'lo-x' } }],
	lo: [
		{ offset: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
		{ offset: 3, blur: 8, spread: -2, color: { color: 'shd', alpha: 'lo-x' } },
	],
	hi: [
		{ offset: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
		{ offset: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo' } },
	],
	max: [
		{ offset: 3, blur: 6, color: { color: 'shd', alpha: 'hi' } },
		{ offset: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
	],

	ranges: {
		// Primary glow: --shd-glow-min … --shd-glow-max.
		glow: {
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
	},
});
