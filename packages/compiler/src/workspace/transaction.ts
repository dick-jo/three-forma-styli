import { open, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import fs from 'fs-extra';

async function assertOwnedWorkspaceOutput(outputDirectory: string): Promise<void> {
	if (!(await fs.pathExists(outputDirectory))) return;
	const stats = await fs.lstat(outputDirectory);
	if (stats.isSymbolicLink())
		throw new Error('Generated workspace directory must not be a symlink.');
	if (!stats.isDirectory())
		throw new Error('Generated workspace path exists and is not a directory.');
	if ((await fs.readdir(outputDirectory)).length === 0) return;
	const manifestPath = path.join(outputDirectory, 'build.manifest.json');
	if (!(await fs.pathExists(manifestPath))) {
		throw new Error(
			`Refusing to replace non-empty unowned directory ${outputDirectory}; build.manifest.json is missing.`
		);
	}
	let manifest: unknown;
	try {
		manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	} catch {
		throw new Error(`Refusing to replace ${outputDirectory}; build.manifest.json is invalid.`);
	}
	const owner = manifest as {
		schemaVersion?: unknown;
		layout?: unknown;
		tool?: { name?: unknown };
	};
	const ownedLegacy = owner.tool?.name === 'three-forma-styli' && owner.schemaVersion === 1;
	const ownedWorkspace =
		owner.tool?.name === 'three-forma-styli' &&
		owner.schemaVersion === 2 &&
		owner.layout === 'workspace-package';
	if (!ownedLegacy && !ownedWorkspace) {
		throw new Error(
			`Refusing to replace ${outputDirectory}; it is not marked as a workspace-package output owned by TFS.`
		);
	}
}

export interface WorkspaceTransactionHooks {
	afterBackupBeforeInstall?: () => void | Promise<void>;
	afterInstallBeforeValidation?: () => void | Promise<void>;
	beforeBackupCleanup?: () => void | Promise<void>;
}

class CommittedCleanupError extends Error {
	readonly committed = true;
}

async function rollbackInstalled(
	outputDirectory: string,
	backup: string,
	movedPrevious: boolean
): Promise<void> {
	if (await fs.pathExists(outputDirectory)) await fs.remove(outputDirectory);
	if (movedPrevious && (await fs.pathExists(backup))) await fs.move(backup, outputDirectory);
}

async function commit(
	staging: string,
	outputDirectory: string,
	validateInstalled: () => void | Promise<void>,
	hooks: WorkspaceTransactionHooks
): Promise<void> {
	await assertOwnedWorkspaceOutput(outputDirectory);
	const backup = `${outputDirectory}.tfs-backup-${process.pid}`;
	if (await fs.pathExists(backup)) throw new Error(`Build backup already exists: ${backup}`);
	let movedPrevious = false;
	if (await fs.pathExists(outputDirectory)) {
		await fs.move(outputDirectory, backup);
		movedPrevious = true;
	}
	try {
		await hooks.afterBackupBeforeInstall?.();
		await fs.move(staging, outputDirectory);
	} catch (error) {
		await rollbackInstalled(outputDirectory, backup, movedPrevious);
		throw error;
	}
	try {
		await hooks.afterInstallBeforeValidation?.();
		await validateInstalled();
	} catch (error) {
		await rollbackInstalled(outputDirectory, backup, movedPrevious);
		throw error;
	}
	if (movedPrevious) {
		try {
			await hooks.beforeBackupCleanup?.();
			await fs.remove(backup);
		} catch (error) {
			throw new CommittedCleanupError(
				`Workspace output was committed, but backup cleanup failed at ${backup}: ${(error as Error).message}`
			);
		}
	}
}

export interface WorkspaceTransaction {
	staging: string;
	commit(validateInstalled?: () => void | Promise<void>): Promise<void>;
}

/** One writer, one staging sibling, one rollback-safe directory replacement. */
export async function withWorkspaceTransaction<T>(
	outputDirectory: string,
	work: (transaction: WorkspaceTransaction) => Promise<T>,
	hooks: WorkspaceTransactionHooks = {},
	options: { requireCommit?: boolean } = {}
): Promise<T> {
	await assertOwnedWorkspaceOutput(outputDirectory);
	await fs.ensureDir(path.dirname(outputDirectory));
	const lockPath = `${outputDirectory}.tfs-lock`;
	let lock: FileHandle | undefined;
	try {
		lock = await open(lockPath, 'wx');
	} catch {
		throw new Error(`Another TFS build appears to be using ${outputDirectory}.`);
	}
	const staging = await fs.mkdtemp(
		path.join(path.dirname(outputDirectory), '.tfs-workspace-stage-')
	);
	let committed = false;
	try {
		const result = await work({
			staging,
			commit: async (validateInstalled = () => {}) => {
				if (committed) throw new Error('Workspace transaction was already committed.');
				try {
					await commit(staging, outputDirectory, validateInstalled, hooks);
					committed = true;
				} catch (error) {
					if (error instanceof CommittedCleanupError) committed = true;
					throw error;
				}
			},
		});
		if (!committed && options.requireCommit !== false) {
			throw new Error('Workspace transaction completed without committing output.');
		}
		return result;
	} finally {
		await lock?.close();
		await fs.remove(lockPath);
		if (!committed) await fs.remove(staging);
	}
}
