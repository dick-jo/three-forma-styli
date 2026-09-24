// Review excerpt of the generated ./tokens contract, not a second authored catalogue.
// The real export refers to tokenCatalogue.colorGroups and ships ESM plus declarations.
export const colorGroups = {
	glow: ['pri', 'neu'],
	network: ['network-base', 'network-optimism'],
} as const;

export type ColorGroupIdentity = keyof typeof colorGroups;
export type ColorIdentityIn<Group extends ColorGroupIdentity> = (typeof colorGroups)[Group][number];
