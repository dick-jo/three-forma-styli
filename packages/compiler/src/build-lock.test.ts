import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireBuildLock } from './build-lock.js';

const roots: string[] = [];

async function fixture(): Promise<{ root: string; output: string; lock: string }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-build-lock-'));
	roots.push(root);
	const output = path.join(root, 'generated');
	return { root, output, lock: `${output}.tfs-lock` };
}

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => fs.remove(root)));
});

describe('build locks', () => {
	it('records inspectable ownership and rejects a concurrent live writer', async () => {
		const { output, lock } = await fixture();
		const acquired = await acquireBuildLock(output, 'workspace-package');
		const metadata = await fs.readJson(lock);

		expect(metadata).toMatchObject({
			schemaVersion: 1,
			tool: 'three-forma-styli',
			kind: 'workspace-package',
			pid: process.pid,
			host: os.hostname(),
			outputDirectory: output,
		});
		expect(metadata.id).toMatch(/^[0-9a-f-]{36}$/i);
		expect(Number.isFinite(Date.parse(metadata.startedAt))).toBe(true);
		await expect(acquireBuildLock(output, 'workspace-package')).rejects.toThrow(
			`live PID ${process.pid}`
		);

		await acquired.release();
		expect(await fs.pathExists(lock)).toBe(false);
	});

	it('recovers a metadata lock whose same-host owner has exited', async () => {
		const { output, lock } = await fixture();
		await fs.writeJson(lock, {
			schemaVersion: 1,
			id: 'dead-owner',
			tool: 'three-forma-styli',
			kind: 'legacy',
			pid: 2_147_483_647,
			host: os.hostname(),
			startedAt: new Date().toISOString(),
			outputDirectory: output,
		});

		const acquired = await acquireBuildLock(output, 'legacy');
		expect(acquired.metadata.id).not.toBe('dead-owner');
		await acquired.release();
	});

	it('recovers old pre-metadata locks but never guesses about a fresh invalid lock', async () => {
		const old = await fixture();
		await fs.writeFile(old.lock, '');
		const oldTime = new Date(Date.now() - 7 * 60 * 60 * 1000);
		await fs.utimes(old.lock, oldTime, oldTime);
		const acquired = await acquireBuildLock(old.output, 'legacy');
		await acquired.release();

		const fresh = await fixture();
		await fs.writeFile(fresh.lock, '');
		await expect(acquireBuildLock(fresh.output, 'legacy')).rejects.toThrow(
			'legacy or invalid lock is only'
		);
	});
});
