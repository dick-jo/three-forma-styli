import { randomUUID } from 'node:crypto';
import { open, type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const legacyLockRecoveryAgeMs = 6 * 60 * 60 * 1000;

interface BuildLockMetadata {
	schemaVersion: 1;
	id: string;
	tool: 'three-forma-styli';
	kind: 'legacy' | 'workspace-package';
	pid: number;
	host: string;
	startedAt: string;
	outputDirectory: string;
}

export interface BuildLock {
	path: string;
	metadata: BuildLockMetadata;
	release(): Promise<void>;
}

function processIsAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
}

function parseMetadata(value: string): BuildLockMetadata | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}
	if (!parsed || typeof parsed !== 'object') return undefined;
	const lock = parsed as Partial<BuildLockMetadata>;
	if (
		lock.schemaVersion !== 1 ||
		typeof lock.id !== 'string' ||
		lock.tool !== 'three-forma-styli' ||
		(lock.kind !== 'legacy' && lock.kind !== 'workspace-package') ||
		typeof lock.pid !== 'number' ||
		!Number.isSafeInteger(lock.pid) ||
		lock.pid <= 0 ||
		typeof lock.host !== 'string' ||
		typeof lock.startedAt !== 'string' ||
		!Number.isFinite(Date.parse(lock.startedAt)) ||
		typeof lock.outputDirectory !== 'string'
	) {
		return undefined;
	}
	return lock as BuildLockMetadata;
}

async function inspectExistingLock(lockPath: string): Promise<{
	recoverable: boolean;
	detail: string;
}> {
	const stats = await fs.lstat(lockPath);
	if (stats.isSymbolicLink()) {
		return {
			recoverable: false,
			detail: `lock path is a symbolic link and will not be removed automatically: ${lockPath}`,
		};
	}
	if (!stats.isFile()) {
		return {
			recoverable: false,
			detail: `lock path is not a regular file and will not be removed automatically: ${lockPath}`,
		};
	}
	const metadata = parseMetadata(await fs.readFile(lockPath, 'utf8'));
	if (!metadata) {
		const age = Date.now() - stats.mtimeMs;
		return age >= legacyLockRecoveryAgeMs
			? {
					recoverable: true,
					detail: `legacy or invalid lock is ${Math.floor(age / 60_000)} minutes old`,
				}
			: {
					recoverable: false,
					detail: `legacy or invalid lock is only ${Math.max(0, Math.floor(age / 1000))} seconds old`,
				};
	}
	if (metadata.host !== os.hostname()) {
		return {
			recoverable: false,
			detail: `lock belongs to PID ${metadata.pid} on host ${metadata.host} since ${metadata.startedAt}`,
		};
	}
	if (processIsAlive(metadata.pid)) {
		return {
			recoverable: false,
			detail: `lock belongs to live PID ${metadata.pid} on ${metadata.host} since ${metadata.startedAt}`,
		};
	}
	return {
		recoverable: true,
		detail: `lock belongs to exited PID ${metadata.pid} on ${metadata.host}`,
	};
}

async function writeMetadata(handle: FileHandle, metadata: BuildLockMetadata): Promise<void> {
	await handle.writeFile(`${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
	await handle.sync();
}

async function releaseOwnedLock(handle: FileHandle, lockPath: string, id: string): Promise<void> {
	await handle.close();
	let current: BuildLockMetadata | undefined;
	try {
		current = parseMetadata(await fs.readFile(lockPath, 'utf8'));
	} catch {
		return;
	}
	if (current?.id === id) await fs.remove(lockPath);
}

/**
 * Acquire one inspectable build lock, recovering only locks that can be proven
 * stale on this host (plus old empty locks produced by pre-metadata TFS builds).
 */
export async function acquireBuildLock(
	outputDirectory: string,
	kind: BuildLockMetadata['kind']
): Promise<BuildLock> {
	const lockPath = `${outputDirectory}.tfs-lock`;
	await fs.ensureDir(path.dirname(lockPath));
	for (let attempt = 0; attempt < 2; attempt += 1) {
		let handle: FileHandle;
		try {
			handle = await open(lockPath, 'wx');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
			const existing = await inspectExistingLock(lockPath);
			if (!existing.recoverable || attempt > 0) {
				throw new Error(
					`Another TFS build appears to be using ${outputDirectory}; ${existing.detail}.`
				);
			}
			await fs.remove(lockPath);
			continue;
		}
		const metadata: BuildLockMetadata = {
			schemaVersion: 1,
			id: randomUUID(),
			tool: 'three-forma-styli',
			kind,
			pid: process.pid,
			host: os.hostname(),
			startedAt: new Date().toISOString(),
			outputDirectory,
		};
		try {
			await writeMetadata(handle, metadata);
		} catch (error) {
			await handle.close();
			await fs.remove(lockPath);
			throw error;
		}
		return {
			path: lockPath,
			metadata,
			release: () => releaseOwnedLock(handle, lockPath, metadata.id),
		};
	}
	throw new Error(`Unable to acquire TFS build lock for ${outputDirectory}.`);
}
