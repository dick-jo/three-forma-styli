/**
 * Shared utilities for token generators
 */

/**
 * Get the default named entry from an ordered collection.
 *
 * Returns the entry with isDefault: true, or the first entry when none is marked.
 */
export function getDefaultEntry<T extends { isDefault?: boolean; name: string }>(entries: T[]): T {
	const explicitDefault = entries.find((entry) => entry.isDefault);
	return explicitDefault || entries[0];
}
