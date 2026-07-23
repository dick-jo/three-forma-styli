import { createServer, type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import {
	parseServePort,
	resolveReviewTarget,
	startReviewServer,
	type RunningReviewServer,
} from './review.js';

const temporaryDirectories: string[] = [];
const runningServers: RunningReviewServer[] = [];

async function temporaryDirectory(): Promise<string> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-review-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

async function occupyPort(): Promise<{ server: Server; port: number }> {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected a TCP address.');
	return { server, port: address.port };
}

afterEach(async () => {
	await Promise.all(runningServers.splice(0).map((server) => server.close()));
	await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)));
});

describe('resolveReviewTarget', () => {
	it('serves an explicit HTML file from its containing directory', async () => {
		const directory = await temporaryDirectory();
		const filePath = path.join(directory, 'type proof.html');
		await fs.writeFile(filePath, '<h1>Proof</h1>');

		await expect(resolveReviewTarget(filePath)).resolves.toEqual({
			filePath,
			rootDirectory: directory,
			urlPath: '/type%20proof.html',
		});
	});

	it('resolves a workspace workbench while serving the entire generated root', async () => {
		const directory = await temporaryDirectory();
		const workbench = path.join(directory, 'dist', 'review', 'index.html');
		await fs.ensureDir(path.dirname(workbench));
		await fs.writeFile(workbench, '<h1>Project review</h1>');
		await fs.writeFile(
			path.join(directory, 'tfs.config.js'),
			`export default {
				kind: 'three-forma-styli/project',
				schemaVersion: 1,
				system: {},
				output: {
					layout: 'workspace-package',
					directory: './dist',
					targets: { review: { workbench: true } },
				},
			};\n`
		);

		await expect(resolveReviewTarget(directory)).resolves.toEqual({
			filePath: workbench,
			rootDirectory: path.join(directory, 'dist'),
			urlPath: '/review/index.html',
		});
	});

	it('keeps legacy specimen projects available during migration', async () => {
		const directory = await temporaryDirectory();
		const specimen = path.join(directory, 'dist', 'review', 'type.html');
		await fs.ensureDir(path.dirname(specimen));
		await fs.writeFile(specimen, '<h1>Legacy proof</h1>');
		await fs.writeFile(
			path.join(directory, 'tfs.config.js'),
			`export default {
				kind: 'three-forma-styli/project',
				schemaVersion: 1,
				system: {},
				output: { directory: './dist', specimen: { file: 'review/type.html' } },
			};\n`
		);

		await expect(resolveReviewTarget(directory)).resolves.toEqual({
			filePath: specimen,
			rootDirectory: path.join(directory, 'dist'),
			urlPath: '/review/type.html',
		});
	});

	it('reports when workspace review output is disabled', async () => {
		const directory = await temporaryDirectory();
		await fs.writeFile(
			path.join(directory, 'tfs.config.js'),
			`export default {
				kind: 'three-forma-styli/project',
				schemaVersion: 1,
				system: {},
				output: {
					layout: 'workspace-package',
					directory: './dist',
					targets: {},
				},
			};\n`
		);

		await expect(resolveReviewTarget(directory)).rejects.toThrow(
			'This project does not generate a workbench'
		);
	});
});

describe('review server', () => {
	it('serves the workbench and sibling generated assets with browser-safe content types', async () => {
		const directory = await temporaryDirectory();
		const reviewDirectory = path.join(directory, 'review');
		await fs.ensureDir(reviewDirectory);
		const workbench = path.join(reviewDirectory, 'index.html');
		await fs.writeFile(workbench, '<script src="./workbench.js"></script><h1>Review</h1>');
		await fs.writeFile(path.join(reviewDirectory, 'workbench.js'), 'console.log("review");');
		await fs.outputFile(path.join(directory, 'assets', 'fonts', 'fonts.css'), '@font-face {}');
		const target = await resolveReviewTarget(workbench);
		const running = await startReviewServer(target, { port: 0 });
		runningServers.push(running);

		const redirected = await fetch(`http://127.0.0.1:${running.port}/`, { redirect: 'manual' });
		expect(redirected.status).toBe(302);
		expect(redirected.headers.get('location')).toBe('/review/index.html');

		const html = await fetch(running.url);
		expect(html.status).toBe(200);
		expect(html.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(html.headers.get('cache-control')).toBe('no-store');
		expect(await html.text()).toContain('<h1>Review</h1>');

		const css = await fetch(`http://127.0.0.1:${running.port}/assets/fonts/fonts.css`);
		expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8');
		expect(await css.text()).toContain('@font-face');
	});

	it('does not serve a symlink outside the generated review directory', async () => {
		const directory = await temporaryDirectory();
		const outside = await temporaryDirectory();
		const specimen = path.join(directory, 'typography.specimen.html');
		await fs.writeFile(specimen, '<h1>Proof</h1>');
		await fs.writeFile(path.join(outside, 'secret.txt'), 'not for the server');
		await fs.symlink(path.join(outside, 'secret.txt'), path.join(directory, 'linked.txt'));
		const running = await startReviewServer(await resolveReviewTarget(specimen), { port: 0 });
		runningServers.push(running);

		const response = await fetch(`http://127.0.0.1:${running.port}/linked.txt`);
		expect(response.status).toBe(404);
	});

	it('advances from the default-style requested port when it is occupied', async () => {
		const occupied = await occupyPort();
		try {
			if (occupied.port === 65_535) return;
			const directory = await temporaryDirectory();
			const specimen = path.join(directory, 'typography.specimen.html');
			await fs.writeFile(specimen, '<h1>Proof</h1>');
			const running = await startReviewServer(await resolveReviewTarget(specimen), {
				port: occupied.port,
			});
			runningServers.push(running);
			expect(running.port).toBe(occupied.port + 1);
		} finally {
			await new Promise<void>((resolve, reject) =>
				occupied.server.close((error) => (error ? reject(error) : resolve()))
			);
		}
	});

	it('fails clearly when an explicitly selected port is occupied', async () => {
		const occupied = await occupyPort();
		try {
			const directory = await temporaryDirectory();
			const specimen = path.join(directory, 'typography.specimen.html');
			await fs.writeFile(specimen, '<h1>Proof</h1>');
			await expect(
				startReviewServer(await resolveReviewTarget(specimen), {
					port: occupied.port,
					strictPort: true,
				})
			).rejects.toThrow(`Port ${occupied.port} is already in use`);
		} finally {
			await new Promise<void>((resolve, reject) =>
				occupied.server.close((error) => (error ? reject(error) : resolve()))
			);
		}
	});
});

describe('parseServePort', () => {
	it('uses the conventional local review port by default', () => {
		expect(parseServePort(undefined)).toBe(4173);
	});

	it('accepts valid port strings and rejects ambiguous or unsafe values', () => {
		expect(parseServePort('4400')).toBe(4400);
		expect(() => parseServePort('44.5')).toThrow('Invalid port');
		expect(() => parseServePort('0')).toThrow('Invalid port');
		expect(() => parseServePort('nope')).toThrow('Invalid port');
	});
});
