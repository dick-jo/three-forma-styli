import path from 'node:path';
import type {
	ProjectFontAssetUrlPolicy,
	ProjectJsonOutput,
	WorkspacePackageOutput,
} from '../project.js';
import { assertPortableConfiguredPath } from '../portable-path.js';

export type WorkspaceArtifactKind =
	'runtime-js' | 'runtime-types' | 'runtime-css' | 'review' | 'design' | 'font-asset' | 'evidence';

export interface WorkspaceArtifact {
	path: string;
	kind: WorkspaceArtifactKind;
	target: 'runtime' | 'review' | 'design' | 'assets';
	dependencies: string[];
}

export interface WorkspacePlanContext {
	hasColors: boolean;
	hasTypography: boolean;
	hasFonts: boolean;
}

export interface WorkspacePlan {
	artifacts: WorkspaceArtifact[];
	fontDirectory: string;
	runtimeFontUrls: ProjectFontAssetUrlPolicy;
	css: {
		entry: boolean;
		tokens: boolean;
		tokenSelectors?: import('@three-forma-styli/core').CssTransformerConfig['selectors'];
		typography: boolean;
		typographyClassPrefix?: string;
		typographySpecificity: 'class' | 'zero';
		module: boolean;
		separateFonts: boolean;
	};
	contracts: { system: boolean; typography: boolean; nativeColorModes: boolean };
	review: { specimen: boolean; title?: string; interactive?: boolean };
	design: {
		dtcg?: Required<Pick<ProjectJsonOutput, 'colorSpace' | 'collectionName'>>;
		figmaVariables?: Required<Pick<ProjectJsonOutput, 'colorSpace' | 'collectionName'>>;
	};
	host: {
		manifest: string;
		rootExport: boolean;
		verifySideEffects: boolean;
		verifyPublishedFiles: 'always' | 'if-publishable' | 'never';
	};
}

export interface RequiredPackageExport {
	subpath: string;
	target: string | Readonly<Record<string, string>>;
}

function portablePath(value: string, label: string): string {
	if (!value || path.isAbsolute(value)) throw new Error(`${label} must be a relative path.`);
	assertPortableConfiguredPath(value.split(path.sep).join('/'), label);
	const normalized = path.normalize(value);
	if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
		throw new Error(`${label} must stay inside the generated directory.`);
	}
	return normalized.split(path.sep).join('/');
}

function jsonOptions(
	option: boolean | Omit<ProjectJsonOutput, 'file'> | undefined
): Required<Pick<ProjectJsonOutput, 'colorSpace' | 'collectionName'>> | undefined {
	if (!option) return undefined;
	const configured = option === true ? {} : option;
	return {
		colorSpace: configured.colorSpace ?? 'srgb',
		collectionName: configured.collectionName ?? 'Color',
	};
}

function add(
	artifacts: WorkspaceArtifact[],
	artifact: Omit<WorkspaceArtifact, 'dependencies'> & { dependencies?: string[] }
): void {
	artifacts.push({ ...artifact, dependencies: artifact.dependencies ?? [] });
}

/** Normalize shorthands into a deterministic artifact graph before rendering begins. */
export function planWorkspacePackage(
	output: WorkspacePackageOutput,
	context: WorkspacePlanContext
): WorkspacePlan {
	const rootExport = output.hostPackage?.rootExport ?? true;
	const fontDirectory = portablePath(
		output.assets?.fonts?.directory ?? 'assets/fonts',
		'output.assets.fonts.directory'
	);
	if (fontDirectory === '.') {
		throw new Error('output.assets.fonts.directory must be a dedicated subtree.');
	}
	if (
		['runtime', 'review', 'design'].some(
			(reserved) => fontDirectory === reserved || fontDirectory.startsWith(`${reserved}/`)
		)
	) {
		throw new Error(
			'output.assets.fonts.directory must not overlap the reserved runtime, review, or design targets.'
		);
	}

	const runtimeTarget = output.targets.runtime;
	const runtime = runtimeTarget === true ? { css: true, contracts: true } : runtimeTarget || {};
	const cssTarget = runtime.css;
	const allCss = Boolean(cssTarget);
	const css = cssTarget === true ? {} : cssTarget || undefined;
	const contractsTarget = runtime.contracts;
	const allContracts = Boolean(contractsTarget);
	const contracts = contractsTarget === true ? {} : contractsTarget || undefined;

	const typographyRequested = Boolean(
		css && css.typography !== undefined ? css.typography : allCss && context.hasTypography
	);
	const moduleRequested = Boolean(
		css && css.module !== undefined ? css.module : allCss && context.hasTypography
	);
	if (css && css.typography && !context.hasTypography) {
		throw new Error('runtime.css.typography requires semantic typography roles.');
	}
	if (css && css.module && !context.hasTypography) {
		throw new Error('runtime.css.module requires semantic typography roles.');
	}
	const tokensRequested = Boolean(css && css.tokens !== undefined ? css.tokens : allCss);
	const entryRequested = Boolean(css && css.entry !== undefined ? css.entry : allCss);
	const tokenConfig = css?.tokens && css.tokens !== true ? css.tokens : {};
	const typographyConfig = css?.typography && css.typography !== true ? css.typography : {};
	const runtimeFontUrls = css?.fontUrls ?? ({ mode: 'relative' } as const);
	const separateFonts = context.hasFonts && moduleRequested && !typographyRequested;

	const systemContract = Boolean(
		contracts && contracts.system !== undefined ? contracts.system : allContracts
	);
	const typographyContract = Boolean(
		contracts && contracts.typography !== undefined
			? contracts.typography
			: allContracts && context.hasTypography
	);
	const nativeColorModes = Boolean(
		contracts && contracts.nativeColorModes !== undefined
			? contracts.nativeColorModes
			: allContracts && context.hasColors
	);
	if (contracts && contracts.typography && !context.hasTypography) {
		throw new Error('runtime.contracts.typography requires semantic typography roles.');
	}
	if (contracts && contracts.nativeColorModes && !context.hasColors) {
		throw new Error('runtime.contracts.nativeColorModes requires a color system.');
	}

	const reviewTarget = output.targets.review;
	const review = reviewTarget === true ? { specimen: true } : reviewTarget || {};
	const specimenOption = review.specimen;
	const specimen = Boolean(specimenOption);
	if (specimen && !context.hasTypography) {
		throw new Error('review.specimen requires semantic typography roles.');
	}
	const specimenConfig = specimenOption && specimenOption !== true ? specimenOption : {};

	const designTarget = output.targets.design;
	const design = designTarget === true ? { dtcg: true, figmaVariables: true } : designTarget || {};
	if ((design.dtcg || design.figmaVariables) && !context.hasColors) {
		throw new Error('Design JSON targets require a color system.');
	}
	const dtcg = jsonOptions(design.dtcg);
	const figmaVariables = jsonOptions(design.figmaVariables);

	const artifacts: WorkspaceArtifact[] = [];
	if (tokensRequested)
		add(artifacts, { path: 'runtime/styles/tokens.css', kind: 'runtime-css', target: 'runtime' });
	if (typographyRequested) {
		add(artifacts, {
			path: 'runtime/styles/typography.css',
			kind: 'runtime-css',
			target: 'runtime',
			dependencies: [
				...(tokensRequested ? ['runtime/styles/tokens.css'] : []),
				...(context.hasFonts ? [`${fontDirectory}/*`] : []),
			],
		});
	}
	if (separateFonts) {
		add(artifacts, {
			path: 'runtime/styles/fonts.css',
			kind: 'runtime-css',
			target: 'runtime',
			dependencies: [`${fontDirectory}/*`],
		});
	}
	if (moduleRequested) {
		add(artifacts, {
			path: 'runtime/styles/typography.module.css',
			kind: 'runtime-css',
			target: 'runtime',
			dependencies: tokensRequested ? ['runtime/styles/tokens.css'] : [],
		});
		add(artifacts, {
			path: 'runtime/styles/typography.module.css.d.ts',
			kind: 'runtime-types',
			target: 'runtime',
			dependencies: ['runtime/styles/typography.module.css'],
		});
	}
	if (entryRequested) {
		const dependencies = [
			...(separateFonts ? ['runtime/styles/fonts.css'] : []),
			...(tokensRequested ? ['runtime/styles/tokens.css'] : []),
			...(typographyRequested ? ['runtime/styles/typography.css'] : []),
		];
		if (dependencies.length === 0) {
			throw new Error('runtime.css.entry requires at least one emitted stylesheet.');
		}
		add(artifacts, {
			path: 'runtime/styles/index.css',
			kind: 'runtime-css',
			target: 'runtime',
			dependencies,
		});
	}

	for (const [enabled, name] of [
		[systemContract, 'system'],
		[typographyContract, 'typography'],
		[nativeColorModes, 'native-color-modes'],
	] as const) {
		if (!enabled) continue;
		add(artifacts, { path: `runtime/${name}.js`, kind: 'runtime-js', target: 'runtime' });
		add(artifacts, {
			path: `runtime/${name}.d.ts`,
			kind: 'runtime-types',
			target: 'runtime',
			dependencies: [`runtime/${name}.js`],
		});
	}
	if (rootExport && (systemContract || typographyContract || nativeColorModes)) {
		const modules = [
			...(systemContract ? ['system'] : []),
			...(typographyContract ? ['typography'] : []),
			...(nativeColorModes ? ['native-color-modes'] : []),
		];
		add(artifacts, {
			path: 'runtime/index.js',
			kind: 'runtime-js',
			target: 'runtime',
			dependencies: modules.map((name) => `runtime/${name}.js`),
		});
		add(artifacts, {
			path: 'runtime/index.d.ts',
			kind: 'runtime-types',
			target: 'runtime',
			dependencies: modules.map((name) => `runtime/${name}.d.ts`),
		});
	}
	if (specimen) {
		add(artifacts, {
			path: 'review/typography.html',
			kind: 'review',
			target: 'review',
			dependencies: context.hasFonts ? [`${fontDirectory}/*`] : [],
		});
	}
	if (dtcg) add(artifacts, { path: 'design/tokens.dtcg.json', kind: 'design', target: 'design' });
	if (figmaVariables) {
		add(artifacts, { path: 'design/figma.variables.json', kind: 'design', target: 'design' });
	}
	if (context.hasFonts) {
		add(artifacts, {
			path: `${fontDirectory}/fonts.manifest.json`,
			kind: 'evidence',
			target: 'assets',
		});
		add(artifacts, { path: `${fontDirectory}/fonts.css`, kind: 'evidence', target: 'assets' });
	}
	if (artifacts.length === 0) {
		throw new Error(
			'workspace-package has no artifacts to build; enable a runtime, review, or design target.'
		);
	}

	const claimed = new Map<string, string>();
	for (const artifact of artifacts) {
		const relative = portablePath(artifact.path, 'workspace artifact');
		const key = relative.toLowerCase();
		const previous = claimed.get(key);
		if (previous) throw new Error(`Workspace output collision: ${previous} and ${artifact.path}.`);
		claimed.set(key, artifact.path);
	}
	for (const artifact of artifacts) {
		if (artifact.path === fontDirectory || artifact.path.startsWith(`${fontDirectory}/`)) continue;
		if (
			fontDirectory.startsWith(`${artifact.path}/`) ||
			artifact.path.startsWith(`${fontDirectory}/`)
		) {
			throw new Error(`${artifact.path} collides with the prepared font subtree ${fontDirectory}.`);
		}
	}

	return {
		artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path)),
		fontDirectory,
		runtimeFontUrls,
		css: {
			entry: entryRequested,
			tokens: tokensRequested,
			tokenSelectors: tokenConfig.selectors,
			typography: typographyRequested,
			typographyClassPrefix: typographyConfig.classPrefix,
			typographySpecificity: typographyConfig.specificity ?? 'class',
			module: moduleRequested,
			separateFonts,
		},
		contracts: { system: systemContract, typography: typographyContract, nativeColorModes },
		review: {
			specimen,
			title: specimenConfig.title,
			interactive: specimenConfig.interactive,
		},
		design: { dtcg, figmaVariables },
		host: {
			manifest: output.hostPackage?.manifest ?? './package.json',
			rootExport,
			verifySideEffects: output.hostPackage?.verifySideEffects ?? true,
			verifyPublishedFiles: output.hostPackage?.verifyPublishedFiles ?? 'if-publishable',
		},
	};
}

function packageTarget(generatedFromHost: string, relative: string): string {
	const target = path.posix.join(generatedFromHost, relative);
	return target.startsWith('.') ? target : `./${target}`;
}

/** Exact export targets required from the human-owned host manifest. */
export function requiredPackageExports(
	plan: WorkspacePlan,
	generatedFromHost: string
): RequiredPackageExport[] {
	const required: RequiredPackageExport[] = [];
	const contract = (subpath: string, name: string) =>
		required.push({
			subpath,
			target: {
				types: packageTarget(generatedFromHost, `runtime/${name}.d.ts`),
				import: packageTarget(generatedFromHost, `runtime/${name}.js`),
			},
		});
	if (plan.contracts.system || plan.contracts.typography || plan.contracts.nativeColorModes) {
		if (plan.host.rootExport) contract('.', 'index');
		if (plan.contracts.system) contract('./system', 'system');
		if (plan.contracts.typography) contract('./typography', 'typography');
		if (plan.contracts.nativeColorModes) contract('./native-color-modes', 'native-color-modes');
	}
	if (plan.css.entry) {
		required.push({
			subpath: './styles.css',
			target: packageTarget(generatedFromHost, 'runtime/styles/index.css'),
		});
	}
	if (plan.css.tokens) {
		required.push({
			subpath: './tokens.css',
			target: packageTarget(generatedFromHost, 'runtime/styles/tokens.css'),
		});
	}
	if (plan.css.typography) {
		required.push({
			subpath: './typography.css',
			target: packageTarget(generatedFromHost, 'runtime/styles/typography.css'),
		});
	}
	if (plan.css.module) {
		required.push({
			subpath: './typography.module.css',
			target: {
				types: packageTarget(generatedFromHost, 'runtime/styles/typography.module.css.d.ts'),
				default: packageTarget(generatedFromHost, 'runtime/styles/typography.module.css'),
			},
		});
	}
	if (plan.css.separateFonts) {
		required.push({
			subpath: './fonts.css',
			target: packageTarget(generatedFromHost, 'runtime/styles/fonts.css'),
		});
	}
	required.push({ subpath: './package.json', target: './package.json' });
	return required;
}
