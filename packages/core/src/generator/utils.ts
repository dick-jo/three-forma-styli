/**
 * Shared utilities for token generators
 */

/**
 * Get the default mode from an array of modes
 *
 * Returns the mode with isDefault: true, or the first mode if none is marked as default.
 */
export function getDefaultMode<T extends { isDefault?: boolean; name: string }>(modes: T[]): T {
	const defaultMode = modes.find((m) => m.isDefault);
	return defaultMode || modes[0];
}
