#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { buildProject, checkProject } from './session/build.js';
import { loadConfig } from './session/config.js';
import { startDev } from './session/dev.js';
import { resolve } from 'node:path';
import { DEFAULT_FOLDER, initProject } from './session/init.js';
import { describeError, describeFontFiles } from './session/report.js';

/** The command prefix for whichever package manager ran us. */
function runner(): string {
	const agent = process.env.npm_config_user_agent ?? '';
	return agent.startsWith('pnpm') ? 'pnpm' : agent.startsWith('yarn') ? 'yarn' : 'npx';
}

const HELP = `tfs — Three Forma Styli

  tfs init [dir]                start a design system in dir (default ./design-system; . = this folder)
  tfs dev [dir]                 build, then rebuild on every save
  tfs build [dir]               check everything and write generated/
  tfs check [dir]               fail if generated/ is out of date (for CI)
  tfs fonts inspect <files...>  show what font files offer

[dir] is the design-system folder. Default: the current folder, or ./design-system inside it.`;

async function main(argv: string[]): Promise<number> {
	const { positionals, values } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { help: { type: 'boolean', short: 'h' } },
	});
	const [command, ...rest] = positionals;
	if (values.help) return (console.log(HELP), 0);
	if (!command) return (console.log(HELP), 1);

	if (command === 'init') {
		const folder = rest[0] ?? DEFAULT_FOLDER;
		const files = await initProject(folder);
		const run = runner();
		const here = resolve(folder) === process.cwd();
		console.log(
			[
				`✓ ${here ? 'added' : `created ${folder}/ with`}: ${files.join(', ')}`,
				'',
				'Next:',
				`  ${run} tfs dev      live session: builds ${here ? '' : `${folder}/`}generated/, serves Workbench`,
				...(here
					? []
					: ['', `Your app imports ${folder}/generated/styles.css once, from its entry file.`]),
			].join('\n')
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
