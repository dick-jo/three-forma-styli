import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { loadConfigModule } from '../config/load-module.js';
import type { TfsProject } from '@three-forma-styli/compiler/project';

const DEFAULT_PORT = 4173;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WORKBENCH_FILE = path.join('review', 'index.html');
const DEFAULT_LEGACY_SPECIMEN_FILE = 'typography.specimen.html';
const MAX_PORT_ATTEMPTS = 20;

const contentTypes: Record<string, string> = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.otf': 'font/otf',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.wasm': 'application/wasm',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

export interface ResolvedReviewTarget {
	filePath: string;
	rootDirectory: string;
	urlPath: string;
}

export interface ServeReviewOptions {
	host?: string;
	port?: string | number;
	open?: boolean;
}

export interface RunningReviewServer {
	server: Server;
	host: string;
	port: number;
	url: string;
	close: () => Promise<void>;
}

function isProject(value: unknown): value is TfsProject {
	return Boolean(
		value && typeof value === 'object' && (value as TfsProject).kind === 'three-forma-styli/project'
	);
}

function isInside(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === '' ||
		(!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
	);
}

function urlPath(relativePath: string): string {
	return `/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

async function assertReviewFile(
	filePath: string,
	rootDirectory: string
): Promise<ResolvedReviewTarget> {
	if (!(await fs.pathExists(filePath))) {
		throw new Error(`Review entrypoint not found: ${filePath}. Run tfs build first.`);
	}
	const stats = await fs.stat(filePath);
	if (!stats.isFile()) throw new Error(`Review entrypoint is not a file: ${filePath}`);
	if (path.extname(filePath).toLowerCase() !== '.html') {
		throw new Error(`Review entrypoint must be an HTML file: ${filePath}`);
	}
	const relative = path.relative(rootDirectory, filePath);
	if (!isInside(rootDirectory, filePath)) {
		throw new Error(`Review entrypoint must stay inside its served root: ${filePath}`);
	}
	return { filePath, rootDirectory, urlPath: urlPath(relative) };
}

function selectedLegacySpecimenFile(project: TfsProject): string | undefined {
	if (project.output.layout === 'workspace-package') return undefined;
	const configured = project.output.specimen;
	if (!configured) return undefined;
	if (configured === true) return DEFAULT_LEGACY_SPECIMEN_FILE;
	return configured.file ?? DEFAULT_LEGACY_SPECIMEN_FILE;
}

async function resolveProjectReview(configPath: string): Promise<ResolvedReviewTarget> {
	const loaded = await loadConfigModule(configPath);
	const project = loaded.module.default;
	if (!isProject(project)) {
		throw new Error(`No TFS project exported as default from ${loaded.inputPath}.`);
	}
	const configDirectory = path.dirname(loaded.inputPath);
	const rootDirectory = path.resolve(configDirectory, project.output.directory);
	if (project.output.layout === 'workspace-package') {
		const review = project.output.targets.review;
		const workbench =
			review === true ||
			(Boolean(review) && typeof review === 'object' && Boolean(review.workbench));
		if (!workbench) {
			throw new Error(
				'This project does not generate a workbench. Enable output.targets.review.workbench, then run tfs build.'
			);
		}
		return assertReviewFile(path.join(rootDirectory, DEFAULT_WORKBENCH_FILE), rootDirectory);
	}

	const specimenFile = selectedLegacySpecimenFile(project);
	if (!specimenFile) {
		throw new Error(
			'This legacy project does not generate a review entrypoint. Enable output.specimen, then run tfs build.'
		);
	}
	if (path.isAbsolute(specimenFile)) {
		throw new Error('output.specimen.file must be relative to output.directory.');
	}
	const filePath = path.resolve(rootDirectory, specimenFile);
	if (!isInside(rootDirectory, filePath)) {
		throw new Error('output.specimen.file must stay inside output.directory.');
	}
	return assertReviewFile(filePath, rootDirectory);
}

function explicitHtmlRoot(filePath: string): string {
	const directory = path.dirname(filePath);
	return path.basename(directory) === 'review' ? path.dirname(directory) : directory;
}

/** Resolve either a project/config or an explicit generated review entrypoint. */
export async function resolveReviewTarget(target = '.'): Promise<ResolvedReviewTarget> {
	const resolved = path.resolve(process.cwd(), target);
	if (!(await fs.pathExists(resolved))) throw new Error(`Path not found: ${resolved}`);
	const stats = await fs.stat(resolved);
	if (stats.isFile()) {
		if (path.extname(resolved).toLowerCase() === '.html') {
			return assertReviewFile(resolved, explicitHtmlRoot(resolved));
		}
		return resolveProjectReview(resolved);
	}
	if (!stats.isDirectory())
		throw new Error(`Expected a project, directory, or HTML file: ${resolved}`);

	const configs = ['tfs.config.ts', 'tfs.config.js']
		.map((file) => path.join(resolved, file))
		.filter((file) => fs.pathExistsSync(file));
	if (configs.length > 1) {
		throw new Error(`Multiple TFS project configs found: ${configs.join(', ')}`);
	}
	if (configs[0]) return resolveProjectReview(configs[0]);

	const directWorkbench =
		path.basename(resolved) === 'review'
			? path.join(resolved, 'index.html')
			: path.join(resolved, DEFAULT_WORKBENCH_FILE);
	if (await fs.pathExists(directWorkbench)) {
		const root = path.basename(resolved) === 'review' ? path.dirname(resolved) : resolved;
		return assertReviewFile(directWorkbench, root);
	}
	const legacySpecimen = path.join(resolved, DEFAULT_LEGACY_SPECIMEN_FILE);
	if (await fs.pathExists(legacySpecimen)) return assertReviewFile(legacySpecimen, resolved);
	throw new Error(
		`No tfs.config.ts, tfs.config.js, ${DEFAULT_WORKBENCH_FILE}, or ${DEFAULT_LEGACY_SPECIMEN_FILE} found in ${resolved}.`
	);
}

export function parseServePort(value: string | number | undefined): number {
	if (value === undefined) return DEFAULT_PORT;
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
		throw new Error(`Invalid port "${value}". Expected an integer from 1 to 65535.`);
	}
	return parsed;
}

function sendError(response: ServerResponse, status: number, message: string): void {
	response.writeHead(status, {
		'Cache-Control': 'no-store',
		'Content-Type': 'text/plain; charset=utf-8',
		'X-Content-Type-Options': 'nosniff',
	});
	response.end(`${message}\n`);
}

function requestHandler(rootDirectory: string, reviewUrlPath: string) {
	return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			response.setHeader('Allow', 'GET, HEAD');
			sendError(response, 405, 'Method not allowed');
			return;
		}

		let pathname: string;
		try {
			pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
		} catch {
			sendError(response, 400, 'Invalid request path');
			return;
		}
		if (pathname === '/') {
			response.writeHead(302, { Location: reviewUrlPath });
			response.end();
			return;
		}
		if (pathname.includes('\0')) {
			sendError(response, 400, 'Invalid request path');
			return;
		}

		const candidate = path.resolve(rootDirectory, `.${pathname}`);
		if (!isInside(rootDirectory, candidate)) {
			sendError(response, 404, 'Not found');
			return;
		}
		try {
			const [realRoot, realCandidate] = await Promise.all([
				fs.realpath(rootDirectory),
				fs.realpath(candidate),
			]);
			if (!isInside(realRoot, realCandidate)) {
				sendError(response, 404, 'Not found');
				return;
			}
			const stats = await fs.stat(realCandidate);
			if (!stats.isFile()) {
				sendError(response, 404, 'Not found');
				return;
			}
			response.writeHead(200, {
				'Cache-Control': 'no-store',
				'Content-Length': stats.size,
				'Content-Type':
					contentTypes[path.extname(realCandidate).toLowerCase()] ?? 'application/octet-stream',
				'X-Content-Type-Options': 'nosniff',
			});
			if (request.method === 'HEAD') {
				response.end();
				return;
			}
			const stream = createReadStream(realCandidate);
			stream.on('error', () => {
				if (!response.headersSent) sendError(response, 500, 'Unable to read file');
				else response.destroy();
			});
			stream.pipe(response);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				sendError(response, 404, 'Not found');
				return;
			}
			sendError(response, 500, 'Unable to serve file');
		}
	};
}

function listen(server: Server, port: number, host: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const onError = (error: Error) => reject(error);
		server.once('error', onError);
		server.listen(port, host, () => {
			server.off('error', onError);
			resolve();
		});
	});
}

function displayHost(host: string): string {
	return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export async function startReviewServer(
	target: ResolvedReviewTarget,
	options: { host?: string; port?: number; strictPort?: boolean } = {}
): Promise<RunningReviewServer> {
	const host = options.host ?? DEFAULT_HOST;
	const requestedPort = options.port ?? DEFAULT_PORT;
	const attempts = options.strictPort ? 1 : MAX_PORT_ATTEMPTS;
	let lastError: unknown;

	for (let offset = 0; offset < attempts && requestedPort + offset <= 65_535; offset += 1) {
		const port = requestedPort + offset;
		const server = createServer(requestHandler(target.rootDirectory, target.urlPath));
		try {
			await listen(server, port, host);
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				throw new Error('Review server did not receive a TCP address.');
			}
			const actualPort = address.port;
			const url = `http://${displayHost(host)}:${actualPort}${target.urlPath}`;
			return {
				server,
				host,
				port: actualPort,
				url,
				close: () =>
					new Promise((resolve, reject) => {
						server.close((error) => (error ? reject(error) : resolve()));
						server.closeAllConnections();
					}),
			};
		} catch (error) {
			lastError = error;
			server.close();
			if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
		}
	}
	if ((lastError as NodeJS.ErrnoException | undefined)?.code === 'EADDRINUSE') {
		throw new Error(
			options.strictPort
				? `Port ${requestedPort} is already in use on ${host}.`
				: `No available port found from ${requestedPort} to ${Math.min(65_535, requestedPort + attempts - 1)} on ${host}.`
		);
	}
	throw lastError instanceof Error ? lastError : new Error('Unable to start review server.');
}

function openUrl(url: string): void {
	const command =
		process.platform === 'darwin'
			? { executable: 'open', args: [url] }
			: process.platform === 'win32'
				? { executable: 'cmd', args: ['/c', 'start', '', url] }
				: { executable: 'xdg-open', args: [url] };
	const child = spawn(command.executable, command.args, { detached: true, stdio: 'ignore' });
	child.once('error', (error) => {
		console.error(chalk.yellow(`Unable to open the browser automatically: ${error.message}`));
	});
	child.unref();
}

function waitForShutdown(server: RunningReviewServer): Promise<void> {
	return new Promise((resolve, reject) => {
		let stopping = false;
		const stop = () => {
			if (stopping) return;
			stopping = true;
			void server.close().then(resolve, reject);
		};
		process.once('SIGINT', stop);
		process.once('SIGTERM', stop);
		server.server.once('error', reject);
	});
}

export async function serveReviewCommand(
	targetPath: string | undefined,
	options: ServeReviewOptions
): Promise<void> {
	const target = await resolveReviewTarget(targetPath ?? '.');
	const explicitlySelectedPort = options.port !== undefined;
	const running = await startReviewServer(target, {
		host: options.host,
		port: parseServePort(options.port),
		strictPort: explicitlySelectedPort,
	});
	console.log(chalk.green('✓ TFS workbench ready'));
	console.log(chalk.cyan(running.url));
	console.log(chalk.dim('Press Ctrl+C to stop.'));
	if (options.open) openUrl(running.url);
	await waitForShutdown(running);
}
