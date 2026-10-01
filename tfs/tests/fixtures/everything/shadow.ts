import { colors } from './color.js';
import { defineShadows, shadowsForColors } from 'three-forma-styli';

export const shadows = defineShadows({
	unit: 'px',

	// Ordinary set, directional: --shd-down-*, --shd-up-*, --shd-left-*, --shd-right-*.
	// offset is how far each falls; x shifts down/up sideways, y shifts left/right.
	directions: ['down', 'up', 'left', 'right'],
	min: [{ offset: 1, blur: 2, color: { color: 'shd', alpha: 'min' } }],
	lo: [
		{ offset: 1, x: 1, y: 1, blur: 2, color: { color: 'shd', alpha: 'lo' } },
		{ offset: 6, blur: 18, spread: -4, color: { color: 'shd', alpha: 'min' } },
	],
	hi: [
		{ offset: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
		{ offset: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo-x' } },
	],
	max: [
		{ offset: 3, blur: 6, color: { color: 'shd', alpha: 'lo' } },
		{ offset: 20, blur: 48, spread: -8, color: { color: 'shd', alpha: 'lo' } },
	],

	// Small screens get a tighter max in every direction; its colour still follows the theme.
	modes: {
		size: {
			s: {
				max: [
					{ offset: 2, blur: 4, color: { color: 'shd', alpha: 'lo' } },
					{ offset: 12, blur: 32, spread: -6, color: { color: 'shd', alpha: 'lo' } },
				],
			},
		},
	},

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
