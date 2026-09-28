import type { SizeRow } from '../resolve/input.js';
import { ROLE_SIZE_POSITIONS } from '../const.js';

/** A role's size row name: `label` for base, `label-s` otherwise. */
export function rowName(role: string, size: string): string {
	return size === 'base' ? role : `${role}-${size}`;
}

export function rowsInOrder(sizes: Readonly<Record<string, SizeRow>>): [string, SizeRow][] {
	return ROLE_SIZE_POSITIONS.flatMap((size) =>
		sizes[size] ? [[size, sizes[size]!] as [string, SizeRow]] : []
	);
}
