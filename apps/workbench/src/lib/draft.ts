import type {
	TfsAgentHandoff,
	TfsReviewPatch,
	WorkbenchDraftOperation,
} from '@three-forma-styli/core';

export type DraftValues = Record<string, string | number | boolean | null>;

export function patchFromDraft(
	systemFingerprint: string,
	baseValues: Readonly<Record<string, WorkbenchDraftOperation['previous']>>,
	draft: DraftValues,
	selectedCases: string[]
): TfsReviewPatch {
	const operations = Object.entries(draft)
		.filter(([path, value]) => baseValues[path] !== value)
		.map(([path, value]) => ({
			path,
			previous: baseValues[path] ?? null,
			value,
		}))
		.sort((left, right) => left.path.localeCompare(right.path));
	return {
		kind: 'three-forma-styli/review-patch',
		schemaVersion: 1,
		systemFingerprint,
		operations,
		selectedCases: [...new Set(selectedCases)].sort(),
	};
}

export function agentHandoff(
	patch: TfsReviewPatch,
	generate = 'tfs build .',
	check = 'tfs check .'
): TfsAgentHandoff {
	return {
		kind: 'three-forma-styli/agent-handoff',
		schemaVersion: 1,
		patch,
		instructions:
			'Apply these reviewed visual decisions to the authored TFS source. Preserve helper-driven architecture, regenerate owned artifacts, run the declared checks, inspect the named review cases, and commit only the coherent source plus generated result.',
		verification: { generate, check },
	};
}

export function downloadJson(name: string, value: unknown): void {
	const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}
