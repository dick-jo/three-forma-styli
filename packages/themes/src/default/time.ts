// src/config/time.ts
import { DesignSystem, TimeScale } from '@three-forma-styli/core';

// Every time scale is emitted at once. The default is unprefixed; others are named.
const TIME_SCALES: Record<string, TimeScale> = {
	default: {
		isDefault: true,
		tokens: {
			unit: 'ms',
			base: 100,
			min: 50,
			range: 10,
		},
	},
	anim: {
		tokens: {
			unit: 'ms',
			base: 1000,
			min: 500,
			range: 10,
		},
	},
};

// Export combined time configuration
export const time: DesignSystem['time'] = {
	scales: Object.entries(TIME_SCALES).map(([name, scale]) => ({
		name,
		...scale,
	})),
};
