import type {
	ReviewControl,
	TfsAgentHandoff,
	TfsReviewPatch,
	WorkbenchDraftOperation,
} from '@three-forma-styli/core';

export type DraftValues = Record<string, string | number | boolean | null>;

export interface ImportedReviewPatch {
	patch: TfsReviewPatch;
	draft: DraftValues;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateControlValue(control: ReviewControl, value: unknown): string | number {
	if (control.kind === 'select') {
		if (
			(typeof value !== 'string' && typeof value !== 'number') ||
			!control.options.some((option) => option.value === value)
		) {
			throw new Error(`Patch value for ${control.path} is not an available option`);
		}
		return value;
	}
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Patch value for ${control.path} must be a finite number`);
	}
	if (value < control.min || value > control.max) {
		throw new Error(
			`Patch value for ${control.path} must be between ${control.min} and ${control.max}`
		);
	}
	return value;
}

/** Validate an imported patch against the exact generated review contract. */
export function importReviewPatch(
	value: unknown,
	systemFingerprint: string,
	controls: readonly ReviewControl[],
	caseIds: ReadonlySet<string>
): ImportedReviewPatch {
	if (!isObject(value)) throw new Error('Review patch must be a JSON object');
	if (value.kind !== 'three-forma-styli/review-patch' || value.schemaVersion !== 1) {
		throw new Error('Unsupported review patch kind or schema version');
	}
	if (value.systemFingerprint !== systemFingerprint) {
		throw new Error('Review patch belongs to a different generated design system');
	}
	if (!Array.isArray(value.operations) || !Array.isArray(value.selectedCases)) {
		throw new Error('Review patch operations and selectedCases must be arrays');
	}

	const controlsByPath = new Map(controls.map((control) => [control.path, control]));
	const operations: WorkbenchDraftOperation[] = [];
	const draft: DraftValues = {};
	for (const candidate of value.operations) {
		if (!isObject(candidate) || typeof candidate.path !== 'string') {
			throw new Error('Every review patch operation must contain a path');
		}
		if (candidate.path in draft) {
			throw new Error(`Review patch contains duplicate path ${candidate.path}`);
		}
		const control = controlsByPath.get(candidate.path);
		if (!control) throw new Error(`Review patch references unknown path ${candidate.path}`);
		if (candidate.previous !== control.value) {
			throw new Error(`Review patch baseline is stale at ${candidate.path}`);
		}
		const next = validateControlValue(control, candidate.value);
		draft[candidate.path] = next;
		operations.push({
			path: candidate.path,
			previous: control.value,
			value: next,
		});
	}

	const selectedCases = value.selectedCases.map((candidate) => {
		if (typeof candidate !== 'string' || !caseIds.has(candidate)) {
			throw new Error(`Review patch references unknown selected case ${String(candidate)}`);
		}
		return candidate;
	});

	return {
		patch: {
			kind: 'three-forma-styli/review-patch',
			schemaVersion: 1,
			systemFingerprint,
			operations,
			selectedCases: [...new Set(selectedCases)].sort(),
			...(typeof value.note === 'string' ? { note: value.note } : {}),
		},
		draft,
	};
}

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
