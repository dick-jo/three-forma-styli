import type { ProjectFont, TfsProject } from '../project.js';
import type { WorkspacePlanContext } from './plan.js';

/** Derive compiler capabilities once so planning, building and drift checks cannot disagree. */
export function workspacePlanContext<const Fonts extends Record<string, ProjectFont>>(
	project: TfsProject<Fonts>,
	overrides: Partial<WorkspacePlanContext> = {}
): WorkspacePlanContext {
	const typography = project.system.typography;
	return {
		hasColors: Boolean(project.system.colors),
		hasRuntimeColorPolicy: Boolean(
			project.system.colors?.luminance && project.system.colors.runtimeThemes
		),
		hasTypography: Boolean(typography?.roles && Object.keys(typography.roles).length > 0),
		hasShadows: Boolean(project.system.shadows),
		hasFonts: Object.keys(project.fonts ?? {}).length > 0,
		...overrides,
	};
}
