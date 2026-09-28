import { LENGTH_UNITS } from '../const.js';
import type { Issues } from './issues.js';

/** Identities become parts of CSS custom-property and class names. */
const IDENTITY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

export function checkIdentity(issues: Issues, path: string, name: string): void {
	issues.check(
		IDENTITY.test(name),
		path,
		`"${name}" must be lowercase letters, digits and single hyphens, starting with a letter`
	);
}

export function checkUnit(issues: Issues, path: string, unit: unknown): void {
	issues.check(
		typeof unit === 'string' && (LENGTH_UNITS as readonly string[]).includes(unit),
		path,
		`"${String(unit)}" is not a supported CSS length unit`
	);
}

export function checkFinite(issues: Issues, path: string, value: unknown): value is number {
	return issues.check(
		isFiniteNumber(value),
		path,
		`must be a finite number (got ${String(value)})`
	);
}

export function checkPositiveInteger(issues: Issues, path: string, value: unknown): void {
	issues.check(
		Number.isInteger(value) && (value as number) > 0,
		path,
		`must be a positive whole number (got ${String(value)})`
	);
}

/** Checks that numbers in the given order strictly increase. */
export function checkIncreasing(
	issues: Issues,
	path: string,
	entries: readonly (readonly [string, number])[]
): void {
	for (let index = 1; index < entries.length; index++) {
		const [previousName, previous] = entries[index - 1]!;
		const [name, value] = entries[index]!;
		if (!(value > previous)) {
			issues.add(path, `${name} (${value}) must be greater than ${previousName} (${previous})`);
		}
	}
}
