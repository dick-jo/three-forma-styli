import { oklch } from '@three-forma-styli/core';
import type { axes } from '../../axes/separate-files/axes.js';
import type { alpha } from '../alpha.js';
import type { ColorDraft } from '../review-types.js';

// A small, separate palette for reviewing Groups. Values are illustrative.
export const colors = {
	tokens: {
		neu: oklch(0.88, 0, 0),
		pri: oklch(0.6, 0.16, 285),
		'network-base': oklch(0.6, 0.16, 250),
		'network-optimism': oklch(0.6, 0.18, 25),
	},
	groups: {
		// Exactly these identities, in this order. Membership may overlap other Groups.
		glow: { identities: ['pri', 'neu'] },
		// Every identity beginning with `network-`, in palette declaration order.
		network: { match: { prefix: 'network-' } },
	},
} as const satisfies ColorDraft<typeof axes, typeof alpha>;
