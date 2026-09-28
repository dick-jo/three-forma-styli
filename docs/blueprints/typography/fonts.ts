import type { TypographyFont } from '@three-forma-styli/core';

export const fonts = {
	sans: {
		family: 'system-ui',
		fallbacks: ['sans-serif'],
		// A system stack has no project font file for TFS to inspect.
		verification: 'unavailable',
	},
} satisfies Record<string, TypographyFont>;
