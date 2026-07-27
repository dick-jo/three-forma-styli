import path from 'node:path';
import type { LegacyTfsProjectOutput, ProjectJsonOutput, ProjectOutputFormat } from './project.js';
import { assertPortableConfiguredPath } from './portable-path.js';

export interface LegacyOutputPlan {
	css?: string;
	indexCss?: string;
	typographyCss?: string;
	typographyModule?: string;
	typescript?: string;
	systemTypescript?: string;
	specimen?: string;
	dtcg?: string;
	figmaVariables?: string;
}

function selectedFile(
	option: boolean | ProjectOutputFormat | undefined,
	fallback: string
): string | undefined {
	if (!option) return undefined;
	return option === true ? fallback : (option.file ?? fallback);
}

export function typographyCssOptions(output: LegacyTfsProjectOutput) {
	const configured =
		output.typographyCss && output.typographyCss !== true ? output.typographyCss : {};
	return {
		classPrefix: configured.classPrefix,
		specificity: configured.specificity ?? 'class',
		fontFaces: configured.fontFaces ?? 'include',
	};
}

export function tokenCssOptions(output: LegacyTfsProjectOutput) {
	const configured = output.css && output.css !== true ? output.css : {};
	return { selectors: configured.selectors };
}

export function assertPortableRelativePath(value: string, label: string): string {
	if (!value || path.isAbsolute(value)) throw new Error(`${label} must be a relative output path.`);
	assertPortableConfiguredPath(value.split(path.sep).join('/'), label);
	const normalized = path.normalize(value);
	if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
		throw new Error(`${label} must stay inside the project output directory.`);
	}
	return normalized;
}

export function fontAssetsOptions(output: LegacyTfsProjectOutput) {
	return {
		directory: assertPortableRelativePath(
			output.fontAssets?.directory ?? 'fonts',
			'output.fontAssets.directory'
		),
		urls: output.fontAssets?.urls ?? ({ mode: 'relative' } as const),
	};
}

export function legacyOutputPlan(output: LegacyTfsProjectOutput): LegacyOutputPlan {
	const typographyCss = selectedFile(output.typographyCss, 'typography.css');
	const typographyModule = selectedFile(output.typographyModule, 'typography.generated.module.css');
	const typescript = selectedFile(output.typescript, 'typography.generated.ts');
	const tokenCss = selectedFile(output.css, 'tokens.css');
	return {
		// Semantic CSS/TS outputs contain var(--*) references, so project builds
		// always close that dependency with the token stylesheet.
		css: tokenCss ?? (typographyCss || typographyModule || typescript ? 'tokens.css' : undefined),
		indexCss: selectedFile(output.indexCss, 'index.css'),
		typographyCss,
		typographyModule,
		typescript,
		systemTypescript: selectedFile(output.systemTypescript, 'system.generated.ts'),
		specimen: selectedFile(output.specimen, 'typography.specimen.html'),
		dtcg: selectedFile(output.dtcg, 'figma/colors.dtcg.json'),
		figmaVariables: selectedFile(output.figmaVariables, 'figma/variables.json'),
	};
}

export function validateLegacyOutputPlan(plan: LegacyOutputPlan): void {
	const claimed = new Map<string, string>();
	for (const [kind, configured] of Object.entries(plan)) {
		if (!configured) continue;
		const relative = assertPortableRelativePath(configured, `output.${kind}.file`);
		const key = relative.toLowerCase();
		const previous = claimed.get(key);
		if (previous)
			throw new Error(`Output collision: ${previous} and ${kind} both use ${relative}.`);
		claimed.set(key, kind);
	}
	if (plan.typographyModule) {
		const declaration = `${plan.typographyModule}.d.ts`.toLowerCase();
		if (claimed.has(declaration)) {
			throw new Error(
				`Output collision: typographyModule declaration conflicts with ${declaration}.`
			);
		}
	}
}

export function jsonOutput(
	option: boolean | ProjectJsonOutput | undefined
): Required<Pick<ProjectJsonOutput, 'colorSpace' | 'collectionName'>> {
	const configured = option && option !== true ? option : {};
	return {
		colorSpace: configured.colorSpace ?? 'srgb',
		collectionName: configured.collectionName ?? 'Color',
	};
}
