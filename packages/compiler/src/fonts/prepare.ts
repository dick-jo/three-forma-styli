import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'fs-extra';
import { classifyFontStyle, inspectFontFiles, type FontInspection } from './inspect.js';
import { joinUrlPath } from '../font-url.js';
import { assertPortablePathSegment } from '../portable-path.js';

const execFileAsync = promisify(execFile);

export type FontPreparationStrategy = 'copy' | 'woff2';
export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

export interface FontPreparationLicense {
	id: string;
	/** License text shipped alongside the prepared font. */
	file: string;
	/** Explicit project-owner attestation; OS/2 metadata alone is not legal permission. */
	allowWebEmbedding: boolean;
	/** Human-auditable license clause, written consent, or other permission basis. */
	webEmbeddingBasis: string;
	/** Must be explicitly true before TFS will transform font bytes. */
	allowTransformations?: boolean;
	/** Explicit reason for proceeding when OS/2 flags prohibit normal web embedding. */
	embeddingRestrictionAcknowledgement?: string;
}

export interface FontPreparationSource {
	path: string;
	/** Override the derived output filename. */
	output?: string;
}

export interface FontPreparationFamily {
	/** CSS family name. Defaults to the inspected family name. */
	family?: string;
	sources: Array<string | FontPreparationSource>;
	/** Defaults by source: WOFF/WOFF2 copy; TTF/OTF convert to WOFF2. */
	strategy?: FontPreparationStrategy;
	license: FontPreparationLicense;
	display?: FontDisplay;
}

export interface FontsPreparationConfig {
	output: {
		directory: string;
		/** URL prefix used in @font-face src declarations. Defaults to '.'. */
		publicPath?: string;
		cssFile?: string;
		manifestFile?: string;
	};
	fonts: Record<string, FontPreparationFamily>;
}

export interface PreparedFontFace {
	source: {
		file: string;
		format: string;
		sha256: string;
	};
	file: string;
	url: string;
	format: string;
	style: 'normal' | 'italic' | 'oblique';
	/** CSS angle; OpenType italicAngle uses the opposite sign. */
	obliqueAngle?: number;
	weight: number | { min: number; max: number };
	stretch?: number | { min: number; max: number };
	bytes: number;
	sha256: string;
	strategy: FontPreparationStrategy;
	version: string;
	copyright: string;
	names: FontInspection['names'];
	sourceStyle: FontInspection['style'];
	axes: FontInspection['axes'];
	namedInstances: FontInspection['namedInstances'];
	metrics: FontInspection['metrics'];
	coverage: FontInspection['coverage'];
	features: FontInspection['features'];
	embedding: FontInspection['embedding'];
	warnings: string[];
}

export interface PreparedFontFamily {
	family: string;
	display: FontDisplay;
	license: {
		id: string;
		file: string;
		webEmbeddingAllowed: true;
		webEmbeddingBasis: string;
		transformationsAllowed: boolean;
		embeddingRestrictionAcknowledgement?: string;
	};
	faces: PreparedFontFace[];
}

export interface PreparedFontsManifest {
	schemaVersion: 2;
	families: Record<string, PreparedFontFamily>;
}

export interface PrepareFontsResult {
	manifest: PreparedFontsManifest;
	css: string;
	outputDirectory: string;
	manifestPath: string;
	cssPath: string;
}

export interface PrepareFontsOptions {
	/** Internal project-build target. Source paths still resolve from configDirectory. */
	outputDirectory?: string;
}

function numericRange(value: number | { min: number; max: number }) {
	return typeof value === 'number' ? { min: value, max: value } : value;
}

function stretchRange(value: PreparedFontFace['stretch']) {
	return numericRange(value ?? 100);
}

/** Reject browser-ambiguous @font-face descriptors before writing CSS. */
export function assertNonOverlappingPreparedFaces(faces: PreparedFontFace[], label: string): void {
	for (let leftIndex = 0; leftIndex < faces.length; leftIndex++) {
		for (let rightIndex = leftIndex + 1; rightIndex < faces.length; rightIndex++) {
			const left = faces[leftIndex];
			const right = faces[rightIndex];
			if (left.style !== right.style) continue;
			const leftWeight = numericRange(left.weight);
			const rightWeight = numericRange(right.weight);
			const leftStretch = stretchRange(left.stretch);
			const rightStretch = stretchRange(right.stretch);
			const weightsOverlap = leftWeight.min <= rightWeight.max && rightWeight.min <= leftWeight.max;
			const stretchesOverlap =
				leftStretch.min <= rightStretch.max && rightStretch.min <= leftStretch.max;
			if (weightsOverlap && stretchesOverlap) {
				if (left.style === 'oblique' && left.obliqueAngle !== right.obliqueAngle) {
					throw new Error(
						`${label} contains multiple overlapping oblique angles; typography roles do not expose an angle axis yet.`
					);
				}
				throw new Error(
					`${label} contains overlapping ${left.style} faces at indexes ${leftIndex} and ${rightIndex}.`
				);
			}
		}
	}
}

function assertConversionPreservedInspection(
	source: FontInspection,
	prepared: FontInspection,
	id: string
): void {
	const checks: Array<[string, unknown, unknown]> = [
		['style', fontStyle(source), fontStyle(prepared)],
		['italic angle', source.style.italicAngle, prepared.style.italicAngle],
		['weight', fontWeight(source), fontWeight(prepared)],
		['stretch', fontStretch(source), fontStretch(prepared)],
		['axes', source.axes, prepared.axes],
		['features', source.features, prepared.features],
		['coverage', source.coverage, prepared.coverage],
		['metrics', source.metrics, prepared.metrics],
		['embedding flags', source.embedding, prepared.embedding],
	];
	for (const [name, before, after] of checks) {
		if (JSON.stringify(before) !== JSON.stringify(after)) {
			throw new Error(`fonts.${id} WOFF2 conversion changed inspected ${name}.`);
		}
	}
}

function normalizeSource(source: string | FontPreparationSource): FontPreparationSource {
	return typeof source === 'string' ? { path: source } : source;
}

function sourceStrategy(
	family: FontPreparationFamily,
	source: FontPreparationSource
): FontPreparationStrategy {
	if (family.strategy) return family.strategy;
	const extension = path.extname(source.path).toLowerCase();
	if (extension === '.ttf' || extension === '.otf') return 'woff2';
	return 'copy';
}

function outputFormat(extension: string): string {
	switch (extension.toLowerCase()) {
		case '.woff2':
			return 'woff2';
		case '.woff':
			return 'woff';
		case '.ttf':
			return 'truetype';
		case '.otf':
			return 'opentype';
		default:
			throw new Error(`Unsupported prepared font extension "${extension}".`);
	}
}

function fontStyle(inspection: FontInspection): 'normal' | 'italic' | 'oblique' {
	return classifyFontStyle(inspection);
}

function obliqueAngle(inspection: FontInspection): number | undefined {
	if (fontStyle(inspection) !== 'oblique' || inspection.style.italicAngle === 0) return undefined;
	const cssAngle = -inspection.style.italicAngle;
	if (!Number.isFinite(cssAngle) || cssAngle <= -90 || cssAngle >= 90) {
		throw new Error(
			`Font ${inspection.source.path} has an italic angle outside CSS's open -90deg to 90deg range.`
		);
	}
	return cssAngle;
}

function fontWeight(inspection: FontInspection): PreparedFontFace['weight'] {
	const axis = inspection.axes.wght;
	return axis ? { min: axis.min, max: axis.max } : inspection.style.weight;
}

export function assertWebEmbeddingAllowed(
	embedding: FontInspection['embedding'],
	id: string,
	acknowledgement?: string
): void {
	const restrictions = [
		embedding.noEmbedding ? 'no embedding' : undefined,
		embedding.viewOnly ? 'preview/print only' : undefined,
		embedding.bitmapOnly ? 'bitmap embedding only' : undefined,
	].filter(Boolean);
	if (restrictions.length === 0) return;
	if (!acknowledgement?.trim()) {
		throw new Error(
			`fonts.${id} OS/2 metadata is incompatible with normal web embedding (${restrictions.join(', ')}). Provide license.embeddingRestrictionAcknowledgement with the reason only if you have verified the metadata is wrong.`
		);
	}
}

const widthClassPercentages: Record<number, number> = {
	1: 50,
	2: 62.5,
	3: 75,
	4: 87.5,
	5: 100,
	6: 112.5,
	7: 125,
	8: 150,
	9: 200,
};

function fontStretch(inspection: FontInspection): PreparedFontFace['stretch'] {
	const axis = inspection.axes.wdth;
	if (axis) return { min: axis.min, max: axis.max };
	const percentage = widthClassPercentages[inspection.style.width];
	return percentage && percentage !== 100 ? percentage : undefined;
}

export function assertPortableFontOutputName(value: string, label: string): void {
	assertPortablePathSegment(value, label);
}

function formatRange(value: number | { min: number; max: number }): string {
	return typeof value === 'number' ? String(value) : `${value.min} ${value.max}`;
}

function formatStretch(value: PreparedFontFace['stretch']): string | undefined {
	if (value === undefined) return undefined;
	return typeof value === 'number' ? `${value}%` : `${value.min}% ${value.max}%`;
}

export interface RenderFontFaceCssOptions {
	/** Resolve a face URL for the stylesheet being generated. Defaults to the manifest URL. */
	resolveUrl?: (face: PreparedFontFace, familyId: string) => string;
	/** Include the generated-file header. Defaults to true. */
	includeHeader?: boolean;
}

export function renderFontFaceCss(
	manifest: PreparedFontsManifest,
	options: RenderFontFaceCssOptions = {}
): string {
	const blocks: string[] =
		options.includeHeader === false ? [] : ['/* Generated by three-forma-styli. Do not edit. */'];
	for (const [familyId, family] of Object.entries(manifest.families)) {
		for (const face of family.faces) {
			const url = options.resolveUrl?.(face, familyId) ?? face.url;
			const declarations = [
				`  font-family: ${JSON.stringify(family.family)};`,
				`  src: url(${JSON.stringify(url)}) format(${JSON.stringify(face.format)});`,
				`  font-weight: ${formatRange(face.weight)};`,
				`  font-style: ${
					face.style === 'oblique' && face.obliqueAngle !== undefined
						? `oblique ${face.obliqueAngle}deg`
						: face.style
				};`,
			];
			const stretch = formatStretch(face.stretch);
			if (stretch) declarations.push(`  font-stretch: ${stretch};`);
			declarations.push(`  font-display: ${family.display};`);
			blocks.push(`@font-face {\n${declarations.join('\n')}\n}`);
		}
	}
	return `${blocks.join('\n\n')}\n`;
}

async function convertToWoff2(source: string, destination: string): Promise<void> {
	if (!['.ttf', '.otf'].includes(path.extname(source).toLowerCase())) {
		throw new Error('The woff2 strategy accepts TTF or OTF sources only.');
	}
	try {
		await execFileAsync('fonttools', ['ttLib.woff2', 'compress', source, '-o', destination]);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`FontTools WOFF2 conversion failed. Install FontTools with Brotli support, then retry. ${detail}`
		);
	}
}

async function prepareFile(
	source: string,
	destination: string,
	strategy: FontPreparationStrategy
): Promise<void> {
	const temporaryDirectory = await fs.mkdtemp(path.join(path.dirname(destination), '.tfs-font-'));
	const temporaryOutput = path.join(temporaryDirectory, path.basename(destination));
	try {
		if (strategy === 'copy') {
			await fs.copy(source, temporaryOutput);
		} else {
			await convertToWoff2(source, temporaryOutput);
		}
		await fs.move(temporaryOutput, destination, { overwrite: true });
	} finally {
		await fs.remove(temporaryDirectory);
	}
}

async function hashFile(filePath: string): Promise<string> {
	return createHash('sha256')
		.update(await fs.readFile(filePath))
		.digest('hex');
}

async function listFiles(directory: string, root = directory): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) return listFiles(absolute, root);
			if (!entry.isFile()) throw new Error(`Prepared output must be a regular file: ${absolute}`);
			return [path.relative(root, absolute)];
		})
	);
	return files.flat().sort();
}

/** @internal Exported for staged-install rollback tests. */
export async function commitPreparedFiles(
	staging: string,
	destination: string,
	remove: string[] = []
): Promise<void> {
	const backup = await fs.mkdtemp(path.join(path.dirname(destination), '.tfs-fonts-backup-'));
	const installed: string[] = [];
	const backedUp: Array<{ destination: string; backup: string }> = [];
	try {
		const stagedFiles = await listFiles(staging);
		const stagedSet = new Set(stagedFiles);
		for (const relative of remove.filter((file) => !stagedSet.has(file))) {
			const target = path.join(destination, relative);
			if (!(await fs.pathExists(target))) continue;
			const backupTarget = path.join(backup, relative);
			await fs.ensureDir(path.dirname(backupTarget));
			await fs.move(target, backupTarget);
			backedUp.push({ destination: target, backup: backupTarget });
		}
		for (const relative of stagedFiles) {
			const source = path.join(staging, relative);
			const target = path.join(destination, relative);
			await fs.ensureDir(path.dirname(target));
			if (await fs.pathExists(target)) {
				const backupTarget = path.join(backup, relative);
				await fs.ensureDir(path.dirname(backupTarget));
				await fs.move(target, backupTarget);
				backedUp.push({ destination: target, backup: backupTarget });
			}
			await fs.move(source, target);
			installed.push(target);
		}
	} catch (error) {
		for (const target of installed.reverse()) await fs.remove(target);
		for (const item of backedUp.reverse()) {
			await fs.ensureDir(path.dirname(item.destination));
			await fs.move(item.backup, item.destination, { overwrite: true });
		}
		throw error;
	} finally {
		await fs.remove(backup);
	}
}

function assertManagedRelativePath(value: string, outputDirectory: string): string {
	if (!value || path.isAbsolute(value)) {
		throw new Error(`Previous font manifest contains unsafe managed path "${value}".`);
	}
	const resolved = path.resolve(outputDirectory, value);
	const relative = path.relative(outputDirectory, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Previous font manifest contains unsafe managed path "${value}".`);
	}
	return relative;
}

async function readPreviousManagedFiles(
	manifestPath: string,
	outputDirectory: string,
	cssFilename: string,
	manifestFilename: string
): Promise<string[]> {
	if (!(await fs.pathExists(manifestPath))) return [];
	let previous: unknown;
	try {
		previous = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Cannot safely reconcile the previous font manifest: ${detail}`);
	}
	if (
		!previous ||
		typeof previous !== 'object' ||
		(previous as { schemaVersion?: unknown }).schemaVersion !== 2 ||
		!('families' in previous)
	) {
		throw new Error('Cannot safely reconcile the previous font manifest: families is missing.');
	}
	const families = (previous as { families: unknown }).families;
	if (!families || typeof families !== 'object') {
		throw new Error('Cannot safely reconcile the previous font manifest: families is invalid.');
	}
	const managed = new Set([cssFilename, manifestFilename]);
	for (const family of Object.values(families)) {
		if (!family || typeof family !== 'object') continue;
		const candidate = family as {
			faces?: Array<{ file?: unknown }>;
			license?: { file?: unknown };
		};
		for (const face of candidate.faces ?? []) {
			if (typeof face.file === 'string') {
				if (path.basename(face.file) !== face.file) {
					throw new Error(
						`Cannot safely reconcile the previous font manifest: invalid face path "${face.file}".`
					);
				}
				managed.add(face.file);
			}
		}
		if (typeof candidate.license?.file === 'string') {
			const licensePath = candidate.license.file;
			if (
				path.dirname(licensePath) !== 'licenses' ||
				path.basename(licensePath) === licensePath ||
				path.basename(licensePath) !== licensePath.slice('licenses/'.length)
			) {
				throw new Error(
					`Cannot safely reconcile the previous font manifest: invalid license path "${licensePath}".`
				);
			}
			managed.add(licensePath);
		}
	}
	return [...managed].map((file) => assertManagedRelativePath(file, outputDirectory));
}

function validateConfig(config: FontsPreparationConfig): void {
	if (!config.output?.directory) throw new Error('fonts.output.directory is required.');
	for (const [name, value] of [
		['cssFile', config.output.cssFile ?? 'fonts.css'],
		['manifestFile', config.output.manifestFile ?? 'fonts.manifest.json'],
	] as const) {
		if (path.basename(value) !== value) {
			throw new Error(`fonts.output.${name} must be a filename without directories.`);
		}
	}
	if (
		(config.output.cssFile ?? 'fonts.css').toLowerCase() ===
		(config.output.manifestFile ?? 'fonts.manifest.json').toLowerCase()
	) {
		throw new Error('fonts.output.cssFile and manifestFile must be different filenames.');
	}
	if (!config.fonts || Object.keys(config.fonts).length === 0) {
		throw new Error('fonts must contain at least one configured family.');
	}
	const configuredFamilies = new Map<string, string>();
	for (const [id, font] of Object.entries(config.fonts)) {
		if (!/^[a-z][a-z0-9-]*$/i.test(id)) {
			throw new Error(`Font id "${id}" must be token- and filename-safe.`);
		}
		if (!font.sources?.length) throw new Error(`fonts.${id}.sources must not be empty.`);
		if (font.family?.trim()) {
			const familyKey = font.family.trim().toLowerCase();
			const previous = configuredFamilies.get(familyKey);
			if (previous) {
				throw new Error(
					`fonts.${id} and fonts.${previous} use the same CSS family "${font.family}"; configure cooperating faces under one font ID.`
				);
			}
			configuredFamilies.set(familyKey, id);
		}
		if (font.strategy !== undefined && !['copy', 'woff2'].includes(font.strategy)) {
			throw new Error(`fonts.${id}.strategy must be "copy" or "woff2".`);
		}
		if (!font.license?.id || !font.license.file) {
			throw new Error(`fonts.${id}.license must declare both id and file.`);
		}
		if (font.license.allowWebEmbedding !== true) {
			throw new Error(
				`fonts.${id}.license.allowWebEmbedding must be true only after you verify the actual web-serving rights.`
			);
		}
		if (!font.license.webEmbeddingBasis?.trim()) {
			throw new Error(`fonts.${id}.license.webEmbeddingBasis must record the permission source.`);
		}
		if (
			font.license.embeddingRestrictionAcknowledgement !== undefined &&
			!font.license.embeddingRestrictionAcknowledgement.trim()
		) {
			throw new Error(
				`fonts.${id}.license.embeddingRestrictionAcknowledgement must be a non-empty reason.`
			);
		}
		if (
			font.display !== undefined &&
			!['auto', 'block', 'swap', 'fallback', 'optional'].includes(font.display)
		) {
			throw new Error(`fonts.${id}.display is not a valid font-display value.`);
		}
		const transformsBytes = font.sources
			.map(normalizeSource)
			.some((source) => sourceStrategy(font, source) === 'woff2');
		if (transformsBytes && font.license.allowTransformations !== true) {
			throw new Error(
				`fonts.${id} requests byte transformation but license.allowTransformations is not true.`
			);
		}
	}
}

export async function prepareFonts(
	config: FontsPreparationConfig,
	configDirectory: string,
	options: PrepareFontsOptions = {}
): Promise<PrepareFontsResult> {
	validateConfig(config);
	const outputDirectory = options.outputDirectory
		? path.resolve(options.outputDirectory)
		: path.resolve(configDirectory, config.output.directory);
	const publicPath = config.output.publicPath ?? '.';
	const cssPath = path.join(outputDirectory, config.output.cssFile ?? 'fonts.css');
	const manifestPath = path.join(
		outputDirectory,
		config.output.manifestFile ?? 'fonts.manifest.json'
	);
	const previousManagedFiles = await readPreviousManagedFiles(
		manifestPath,
		outputDirectory,
		path.basename(cssPath),
		path.basename(manifestPath)
	);
	await fs.ensureDir(path.dirname(outputDirectory));
	const stagingDirectory = await fs.mkdtemp(
		path.join(path.dirname(outputDirectory), '.tfs-fonts-stage-')
	);
	const licensesDirectory = path.join(stagingDirectory, 'licenses');
	await fs.ensureDir(licensesDirectory);

	const manifest: PreparedFontsManifest = { schemaVersion: 2, families: {} };
	const claimedOutputs = new Set<string>([
		path.basename(cssPath).toLowerCase(),
		path.basename(manifestPath).toLowerCase(),
	]);
	const claimedCssFamilies = new Map<string, string>();

	try {
		for (const [id, familyConfig] of Object.entries(config.fonts)) {
			const faces: PreparedFontFace[] = [];
			const faceDescriptors = new Set<string>();
			let configuredFamily = familyConfig.family;
			const licenseSource = path.resolve(configDirectory, familyConfig.license.file);
			if (!(await fs.pathExists(licenseSource))) {
				throw new Error(`License file not found for fonts.${id}: ${licenseSource}`);
			}
			const licenseOutputName = `${id}-${path.basename(licenseSource)}`;
			await fs.copy(licenseSource, path.join(licensesDirectory, licenseOutputName), {
				overwrite: true,
			});

			for (const sourceValue of familyConfig.sources) {
				const source = normalizeSource(sourceValue);
				const strategy = sourceStrategy(familyConfig, source);
				const sourcePath = path.resolve(configDirectory, source.path);
				if (!(await fs.pathExists(sourcePath))) {
					throw new Error(`Font source not found for fonts.${id}: ${sourcePath}`);
				}
				const sourceInspections = inspectFontFiles([sourcePath], configDirectory);
				if (sourceInspections.length !== 1) {
					throw new Error(
						`Font collections are inspectable but not yet supported by fonts prepare: ${source.path}`
					);
				}
				const sourceInspection = sourceInspections[0];
				assertWebEmbeddingAllowed(
					sourceInspection.embedding,
					id,
					familyConfig.license.embeddingRestrictionAcknowledgement
				);
				if (sourceInspection.axes.ital || sourceInspection.axes.slnt) {
					throw new Error(
						`fonts.${id} uses a variable ital/slnt axis, which TFS cannot describe safely yet. Prepare separate normal/italic files instead.`
					);
				}
				configuredFamily ??= sourceInspection.names.family;

				const originalName = path.basename(sourcePath);
				const derivedName =
					strategy === 'woff2'
						? `${path.basename(originalName, path.extname(originalName))}.woff2`
						: originalName;
				const outputName = source.output ?? derivedName;
				if (path.basename(outputName) !== outputName) {
					throw new Error(`fonts.${id} output names must be filenames without directories.`);
				}
				assertPortableFontOutputName(outputName, `fonts.${id} output name`);
				if (claimedOutputs.has(outputName.toLowerCase())) {
					throw new Error(`Prepared font output collision: ${outputName}`);
				}
				if (strategy === 'woff2' && path.extname(outputName).toLowerCase() !== '.woff2') {
					throw new Error(`fonts.${id} woff2 outputs must use the .woff2 extension.`);
				}
				if (
					strategy === 'copy' &&
					path.extname(outputName).toLowerCase() !== path.extname(sourcePath).toLowerCase()
				) {
					throw new Error(`fonts.${id} copy outputs must preserve the source extension.`);
				}
				claimedOutputs.add(outputName.toLowerCase());
				const outputPath = path.join(stagingDirectory, outputName);

				await prepareFile(sourcePath, outputPath, strategy);

				const [preparedInspection] = inspectFontFiles([outputPath], outputDirectory);
				if (strategy === 'woff2') {
					assertConversionPreservedInspection(sourceInspection, preparedInspection, id);
				}
				assertWebEmbeddingAllowed(
					preparedInspection.embedding,
					id,
					familyConfig.license.embeddingRestrictionAcknowledgement
				);
				const warnings = [...preparedInspection.warnings];
				if (configuredFamily !== preparedInspection.names.family) {
					warnings.push(
						`Configured CSS family "${configuredFamily}" unifies detected family "${preparedInspection.names.family}".`
					);
				}
				const preparedStyle = fontStyle(preparedInspection);
				const preparedObliqueAngle = obliqueAngle(preparedInspection);
				const preparedWeight = fontWeight(preparedInspection);
				const descriptorWeight =
					typeof preparedWeight === 'number'
						? String(preparedWeight)
						: `${preparedWeight.min}-${preparedWeight.max}`;
				const preparedStretch = fontStretch(preparedInspection);
				const descriptorStretch =
					preparedStretch === undefined
						? '100'
						: typeof preparedStretch === 'number'
							? String(preparedStretch)
							: `${preparedStretch.min}-${preparedStretch.max}`;
				const descriptor = `${preparedStyle}:${preparedObliqueAngle ?? ''}:${descriptorWeight}:${descriptorStretch}`;
				if (faceDescriptors.has(descriptor)) {
					throw new Error(`fonts.${id} contains duplicate face descriptor ${descriptor}.`);
				}
				faceDescriptors.add(descriptor);
				faces.push({
					source: {
						file: path.basename(sourcePath),
						format: sourceInspection.source.format,
						sha256: sourceInspection.source.sha256,
					},
					file: outputName,
					url: joinUrlPath(publicPath, outputName),
					format: outputFormat(path.extname(outputName)),
					style: preparedStyle,
					obliqueAngle: preparedObliqueAngle,
					weight: preparedWeight,
					stretch: preparedStretch,
					bytes: (await fs.stat(outputPath)).size,
					sha256: await hashFile(outputPath),
					strategy,
					version: preparedInspection.metadata.version,
					copyright: preparedInspection.metadata.copyright,
					names: preparedInspection.names,
					sourceStyle: sourceInspection.style,
					axes: preparedInspection.axes,
					namedInstances: preparedInspection.namedInstances,
					metrics: preparedInspection.metrics,
					coverage: preparedInspection.coverage,
					features: preparedInspection.features,
					embedding: preparedInspection.embedding,
					warnings,
				});
			}
			assertNonOverlappingPreparedFaces(faces, `fonts.${id}`);
			const cssFamilyKey = configuredFamily!.trim().toLowerCase();
			const previousFamily = claimedCssFamilies.get(cssFamilyKey);
			if (previousFamily) {
				throw new Error(
					`fonts.${id} and fonts.${previousFamily} use the same CSS family "${configuredFamily}"; configure cooperating faces under one font ID.`
				);
			}
			claimedCssFamilies.set(cssFamilyKey, id);

			manifest.families[id] = {
				family: configuredFamily!,
				display: familyConfig.display ?? 'swap',
				license: {
					id: familyConfig.license.id,
					file: `licenses/${licenseOutputName}`,
					webEmbeddingAllowed: true,
					webEmbeddingBasis: familyConfig.license.webEmbeddingBasis,
					transformationsAllowed: familyConfig.license.allowTransformations === true,
					embeddingRestrictionAcknowledgement:
						familyConfig.license.embeddingRestrictionAcknowledgement,
				},
				faces,
			};
		}

		const css = renderFontFaceCss(manifest);
		await fs.writeFile(path.join(stagingDirectory, path.basename(cssPath)), css);
		await fs.writeFile(
			path.join(stagingDirectory, path.basename(manifestPath)),
			`${JSON.stringify(manifest, null, 2)}\n`
		);
		await commitPreparedFiles(stagingDirectory, outputDirectory, previousManagedFiles);
		return { manifest, css, outputDirectory, manifestPath, cssPath };
	} finally {
		await fs.remove(stagingDirectory);
	}
}
