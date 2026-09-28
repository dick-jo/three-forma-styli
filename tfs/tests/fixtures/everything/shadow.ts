import { colors } from './color.js';
import { defineShadows, shadowsForColors } from 'three-forma-styli';

export const shadows = defineShadows({
	unit: 'px',

	// Ordinary range: --shd-min … --shd-max. Layers use the Color named `shd`.
	min: [{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'min' } }],
	lo: [
		{ x: 0, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
		{ x: 0, y: 6, blur: 18, spread: -4, color: { color: 'shd', alpha: 'min' } },
	],
	hi: [
		{ x: 0, y: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
		{ x: 0, y: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo-x' } },
	],
	max: [
		{ x: 0, y: 3, blur: 6, color: { color: 'shd', alpha: 'lo' } },
		{ x: 0, y: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
	],

	// Named extras: --shd-glow-pri-*, --shd-glow-duo-*.
	ranges: {
		...shadowsForColors({
			prefix: 'glow',
			colors: colors.groups.accents.identities,
			range: {
				min: [{ x: 0, y: 0, blur: 4, alpha: 'min' }],
				lo: [{ x: 0, y: 0, blur: 12, alpha: 'lo-x' }],
				hi: [{ x: 0, y: 0, blur: 24, alpha: 'lo' }],
				max: [{ x: 0, y: 0, blur: 40, alpha: 'lo' }],
			},
		}),
	},
});
