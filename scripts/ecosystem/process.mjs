import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const packageManagerCommands = new Set(['npm', 'pnpm', 'yarn']);

function portableCommand(command) {
	if (process.platform === 'win32' && packageManagerCommands.has(command)) {
		return `${command}.cmd`;
	}
	return command;
}

/** Run one fixture command with quiet output and actionable failure details. */
export function run(command, args, options = {}) {
	const executable = portableCommand(command);
	return execFileSync(executable, args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		shell: process.platform === 'win32' && executable.endsWith('.cmd'),
		...options,
	}).trim();
}

/** Write deterministic, newline-terminated JSON fixture input. */
export async function writeJson(file, value) {
	await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
