import { execFile } from 'node:child_process';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'fs-extra';

const execFileAsync = promisify(execFile);

export interface FontToolsConversionProvenance {
	executable: string;
	fontToolsVersion: string;
	python: {
		implementation: string;
		version: string;
	};
}

/** @internal Converter boundary shared by tool discovery and font preparation. */
export interface FontToolsConverter {
	provenance: FontToolsConversionProvenance;
	convert(source: string, destination: string): Promise<void>;
	decompress(source: string, destination: string): Promise<void>;
}

function pathCandidates(command: string): string[] {
	if (path.isAbsolute(command) || command.includes('/') || command.includes('\\')) return [command];
	const directories = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
	if (process.platform !== 'win32')
		return directories.map((directory) => path.join(directory, command));
	const extensions = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
	return directories.flatMap((directory) =>
		extensions.map((extension) => path.join(directory, `${command}${extension.toLowerCase()}`))
	);
}

async function resolveExecutable(command: string): Promise<string> {
	for (const candidate of pathCandidates(command)) {
		try {
			const stats = await fs.stat(candidate);
			if (stats.isFile()) return path.resolve(candidate);
		} catch {
			// Continue through PATH. The final error explains the complete requirement.
		}
	}
	throw new Error(
		`FontTools WOFF2 conversion requires executable ${JSON.stringify(command)} on PATH. Install a pinned FontTools release with Brotli support, then retry.`
	);
}

function stableExecutableName(command: string): string {
	return path.basename(command).replace(/\.(?:bat|cmd|com|exe)$/i, '');
}

function parseVersion(output: string): string | undefined {
	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => /^\d+(?:\.\d+)+(?:[a-z0-9.+-]*)?$/i.test(line));
}

interface PythonInvocation {
	executable: string;
	args: string[];
}

async function resolvePythonInvocation(fontToolsExecutable: string): Promise<PythonInvocation> {
	if (process.platform === 'win32') {
		const directory = path.dirname(fontToolsExecutable);
		for (const candidate of [
			path.join(directory, 'python.exe'),
			path.join(path.dirname(directory), 'python.exe'),
		]) {
			if (await fs.pathExists(candidate)) return { executable: candidate, args: [] };
		}
		throw new Error(
			`Cannot identify the Python runtime behind ${fontToolsExecutable}. Install FontTools in a standard Python virtual environment so python.exe is adjacent to its Scripts directory.`
		);
	}

	const handle = await open(fontToolsExecutable, 'r');
	try {
		const buffer = Buffer.alloc(4096);
		const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
		const firstLine = buffer.subarray(0, bytesRead).toString('utf8').split(/\r?\n/, 1)[0];
		if (!firstLine.startsWith('#!')) {
			throw new Error(
				`Cannot identify the Python runtime behind ${fontToolsExecutable}: its launcher has no shebang.`
			);
		}
		const parts = firstLine.slice(2).trim().split(/\s+/).filter(Boolean);
		let executable = parts.shift();
		if (!executable) {
			throw new Error(`Cannot identify the Python runtime behind ${fontToolsExecutable}.`);
		}
		if (path.basename(executable) === 'env') {
			if (parts[0] === '-S') parts.shift();
			while (parts[0]?.includes('=')) parts.shift();
			executable = parts.shift();
			if (!executable) {
				throw new Error(
					`Cannot identify the Python runtime behind ${fontToolsExecutable}: its env shebang does not name an interpreter.`
				);
			}
			executable = await resolveExecutable(executable);
		}
		return { executable, args: parts };
	} finally {
		await handle.close();
	}
}

async function inspectPythonRuntime(fontToolsExecutable: string) {
	const invocation = await resolvePythonInvocation(fontToolsExecutable);
	const script =
		'import json,platform; print(json.dumps({"implementation": platform.python_implementation(), "version": platform.python_version()}, sort_keys=True))';
	let stdout: string;
	try {
		({ stdout } = await execFileAsync(invocation.executable, [...invocation.args, '-c', script]));
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Cannot inspect the Python runtime behind ${fontToolsExecutable}. ${detail}`);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout.trim());
	} catch {
		throw new Error(
			`Cannot inspect the Python runtime behind ${fontToolsExecutable}: the interpreter returned invalid metadata.`
		);
	}
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		typeof (parsed as { implementation?: unknown }).implementation !== 'string' ||
		!(parsed as { implementation: string }).implementation.trim() ||
		typeof (parsed as { version?: unknown }).version !== 'string' ||
		!(parsed as { version: string }).version.trim()
	) {
		throw new Error(
			`Cannot inspect the Python runtime behind ${fontToolsExecutable}: required metadata is missing.`
		);
	}
	return parsed as FontToolsConversionProvenance['python'];
}

/** Resolve and identify the exact external converter before transforming bytes. */
export async function createFontToolsConverter(command = 'fonttools'): Promise<FontToolsConverter> {
	const executablePath = await resolveExecutable(command);
	let stdout = '';
	let stderr = '';
	try {
		({ stdout, stderr } = await execFileAsync(executablePath, ['ttx', '--version']));
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Cannot determine the FontTools version from ${executablePath}. Verify that it is a working FontTools console executable. ${detail}`
		);
	}
	const fontToolsVersion = parseVersion(`${stdout}\n${stderr}`);
	if (!fontToolsVersion) {
		throw new Error(
			`Cannot determine the FontTools version from ${executablePath}: \`fonttools ttx --version\` did not return an exact version.`
		);
	}
	const provenance: FontToolsConversionProvenance = {
		executable: stableExecutableName(command),
		fontToolsVersion,
		python: await inspectPythonRuntime(executablePath),
	};

	return {
		provenance,
		async convert(source, destination) {
			try {
				await execFileAsync(executablePath, ['ttLib.woff2', 'compress', source, '-o', destination]);
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				throw new Error(
					`FontTools ${fontToolsVersion} WOFF2 conversion failed under ${provenance.python.implementation} ${provenance.python.version}. Verify Brotli support and the source font, then retry. ${detail}`
				);
			}
		},
		async decompress(source, destination) {
			try {
				await execFileAsync(executablePath, [
					'ttLib.woff2',
					'decompress',
					source,
					'-o',
					destination,
				]);
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				throw new Error(
					`FontTools ${fontToolsVersion} WOFF2 decompression failed under ${provenance.python.implementation} ${provenance.python.version}. Verify Brotli support and the source font, then retry. ${detail}`
				);
			}
		},
	};
}
