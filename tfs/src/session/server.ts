import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkbenchData } from '../emit/workbench.js';

const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.svg': 'image/svg+xml',
};

/** Built Workbench app, shipped inside the package at dist/workbench/. */
const WORKBENCH = fileURLToPath(new URL('../workbench/', import.meta.url));

async function sendFile(response: ServerResponse, root: string, relative: string): Promise<void> {
	const path = normalize(join(root, relative));
	const inside = path.startsWith(root.endsWith(sep) ? root : root + sep);
	const file = inside ? await stat(path).catch(() => undefined) : undefined;
	if (!file?.isFile()) {
		response.writeHead(404).end('Not found');
		return;
	}
	response.writeHead(200, {
		'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
		'cache-control': 'no-store',
		// Any origin may read: the Figma plugin fetches generated/figma.json from its sandbox.
		'access-control-allow-origin': '*',
	});
	createReadStream(path).pipe(response);
}

export type WorkbenchServer = {
	readonly url: string;
	readonly publish: (data: WorkbenchData) => void;
	readonly close: () => void;
};

/** Serves Workbench, the generated/ output, the current data, and a "rebuilt" event stream. */
export async function startWorkbenchServer(outDir: string, port: number): Promise<WorkbenchServer> {
	let data: WorkbenchData | undefined;
	let version = 0;
	const listeners = new Set<ServerResponse>();

	const server = createServer((request, response) => {
		const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
		if (path === '/workbench.json') {
			response
				.writeHead(200, { 'content-type': TYPES['.json']!, 'cache-control': 'no-store' })
				.end(JSON.stringify({ version, ...data }));
			return;
		}
		if (path === '/events') {
			response.writeHead(200, {
				'content-type': 'text/event-stream',
				'cache-control': 'no-store',
				connection: 'keep-alive',
			});
			response.write(': connected\n\n');
			listeners.add(response);
			request.on('close', () => listeners.delete(response));
			return;
		}
		if (path.startsWith('/generated/'))
			return void sendFile(response, outDir, path.slice('/generated/'.length));
		return void sendFile(response, WORKBENCH, path === '/' ? 'index.html' : path.slice(1));
	});

	const url = await new Promise<string>((resolve, reject) => {
		const attempt = (candidate: number, triesLeft: number) => {
			server.once('error', (error: NodeJS.ErrnoException) =>
				error.code === 'EADDRINUSE' && triesLeft > 0
					? attempt(candidate + 1, triesLeft - 1)
					: reject(error)
			);
			server.listen(candidate, '127.0.0.1', () => {
				const address = server.address();
				resolve(
					`http://localhost:${typeof address === 'object' && address ? address.port : candidate}`
				);
			});
		};
		attempt(port, 10);
	});

	return {
		url,
		publish(next) {
			data = next;
			version++;
			for (const listener of listeners) listener.write(`data: ${version}\n\n`);
		},
		close() {
			for (const listener of listeners) listener.end();
			server.close();
		},
	};
}
