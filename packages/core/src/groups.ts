import type { IdentityGroup } from './types.js';

/** Expand authored taxonomy into deterministic literal identity tuples. */
export function resolveIdentityGroups(
	identities: readonly string[],
	groups: Readonly<Record<string, IdentityGroup>> = {}
): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(groups).map(([groupName, group]) => [
			groupName,
			'identities' in group && group.identities
				? [...group.identities]
				: identities.filter((identity) => identity.startsWith(group.match.prefix)),
		])
	);
}
