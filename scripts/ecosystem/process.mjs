import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

/** Run one fixture command with quiet output and actionable failure details. */
export function run(command, args, options) {
	return execFileSync(command, args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		...options,
	}).trim();
}

/** Write deterministic, newline-terminated JSON fixture input. */
export async function writeJson(file, value) {
	await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
