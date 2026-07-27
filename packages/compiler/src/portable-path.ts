const reservedWindowsName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function assertPortablePathSegment(value: string, label: string): void {
	if (
		value === '' ||
		value === '.' ||
		value === '..' ||
		/[<>:"/\\|?*\u0000-\u001f]/.test(value) ||
		/[. ]$/.test(value) ||
		reservedWindowsName.test(value)
	) {
		throw new Error(
			`${label} must use portable path segments; spaces, #, and Unicode are allowed, but platform-reserved characters and names are not.`
		);
	}
}

/** Validate author-configured path segments; containment is checked by the caller. */
export function assertPortableConfiguredPath(value: string, label: string): void {
	for (const segment of value.split('/')) {
		if (segment === '' || segment === '.' || segment === '..') continue;
		assertPortablePathSegment(segment, label);
	}
}
