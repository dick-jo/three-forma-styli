export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

export const tokenNamePattern = /^[a-z][a-z0-9-]*$/i;
const cssUnitPattern = /^(?:%|[a-z][a-z0-9-]*)$/i;

export type NamedMode = { name: string; isDefault?: boolean };

export function validateNamedModes(modes: NamedMode[], path: string, label: string): void {
	const seen = new Map<string, number>();
	const defaults: string[] = [];

	for (const [index, mode] of modes.entries()) {
		if (!mode.name) {
			throw new ValidationError(`${label} mode at index ${index} must have a name`);
		}
		if (!tokenNamePattern.test(mode.name)) {
			throw new ValidationError(`${path}[${index}].name "${mode.name}" is not CSS-token safe`);
		}
		const previous = seen.get(mode.name);
		if (previous !== undefined) {
			throw new ValidationError(
				`${path} contains duplicate mode name "${mode.name}" at indexes ${previous} and ${index}`
			);
		}
		seen.set(mode.name, index);
		if (mode.isDefault === true) defaults.push(mode.name);
	}

	if (defaults.length > 1) {
		throw new ValidationError(
			`${path} must have at most one default mode; found ${defaults.map((name) => `"${name}"`).join(', ')}`
		);
	}
}

export function validateCssUnit(unit: unknown, path: string): asserts unit is string {
	if (typeof unit !== 'string' || !cssUnitPattern.test(unit)) {
		throw new ValidationError(`${path} must be a CSS-safe unit such as "px", "rem", "%", or "ms"`);
	}
}

export function validateFiniteNumber(value: unknown, path: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new ValidationError(`${path} must be a finite number`);
	}
}
