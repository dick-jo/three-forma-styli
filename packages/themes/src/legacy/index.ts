import { oklch, type DesignSystem, type TypographyMode } from '@three-forma-styli/core';

const alphaSchedule = {
	non: 0,
	min: 0.07,
	'lo-x': 0.125,
	lo: 0.25,
	hi: 0.68,
	'hi-x': 0.85,
	max: 0.93,
};

export const color: DesignSystem['colors'] = {
	modes: [
		{
			name: 'dark',
			isDefault: true,
			tokens: {
				bg: oklch(0.2603, 0, 129.63),
				ev: oklch(0.2935, 0.0018, 286.29),
				pri: oklch(0.7969, 0.1178, 296.37),
				neu: oklch(0.9302, 0.0371, 299.19),
				ink: oklch(0.9333, 0.0371, 299.2),
				pos: oklch(0.7625, 0.203, 150.49),
				neg: oklch(0.6875, 0.2113, 7.38),
			},
			alphaSchedule,
		},
	],
	alphaSchedule,
};

export const spacing: DesignSystem['spacing'] = {
	modes: [
		{ name: 'default', isDefault: true, tokens: { unit: 'px', base: 8, min: 4, range: 12 } },
		{ name: 'small', tokens: { unit: 'px', base: 4, min: 2, range: 12 } },
		{ name: 'large', tokens: { unit: 'px', base: 16, min: 8, range: 12 } },
	],
};

export const gap: DesignSystem['gap'] = {
	modes: ['default', 'small', 'large'].map((name) => ({
		name,
		isDefault: name === 'default' || undefined,
		tokens: { spacingMode: name, min: 'min', s: 1, l: 2, max: 3 },
	})),
};

export const border: DesignSystem['border'] = {
	radius: {
		modes: ['default', 'small', 'large'].map((name) => ({
			name,
			isDefault: name === 'default' || undefined,
			tokens: { spacingMode: name, unit: 'px', min: 'min', s: 1, l: 2, max: 3 },
		})),
	},
	width: {
		modes: [
			{ name: 'default', isDefault: true, tokens: { unit: 'px', value: 1 } },
			{ name: 'small', tokens: { unit: 'px', value: 0.5 } },
			{ name: 'large', tokens: { unit: 'px', value: 2 } },
		],
	},
};

export const time: DesignSystem['time'] = {
	modes: [
		{ name: 'default', isDefault: true, tokens: { unit: 'ms', base: 100, min: 50, range: 10 } },
		{ name: 'anim', tokens: { unit: 'ms', base: 1000, min: 500, range: 10 } },
	],
};

/** The pre-semantic typography modes retained for existing consumers. */
export const TYPOGRAPHY_MODES: Record<string, TypographyMode> = {
	default: {
		isDefault: true,
		tokens: { unit: 'rem', base: 0.875, min: 0.625, increment: 0.125, range: 12 },
	},
	small: {
		tokens: { unit: 'rem', base: 0.75, min: 0.625, increment: 0.125, range: 12 },
	},
	large: {
		tokens: { unit: 'rem', base: 1.125, min: 0.75, increment: 0.5, range: 12 },
	},
};

export const typography: DesignSystem['typography'] = {
	modes: Object.entries(TYPOGRAPHY_MODES).map(([name, mode]) => ({ name, ...mode })),
};

export const legacyDesignSystem: DesignSystem = {
	colors: color,
	spacing,
	gap,
	typography,
	border,
	time,
};

export default legacyDesignSystem;
