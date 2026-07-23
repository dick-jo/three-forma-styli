import path from 'node:path';
import fs from 'fs-extra';
import type { TfsProject } from './project.js';
import { inspectFontFiles } from './fonts/inspect.js';

export interface ProjectPlanArtifact {
	path: string;
	kind: 'runtime' | 'review' | 'design' | 'asset' | 'evidence';
	dependencies: string[];
}

export interface ProjectPlanFontSource {
	font: string;
	source: string;
	output: string;
	strategy: 'copy' | 'woff2';
	exists: boolean;
}

export interface ProjectBuildPlan {
	schemaVersion: 1;
	project: { schemaVersion: 1; config: string };
	output: {
		layout: 'flat' | 'workspace-package';
		directory: string;
		ownership: 'atomic-directory';
	};
	artifacts: ProjectPlanArtifact[];
	fonts: {
		sources: ProjectPlanFontSource[];
		licenses: Array<{ font: string; source: string; exists: boolean }>;
		discoveredAtBuild: string[];
	};
	prerequisites: {
		externalTools: Array<{
			id: 'fonttools';
			reason: string;
			requiredBy: string[];
		}>;
	};
	hostPackage?: {
		manifest: string;
		generatedFromHost: string;
		requiredExports: Array<{
			subpath: string;
			target: string | Readonly<Record<string, string>>;
		}>;
	};
}

export function projectLayout(project: TfsProject): 'flat' | 'workspace-package' {
	const output = project.output as unknown as Record<string, unknown>;
	const layout = output.layout;
	if (layout !== undefined && layout !== 'flat' && layout !== 'workspace-package') {
		throw new Error(`Unknown TFS output layout ${JSON.stringify(layout)}.`);
	}
	const legacyKeys = [
		'fontAssets',
		'css',
		'indexCss',
		'typographyCss',
		'typographyModule',
		'typescript',
		'systemTypescript',
		'specimen',
		'dtcg',
		'figmaVariables',
	];
	const workspaceKeys = ['hostPackage', 'assets', 'targets'];
	if (layout === 'workspace-package') {
		const mixed = legacyKeys.filter((key) => output[key] !== undefined);
		if (mixed.length > 0) {
			throw new Error(`workspace-package output cannot use legacy keys: ${mixed.join(', ')}.`);
		}
		return 'workspace-package';
	}
	const mixed = workspaceKeys.filter((key) => output[key] !== undefined);
	if (mixed.length > 0) {
		throw new Error(`Flat output cannot use workspace-package keys: ${mixed.join(', ')}.`);
	}
	return 'flat';
}

function normalizedFontSource(value: string | { path: string; output?: string }): {
	path: string;
	output?: string;
} {
	return typeof value === 'string' ? { path: value } : value;
}

export async function plannedFontInputs(
	project: TfsProject,
	configDirectory: string
): Promise<Pick<ProjectBuildPlan, 'fonts' | 'prerequisites'>> {
	const sources: ProjectPlanFontSource[] = [];
	const licenses: Array<{ font: string; source: string; exists: boolean }> = [];
	const fontToolsRequiredBy = new Set<string>();
	const typography = project.system.typography;
	const adjustedFallbackFonts = new Set(
		typography && 'roles' in typography && typography.roles
			? Object.values(typography.roles)
					.map((role) => role.font)
					.filter((fontId) => {
						const font = project.fonts?.[fontId];
						return (
							Boolean(font) &&
							(font!.category === 'sans' || font!.category === 'mono') &&
							!font!.fallbacks?.length
						);
					})
			: []
	);
	for (const [font, family] of Object.entries(project.fonts ?? {})) {
		const licensePath = path.resolve(configDirectory, family.license.file);
		licenses.push({ font, source: licensePath, exists: await fs.pathExists(licensePath) });
		for (const value of family.sources) {
			const source = normalizedFontSource(value);
			const sourcePath = path.resolve(configDirectory, source.path);
			const extension = path.extname(source.path).toLowerCase();
			const strategy = family.strategy ?? (['.ttf', '.otf'].includes(extension) ? 'woff2' : 'copy');
			const original = path.basename(source.path);
			const output =
				source.output ??
				(strategy === 'woff2'
					? `${path.basename(original, path.extname(original))}.woff2`
					: original);
			const exists = await fs.pathExists(sourcePath);
			sources.push({
				font,
				source: sourcePath,
				output,
				strategy,
				exists,
			});
			if (strategy === 'woff2') {
				fontToolsRequiredBy.add(`${font}/${output}`);
			} else if (adjustedFallbackFonts.has(font) && extension === '.woff2' && exists) {
				const [inspection] = inspectFontFiles([sourcePath], configDirectory);
				if (inspection?.axes.wght) fontToolsRequiredBy.add(`${font}/${output}`);
			}
		}
	}
	sources.sort((left, right) =>
		`${left.font}/${left.output}`.localeCompare(`${right.font}/${right.output}`)
	);
	licenses.sort((left, right) => left.font.localeCompare(right.font));
	return {
		fonts: {
			sources,
			licenses,
			discoveredAtBuild:
				sources.length > 0
					? [
							'prepared font metadata and byte hashes',
							'adjusted fallback evidence when configured typography produces a fallback',
						]
					: [],
		},
		prerequisites: {
			externalTools:
				fontToolsRequiredBy.size > 0
					? [
							{
								id: 'fonttools',
								reason:
									'Convert configured sources or decompress variable WOFF2 faces for exact adjusted-fallback sampling.',
								requiredBy: [...fontToolsRequiredBy].sort(),
							},
						]
					: [],
		},
	};
}

export function addPlannedArtifact(
	artifacts: ProjectPlanArtifact[],
	artifact: ProjectPlanArtifact
): void {
	if (artifacts.some((existing) => existing.path === artifact.path)) return;
	artifacts.push(artifact);
}

export function appendFontArtifacts(
	artifacts: ProjectPlanArtifact[],
	directory: string,
	fonts: ProjectBuildPlan['fonts']
): void {
	const normalizedDirectory = directory.split(path.sep).join('/');
	for (const source of fonts.sources) {
		addPlannedArtifact(artifacts, {
			path: path.posix.join(normalizedDirectory, source.output),
			kind: 'asset',
			dependencies: [],
		});
	}
	for (const license of fonts.licenses) {
		addPlannedArtifact(artifacts, {
			path: path.posix.join(
				normalizedDirectory,
				'licenses',
				`${license.font}-${path.basename(license.source)}`
			),
			kind: 'evidence',
			dependencies: [],
		});
	}
}
