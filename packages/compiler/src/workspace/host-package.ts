import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { requiredPackageExports, type RequiredPackageExport, type WorkspacePlan } from './plan.js';

export interface HostPackageSnapshot {
	path: string;
	root: string;
	hash: string;
	manifest: Record<string, unknown>;
	generatedFromHost: string;
	requiredExports: RequiredPackageExport[];
}

function hash(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

function isInside(directory: string, candidate: string): boolean {
	const relative = path.relative(directory, candidate);
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function display(value: unknown): string {
	return JSON.stringify(value);
}

function assertExactExport(
	exports: Record<string, unknown>,
	required: RequiredPackageExport,
	manifestPath: string
): void {
	const actual = exports[required.subpath];
	if (typeof required.target === 'string') {
		if (actual !== required.target) {
			throw new Error(
				`${manifestPath} export ${required.subpath} must be ${display(required.target)}; received ${display(actual)}.`
			);
		}
		return;
	}
	if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
		throw new Error(
			`${manifestPath} export ${required.subpath} must provide exact types and import targets ${display(required.target)}.`
		);
	}
	const conditions = actual as Record<string, unknown>;
	const conditionKeys = Object.keys(conditions);
	if (conditionKeys.length !== 2 || conditionKeys[0] !== 'types' || conditionKeys[1] !== 'import') {
		throw new Error(
			`${manifestPath} export ${required.subpath} conditions must be exactly ["types", "import"] in that order; received ${display(conditionKeys)}.`
		);
	}
	for (const condition of ['types', 'import'] as const) {
		if (conditions[condition] !== required.target[condition]) {
			throw new Error(
				`${manifestPath} export ${required.subpath}.${condition} must be ${display(required.target[condition])}; received ${display(conditions[condition])}.`
			);
		}
	}
}

function globRegExp(pattern: string): RegExp {
	let source = '^';
	for (let index = 0; index < pattern.length; index += 1) {
		const char = pattern[index]!;
		if (char === '*') {
			if (pattern[index + 1] === '*') {
				index += 1;
				source += '.*';
			} else source += '[^/]*';
		} else if (char === '?') source += '[^/]';
		else source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
	}
	return new RegExp(`${source}$`);
}

function normalizedPackagePath(value: string): string {
	return value.replace(/^\.\//, '').replace(/\\/g, '/').replace(/\/$/, '');
}

function patternCovers(pattern: string, file: string): boolean {
	const normalizedPattern = normalizedPackagePath(pattern);
	const normalizedFile = normalizedPackagePath(file);
	if (normalizedFile === normalizedPattern || normalizedFile.startsWith(`${normalizedPattern}/`)) {
		return true;
	}
	return globRegExp(normalizedPattern).test(normalizedFile);
}

function sideEffectPatternCovers(pattern: string, file: string): boolean {
	return globRegExp(normalizedPackagePath(pattern)).test(normalizedPackagePath(file));
}

function assertCssSideEffects(
	manifest: Record<string, unknown>,
	plan: WorkspacePlan,
	generatedFromHost: string,
	manifestPath: string
): void {
	if (!plan.host.verifySideEffects) return;
	const css = plan.artifacts
		.filter((artifact) => artifact.kind === 'runtime-css')
		.map((artifact) => path.posix.join(generatedFromHost, artifact.path));
	if (css.length === 0) return;
	if (manifest.sideEffects === true) return;
	if (
		!Array.isArray(manifest.sideEffects) ||
		!manifest.sideEffects.every((entry) => typeof entry === 'string')
	) {
		throw new Error(
			`${manifestPath} sideEffects must be true or an array covering generated runtime CSS (for example ${display(`./${path.posix.join(generatedFromHost, 'runtime/styles/*.css')}`)}).`
		);
	}
	for (const file of css) {
		if (
			!(manifest.sideEffects as string[]).some((pattern) => sideEffectPatternCovers(pattern, file))
		) {
			throw new Error(`${manifestPath} sideEffects does not cover generated CSS ./${file}.`);
		}
	}
}

function assertFilesCoverage(
	manifest: Record<string, unknown>,
	plan: WorkspacePlan,
	generatedFromHost: string,
	manifestPath: string
): void {
	if (plan.host.verifyPublishedFiles === 'never') return;
	const publishable = manifest.private !== true;
	const hasFiles = manifest.files !== undefined;
	if (plan.host.verifyPublishedFiles === 'if-publishable' && !publishable && !hasFiles) return;
	if (!hasFiles) {
		throw new Error(
			`${manifestPath} must declare an explicit files array so generated runtime/assets cannot be excluded by publish rules.`
		);
	}
	if (
		!Array.isArray(manifest.files) ||
		!manifest.files.every((entry) => typeof entry === 'string')
	) {
		throw new Error(`${manifestPath} files must be an array of package-relative paths.`);
	}
	const publishArtifacts = plan.artifacts.filter((artifact) => artifact.target === 'runtime');
	for (const artifact of publishArtifacts) {
		const file = path.posix.join(generatedFromHost, artifact.path);
		if (!(manifest.files as string[]).some((pattern) => patternCovers(pattern, file))) {
			throw new Error(`${manifestPath} files does not publish ./${file}.`);
		}
	}
	if (plan.artifacts.some((artifact) => artifact.target === 'assets')) {
		const assets = path.posix.join(generatedFromHost, plan.fontDirectory);
		if (!(manifest.files as string[]).some((pattern) => patternCovers(pattern, assets))) {
			throw new Error(
				`${manifestPath} files does not publish the prepared font subtree ./${assets}.`
			);
		}
	}
}

async function assertNoSymlinkPath(root: string, candidate: string): Promise<void> {
	let current = candidate;
	while (current !== root) {
		try {
			const stats = await fs.lstat(current);
			if (stats.isSymbolicLink()) {
				throw new Error(`Generated output path must not traverse a symlink: ${current}`);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
}

/** Validate the immutable, human-owned host manifest before staging any generated output. */
export async function validateHostPackage(
	configDirectory: string,
	outputDirectory: string,
	plan: WorkspacePlan
): Promise<HostPackageSnapshot> {
	if (path.isAbsolute(plan.host.manifest)) {
		throw new Error('output.hostPackage.manifest must be relative to the TFS config.');
	}
	const manifestPath = path.resolve(configDirectory, plan.host.manifest);
	if (!(await fs.pathExists(manifestPath))) {
		throw new Error(`Human-owned host package manifest is missing: ${manifestPath}`);
	}
	const stats = await fs.lstat(manifestPath);
	if (stats.isSymbolicLink() || !stats.isFile()) {
		throw new Error(`Host package manifest must be a regular, non-symlink file: ${manifestPath}`);
	}
	const root = path.dirname(manifestPath);
	if (!isInside(root, outputDirectory)) {
		throw new Error(
			'The workspace-package generated directory must be strictly inside its host package.'
		);
	}
	if (isInside(outputDirectory, manifestPath) || outputDirectory === manifestPath) {
		throw new Error(
			'The human-owned package.json must be outside the TFS-owned generated directory.'
		);
	}
	await assertNoSymlinkPath(root, outputDirectory);

	const bytes = await fs.readFile(manifestPath);
	let manifest: Record<string, unknown>;
	try {
		manifest = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
	} catch {
		throw new Error(`Host package manifest is not valid JSON: ${manifestPath}`);
	}
	if (manifest.type !== 'module') {
		throw new Error(`${manifestPath} must declare "type": "module" for generated ESM contracts.`);
	}
	if (
		!manifest.exports ||
		typeof manifest.exports !== 'object' ||
		Array.isArray(manifest.exports)
	) {
		throw new Error(
			`${manifestPath} must declare an exports object for enabled generated targets.`
		);
	}
	const generatedFromHost = path.relative(root, outputDirectory).split(path.sep).join('/');
	const requiredExports = requiredPackageExports(plan, generatedFromHost);
	for (const required of requiredExports) {
		assertExactExport(manifest.exports as Record<string, unknown>, required, manifestPath);
	}
	assertCssSideEffects(manifest, plan, generatedFromHost, manifestPath);
	assertFilesCoverage(manifest, plan, generatedFromHost, manifestPath);
	return {
		path: manifestPath,
		root,
		hash: hash(bytes),
		manifest,
		generatedFromHost,
		requiredExports,
	};
}

/** Re-read immediately before replacement so TFS never races a human package edit. */
export async function assertHostPackageUnchanged(snapshot: HostPackageSnapshot): Promise<void> {
	const stats = await fs.lstat(snapshot.path);
	if (stats.isSymbolicLink() || !stats.isFile()) {
		throw new Error('Host package manifest changed type while the TFS build was running.');
	}
	const current = hash(await fs.readFile(snapshot.path));
	if (current !== snapshot.hash) {
		throw new Error(
			`Host package manifest changed while TFS was building; generated output was not replaced: ${snapshot.path}`
		);
	}
}
