import { watch } from 'node:fs';
import { relative, resolve } from 'node:path';
import { buildProject } from './build.js';
import { loadConfig, type LoadedConfig } from './config.js';
import { describeError, describeFontFiles, fontFilesOf } from './report.js';

type DevSession = { readonly close: () => void; readonly settled: () => Promise<void> };

/**
 * `tfs dev`: builds, then rebuilds on every save. An invalid edit prints its
 * problems and leaves the last valid output in place.
 */
export async function startDev(
	target: string,
	log: (line: string) => void = console.log
): Promise<DevSession> {
	let loaded: LoadedConfig | undefined;
	let fontsShown = '';
	let running = Promise.resolve();

	const run = () =>
		(running = running.then(async () => {
			const started = Date.now();
			try {
				loaded = await loadConfig(target);
				const fonts = describeFontFiles(fontFilesOf(loaded.config.system), loaded.projectDir).join(
					'\n  '
				);
				if (fonts && fonts !== fontsShown) log(`Font files:\n  ${fonts}`);
				fontsShown = fonts;
				await buildProject(loaded);
				log(
					`✓ built ${relative(process.cwd(), loaded.outDir) || '.'} in ${Date.now() - started}ms`
				);
			} catch (error) {
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
	log(
		`Watching ${relative(process.cwd(), projectDir) || '.'} — save a file to rebuild. Ctrl+C to stop.`
	);
	return { close: () => watcher.close(), settled: () => running };
}
