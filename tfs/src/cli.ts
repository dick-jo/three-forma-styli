#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { buildProject, checkProject } from './session/build.js';
import { loadConfig } from './session/config.js';
import { startDev } from './session/dev.js';
import { initProject } from './session/init.js';
import { describeError, describeFontFiles } from './session/report.js';

const HELP = `tfs — Three Forma Styli

  tfs init <dir>                start a new project from the standard theme
  tfs dev [dir]                 build, then rebuild on every save
  tfs build [dir]               check everything and write generated/
  tfs check [dir]               fail if generated/ is out of date (for CI)
  tfs fonts inspect <files...>  show what font files offer

[dir] is the folder containing tfs.config.ts (default: current folder).`;

async function main(argv: string[]): Promise<number> {
	const { positionals, values } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { help: { type: 'boolean', short: 'h' } },
	});
	const [command, ...rest] = positionals;
	if (values.help) return (console.log(HELP), 0);
	if (!command) return (console.log(HELP), 1);

	if (command === 'init' && rest[0]) {
		const files = await initProject(rest[0]);
		console.log(
			`✓ created ${rest[0]}: ${files.join(', ')}\n\nNext:\n  cd ${rest[0]}\n  pnpm add -D three-forma-styli\n  pnpm tfs dev`
		);
		return 0;
	}
	if (command === 'build') {
		const loaded = await loadConfig(rest[0] ?? '.');
		await buildProject(loaded);
		console.log(`✓ built ${loaded.outDir}`);
		return 0;
	}
	if (command === 'check') {
		const differences = await checkProject(await loadConfig(rest[0] ?? '.'));
		if (differences.length === 0) return (console.log('✓ generated output is up to date'), 0);
		console.log(`✗ generated output is out of date; run tfs build:\n  ${differences.join('\n  ')}`);
		return 1;
	}
	if (command === 'dev') {
		await startDev(rest[0] ?? '.');
		return new Promise<number>(() => {});
	}
	if (command === 'fonts' && rest[0] === 'inspect' && rest.length > 1) {
		console.log(describeFontFiles(rest.slice(1)).join('\n'));
		return 0;
	}
	console.log(HELP);
	return 1;
}

main(process.argv.slice(2)).then(
	(code) => process.exit(code),
	(error) => {
		console.error(`✗ ${describeError(error)}`);
		process.exit(1);
	}
);
