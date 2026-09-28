import { watch } from 'node:fs';
import { relative, resolve } from 'node:path';
import { workbenchData } from '../emit/workbench.js';
import { TfsError } from '../resolve/issues.js';
import type { ResolvedSystem } from '../resolve/index.js';
import { buildProject } from './build.js';
import { loadConfig, type LoadedConfig } from './config.js';
import { describeError, describeFontFiles } from './report.js';
import { startWorkbenchServer, type WorkbenchServer } from './server.js';

type DevSession = {
	readonly url: string;
	readonly close: () => void;
	readonly settled: () => Promise<void>;
};

function problemsOf(error: unknown): string[] {
	return error instanceof TfsError
		? error.issues.map((issue) => `${issue.path}: ${issue.message}`)
		: [describeError(error)];
}

function fontsOf(loaded: LoadedConfig) {
	return Object.entries(loaded.config.system.typography?.fonts ?? {}).flatMap(([id, font]) =>
		font.files
			? [
					{
						id,
						faces: describeFontFiles(font.files, loaded.projectDir).map((line) =>
							line.replace(/\n\s+/, ' — ')
						),
					},
				]
			: []
	);
}

/**
 * `tfs dev`: builds, serves Workbench, then rebuilds on every save. An invalid
 * edit is reported in the terminal and in Workbench; the last valid output stays.
 */
export async function startDev(
	target: string,
	log: (line: string) => void = console.log,
	port = 5178
): Promise<DevSession> {
	let loaded: LoadedConfig | undefined;
	let lastValid: ResolvedSystem | undefined;
	let server: WorkbenchServer | undefined;
	let fontsShown = '';
	let running = Promise.resolve();

	const run = () =>
		(running = running.then(async () => {
			const started = Date.now();
			let fonts: ReturnType<typeof fontsOf> = [];
			try {
				loaded = await loadConfig(target);
				server ??= await startWorkbenchServer(loaded.outDir, port);
				fonts = fontsOf(loaded);
				const shown = fonts.map((font) => `${font.id}: ${font.faces.join('; ')}`).join('\n  ');
				if (shown && shown !== fontsShown) log(`Font files:\n  ${shown}`);
				fontsShown = shown;
				lastValid = (await buildProject(loaded)).resolved;
				server.publish(workbenchData(lastValid, [], fonts));
				log(
					`✓ built ${relative(process.cwd(), loaded.outDir) || '.'} in ${Date.now() - started}ms`
				);
			} catch (error) {
				server?.publish(workbenchData(lastValid, problemsOf(error), fonts));
				log(`✗ ${describeError(error)}\n  (previous output kept)`);
			}
		}));

	await run();
	const projectDir = loaded?.projectDir ?? resolve(target);
	let timer: NodeJS.Timeout | undefined;
	const watcher = watch(projectDir, { recursive: true }, (_event, file) => {
		if (!file) return;
		const path = resolve(projectDir, file);
		const ignored =
			file.includes('node_modules') ||
			file.includes('.tfs-') ||
			(loaded && path.startsWith(loaded.outDir));
		if (ignored) return;
		clearTimeout(timer);
		timer = setTimeout(run, 100);
	});
	const url = server?.url ?? '';
	log(
		`Workbench: ${url}\nWatching ${relative(process.cwd(), projectDir) || '.'} — save a file to rebuild. Ctrl+C to stop.`
	);
	return {
		url,
		close: () => {
			watcher.close();
			server?.close();
		},
		settled: () => running,
	};
}
