import { tokenReference } from './consumer-contract.js';

// Real applications import this existing helper from their generated ./tokens module.
export const transitionStyle = {
	transitionDuration: tokenReference('t-hi'),
	transitionDelay: tokenReference('t-min'),
	transitionTimingFunction: tokenReference('ease-pri'),
} as const;
