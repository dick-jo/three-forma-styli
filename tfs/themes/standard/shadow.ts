import { defineShadows } from 'three-forma-styli';

export const shadows = defineShadows({
	unit: 'px',

	// Elevation: --shd-min … --shd-max.
	min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo-x' } }],
	lo: [
		{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
		{ x: 0, y: 3, blur: 8, spread: -2, color: { color: 'shd', alpha: 'lo-x' } },
	],
	hi: [
		{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
		{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo' } },
	],
	max: [
		{ x: 0, y: 3, blur: 6, color: { color: 'shd', alpha: 'hi' } },
		{ x: 0, y: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
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
