<script lang="ts">
	import type {
		ReviewControl,
		ReviewLab,
		TfsWorkbenchContract,
		WorkbenchDraftOperation,
	} from '@three-forma-styli/core';
	import { untrack } from 'svelte';
	import CaseMatrix from './lib/CaseMatrix.svelte';
	import ColorCase from './lib/ColorCase.svelte';
	import {
		agentHandoff,
		downloadJson,
		importReviewPatch,
		patchFromDraft,
		type DraftValues,
	} from './lib/draft';
	import FoundationCase from './lib/FoundationCase.svelte';
	import Inspector from './lib/Inspector.svelte';
	import MotionCase from './lib/MotionCase.svelte';
	import { canvasVariables } from './lib/review';
	import ShadowCase from './lib/ShadowCase.svelte';
	import TypographyCase from './lib/TypographyCase.svelte';

	interface Props {
		contract: TfsWorkbenchContract;
	}

	type DraftValue = DraftValues[string];
	interface DraftChange {
		path: string;
		previous: DraftValue;
		value: DraftValue;
	}
	interface DraftTransaction {
		changes: DraftChange[];
	}

	function contractControls(value: TfsWorkbenchContract): ReviewControl[] {
		return value.labs.flatMap((lab) =>
			lab.kind === 'color' ||
			lab.kind === 'typography' ||
			lab.kind === 'shadows' ||
			lab.kind === 'motion' ||
			lab.kind === 'foundation'
				? lab.cases.flatMap((reviewCase) => reviewCase.controls)
				: []
		);
	}

	function storedDraft(value: TfsWorkbenchContract): DraftValues {
		const raw = localStorage.getItem(`tfs-workbench:${value.systemFingerprint}`);
		if (!raw) return {};
		try {
			const parsed: unknown = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
			const allowed = new Map(contractControls(value).map((control) => [control.path, control]));
			return Object.fromEntries(
				Object.entries(parsed).filter(([path, draftValue]) => {
					const control = allowed.get(path);
					if (!control) return false;
					return control.kind === 'number'
						? typeof draftValue === 'number' && Number.isFinite(draftValue)
						: typeof draftValue === 'string' || typeof draftValue === 'number';
				})
			);
		} catch {
			return {};
		}
	}

	let { contract }: Props = $props();
	const initialContract = untrack(() => contract);
	const params = new URLSearchParams(location.search);
	const initialCaseId = params.get('case') ?? '';
	const initialView = params.get('view') === 'matrix' ? 'matrix' : 'case';
	let draft = $state<DraftValues>(storedDraft(initialContract));
	let undo = $state<DraftTransaction[]>([]);
	let redo = $state<typeof undo>([]);
	let activeLabId = $state(params.get('lab') ?? 'overview');
	let activeCaseId = $state(initialCaseId);
	let caseQuery = $state('');
	let viewMode = $state<'case' | 'matrix'>(initialView);
	let colorMode = $state(
		params.get('color') ??
			initialContract.globals.modes.find((group) => group.category === 'color')?.default ??
			''
	);
	let sizeMode = $state(
		params.get('size') ??
			initialContract.globals.modes.find((group) => group.category === 'size')?.default ??
			''
	);
	let handoffStatus = $state('');
	let patchInput = $state<HTMLInputElement>();

	let activeLab = $derived(contract.labs.find((lab) => lab.id === activeLabId) ?? contract.labs[0]);
	let cases = $derived(
		activeLab?.kind === 'color' ||
			activeLab?.kind === 'typography' ||
			activeLab?.kind === 'shadows' ||
			activeLab?.kind === 'motion' ||
			activeLab?.kind === 'foundation'
			? activeLab.cases
			: []
	);
	let activeCase = $derived(cases.find((reviewCase) => reviewCase.id === activeCaseId) ?? cases[0]);
	let visibleTypographyMode = $derived(
		activeLab?.kind === 'typography'
			? (activeLab.cases.find((reviewCase) => reviewCase.mode === sizeMode)?.mode ??
					activeLab.cases[0]?.mode)
			: undefined
	);
	let visibleCases = $derived(
		cases.filter((reviewCase) => {
			if (
				activeLab?.kind === 'color' &&
				reviewCase.kind === 'color' &&
				reviewCase.mode !== colorMode
			)
				return false;
			if (
				activeLab?.kind === 'typography' &&
				reviewCase.kind === 'typography' &&
				reviewCase.mode !== visibleTypographyMode
			)
				return false;
			return reviewCase.label.toLowerCase().includes(caseQuery.trim().toLowerCase());
		})
	);
	let baseValues = $derived.by(() => {
		const entries: Array<[string, WorkbenchDraftOperation['previous']]> = [];
		for (const lab of contract.labs) {
			if (
				lab.kind !== 'color' &&
				lab.kind !== 'typography' &&
				lab.kind !== 'shadows' &&
				lab.kind !== 'motion' &&
				lab.kind !== 'foundation'
			)
				continue;
			for (const reviewCase of lab.cases) {
				for (const control of reviewCase.controls) entries.push([control.path, control.value]);
			}
		}
		return Object.fromEntries(entries);
	});
	let patch = $derived(
		patchFromDraft(
			contract.systemFingerprint,
			baseValues,
			draft,
			contract.labs.flatMap((lab) =>
				lab.kind === 'overview'
					? []
					: lab.cases
							.filter((reviewCase) =>
								reviewCase.controls.some((control) => draft[control.path] !== undefined)
							)
							.map((reviewCase) => reviewCase.id)
			)
		)
	);
	let modeGroups = $derived(contract.globals.modes);
	let colorGroup = $derived(modeGroups.find((entry) => entry.category === 'color'));
	let sizeGroup = $derived(modeGroups.find((entry) => entry.category === 'size'));
	let canvasStyle = $derived(canvasVariables(modeGroups, colorMode, sizeMode));

	$effect(() => {
		localStorage.setItem(`tfs-workbench:${contract.systemFingerprint}`, JSON.stringify(draft));
	});

	$effect(() => {
		const next = new URL(location.href);
		next.searchParams.set('lab', activeLabId);
		if (activeCase?.id) next.searchParams.set('case', activeCase.id);
		else next.searchParams.delete('case');
		if (colorMode) next.searchParams.set('color', colorMode);
		if (sizeMode) next.searchParams.set('size', sizeMode);
		next.searchParams.set('view', viewMode);
		history.replaceState(null, '', next);
	});

	$effect(() => {
		if (activeLab?.kind !== 'color' || activeCase?.kind !== 'color') return;
		if (activeCase.mode === colorMode) return;
		const replacement =
			activeLab.cases.find(
				(reviewCase) => reviewCase.mode === colorMode && reviewCase.color === activeCase.color
			) ?? activeLab.cases.find((reviewCase) => reviewCase.mode === colorMode);
		if (replacement) activeCaseId = replacement.id;
	});

	$effect(() => {
		if (activeLab?.kind !== 'typography' || activeCase?.kind !== 'typography') return;
		if (activeCase.mode === visibleTypographyMode) return;
		const replacement =
			activeLab.cases.find(
				(reviewCase) =>
					reviewCase.mode === visibleTypographyMode &&
					reviewCase.role === activeCase.role &&
					reviewCase.variant === activeCase.variant
			) ?? activeLab.cases.find((reviewCase) => reviewCase.mode === visibleTypographyMode);
		if (replacement) activeCaseId = replacement.id;
	});

	function selectLab(lab: ReviewLab): void {
		activeLabId = lab.id;
		caseQuery = '';
		viewMode = lab.kind === 'overview' ? 'case' : 'matrix';
		activeCaseId =
			lab.kind === 'color' ||
			lab.kind === 'typography' ||
			lab.kind === 'shadows' ||
			lab.kind === 'motion' ||
			lab.kind === 'foundation'
				? (lab.cases[0]?.id ?? '')
				: '';
		if (lab.kind === 'color' && lab.cases[0]) colorMode = lab.cases[0].mode;
	}

	function selectCase(id: string): void {
		activeCaseId = id;
		viewMode = 'case';
		const selected = cases.find((reviewCase) => reviewCase.id === id);
		if (selected?.kind === 'color') colorMode = selected.mode;
		if (selected?.kind === 'typography') sizeMode = selected.mode;
	}

	function selectCaseFromLab(lab: ReviewLab, id: string): void {
		if (lab.kind === 'overview') return;
		activeLabId = lab.id;
		activeCaseId = id;
		caseQuery = '';
		viewMode = 'case';
		const selected = lab.cases.find((reviewCase) => reviewCase.id === id);
		if (selected?.kind === 'color') colorMode = selected.mode;
		if (selected?.kind === 'typography') sizeMode = selected.mode;
	}

	function visibleLabCases(lab: ReviewLab) {
		if (lab.kind === 'overview') return [];
		if (lab.kind === 'color')
			return lab.cases.filter((reviewCase) => reviewCase.mode === colorMode);
		if (lab.kind === 'typography') {
			const mode =
				lab.cases.find((reviewCase) => reviewCase.mode === sizeMode)?.mode ?? lab.cases[0]?.mode;
			return lab.cases.filter((reviewCase) => reviewCase.mode === mode);
		}
		return lab.cases;
	}

	function readableIdentifier(value: string): string {
		return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
	}

	function setControl(control: ReviewControl, value: string | number): void {
		const previous = draft[control.path] ?? control.value;
		if (previous === value) return;
		undo = [...undo, { changes: [{ path: control.path, previous, value }] }];
		redo = [];
		draft = { ...draft, [control.path]: value };
	}

	function applyDraftValue(path: string, value: DraftValue): void {
		const next = { ...draft };
		if (value === baseValues[path]) delete next[path];
		else next[path] = value;
		draft = next;
	}

	function applyTransaction(transaction: DraftTransaction, direction: 'undo' | 'redo'): void {
		const next = { ...draft };
		for (const change of transaction.changes) {
			const value = direction === 'undo' ? change.previous : change.value;
			if (value === baseValues[change.path]) delete next[change.path];
			else next[change.path] = value;
		}
		draft = next;
	}

	function undoDraft(): void {
		const transaction = undo.at(-1);
		if (!transaction) return;
		undo = undo.slice(0, -1);
		redo = [...redo, transaction];
		applyTransaction(transaction, 'undo');
	}

	function redoDraft(): void {
		const transaction = redo.at(-1);
		if (!transaction) return;
		redo = redo.slice(0, -1);
		undo = [...undo, transaction];
		applyTransaction(transaction, 'redo');
	}

	function resetControl(control: ReviewControl): void {
		const previous = draft[control.path];
		if (previous === undefined) return;
		undo = [...undo, { changes: [{ path: control.path, previous, value: control.value }] }];
		redo = [];
		applyDraftValue(control.path, control.value);
	}

	function resetCase(): void {
		if (!activeCase) return;
		const changes = activeCase.controls
			.filter((control) => draft[control.path] !== undefined)
			.map((control) => ({
				path: control.path,
				previous: draft[control.path]!,
				value: control.value,
			}));
		if (changes.length === 0) return;
		undo = [...undo, { changes }];
		redo = [];
		const next = { ...draft };
		for (const change of changes) delete next[change.path];
		draft = next;
	}

	function clearDraft(): void {
		const changes = Object.entries(draft).map(([path, previous]) => ({
			path,
			previous,
			value: baseValues[path] ?? null,
		}));
		if (changes.length === 0) return;
		undo = [...undo, { changes }];
		redo = [];
		draft = {};
	}

	async function importPatch(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			if (file.size > 1_000_000) throw new Error('Review patch exceeds the 1 MB import limit');
			const imported = importReviewPatch(
				JSON.parse(await file.text()),
				contract.systemFingerprint,
				contractControls(contract),
				new Set(
					contract.labs.flatMap((lab) =>
						lab.kind === 'overview' ? [] : lab.cases.map((item) => item.id)
					)
				)
			);
			const changes = [...new Set([...Object.keys(draft), ...Object.keys(imported.draft)])]
				.map((path) => ({
					path,
					previous: draft[path] ?? baseValues[path] ?? null,
					value: imported.draft[path] ?? baseValues[path] ?? null,
				}))
				.filter((change) => change.previous !== change.value);
			if (changes.length > 0) undo = [...undo, { changes }];
			redo = [];
			draft = imported.draft;
			const selectedCase = imported.patch.selectedCases[0];
			if (selectedCase) {
				const selectedLab = contract.labs.find(
					(lab) => lab.kind !== 'overview' && lab.cases.some((item) => item.id === selectedCase)
				);
				if (selectedLab) selectCaseFromLab(selectedLab, selectedCase);
			}
			const importedCount = imported.patch.operations.length;
			handoffStatus = `Imported ${importedCount} reviewed edit${importedCount === 1 ? '' : 's'}`;
		} catch (error) {
			handoffStatus = error instanceof Error ? error.message : 'Unable to import review patch';
		}
	}

	async function copyHandoff(): Promise<void> {
		const handoff = agentHandoff(
			patch,
			contract.agent.verification.generate,
			contract.agent.verification.check
		);
		const prompt = `${handoff.instructions}\n\n\`\`\`json\n${JSON.stringify(handoff, null, 2)}\n\`\`\``;
		try {
			await navigator.clipboard.writeText(prompt);
			handoffStatus = 'Agent handoff copied';
		} catch {
			handoffStatus = 'Clipboard unavailable; export the patch instead';
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (!(event.metaKey || event.ctrlKey)) return;
		if (event.key.toLowerCase() === 'z' && event.shiftKey) {
			event.preventDefault();
			redoDraft();
		} else if (event.key.toLowerCase() === 'z') {
			event.preventDefault();
			undoDraft();
		}
	}}
/>

<div class="workbench" data-testid="workbench">
	<header class="topbar">
		<div class="identity">
			<span class="mark">TFS</span>
			<div>
				<strong>{contract.title}</strong>
				<small>{contract.systemFingerprint.slice(0, 10)}</small>
			</div>
		</div>
		<div class="globals">
			{#if colorGroup}
				<label>
					<span>color</span>
					<select bind:value={colorMode} data-testid="color-mode" aria-label="color mode">
						{#each colorGroup.modes as mode}
							<option value={mode.name}>{mode.name}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if sizeGroup}
				<label>
					<span>size</span>
					<select bind:value={sizeMode} data-testid="size-mode" aria-label="size mode">
						{#each sizeGroup.modes as mode}
							<option value={mode.name}>{mode.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
		<div class="actions">
			<button onclick={undoDraft} disabled={undo.length === 0} aria-label="Undo draft">↶</button>
			<button onclick={redoDraft} disabled={redo.length === 0} aria-label="Redo draft">↷</button>
			<span class:dirty={patch.operations.length > 0}>{patch.operations.length} edits</span>
			<input
				bind:this={patchInput}
				class="patch-input"
				type="file"
				accept="application/json,.json"
				aria-label="Import review patch"
				onchange={importPatch}
				data-testid="patch-input"
			/>
			<button onclick={() => patchInput?.click()}>import</button>
			<button
				onclick={() => downloadJson('tfs.review.patch.json', patch)}
				disabled={patch.operations.length === 0}
			>
				export
			</button>
			<button onclick={copyHandoff} disabled={patch.operations.length === 0}
				>copy agent handoff</button
			>
			{#if handoffStatus}
				<span class="action-status" aria-live="polite">{handoffStatus}</span>
			{/if}
		</div>
	</header>

	<aside class="navigation" aria-label="Workbench labs">
		<nav>
			{#each contract.labs as lab}
				<button class:active={lab.id === activeLabId} onclick={() => selectLab(lab)}>
					<span>{lab.label}</span>
					{#if lab.kind === 'color' || lab.kind === 'typography' || lab.kind === 'shadows' || lab.kind === 'motion' || lab.kind === 'foundation'}
						<small>{lab.cases.length}</small>
					{/if}
				</button>
			{/each}
		</nav>
		{#if cases.length > 0}
			<div class="case-list">
				{#if cases.length > 10}
					<label class="case-filter">
						<span class="sr-only">Filter {activeLab?.label} cases</span>
						<input
							type="search"
							placeholder="filter cases"
							aria-label={`Filter ${activeLab?.label} cases`}
							bind:value={caseQuery}
						/>
					</label>
				{/if}
				{#each visibleCases as reviewCase}
					<button
						class:active={viewMode === 'case' && reviewCase.id === activeCase?.id}
						onclick={() => selectCase(reviewCase.id)}
						title={reviewCase.label}
					>
						{reviewCase.label}
					</button>
				{/each}
				{#if visibleCases.length === 0}
					<p class="no-cases">No matching cases</p>
				{/if}
			</div>
		{/if}
	</aside>

	<main class="canvas-shell">
		<div class="canvas-header">
			<div>
				<span>{activeLab?.label}</span>
				<strong>
					{viewMode === 'matrix' && activeLab?.kind !== 'overview'
						? `${visibleCases.length} cases`
						: (activeCase?.label ?? 'system overview')}
				</strong>
			</div>
			{#if activeLab?.kind !== 'overview'}
				<div class="view-switch" aria-label="Canvas view">
					<button class:active={viewMode === 'matrix'} onclick={() => (viewMode = 'matrix')}>
						matrix
					</button>
					<button class:active={viewMode === 'case'} onclick={() => (viewMode = 'case')}>
						case
					</button>
				</div>
			{/if}
			{#if activeCase && viewMode === 'case'}
				<code>{activeCase.sourcePath}</code>
			{/if}
		</div>

		<section
			class="canvas"
			class:matrix-view={viewMode === 'matrix' && activeLab?.kind !== 'overview'}
			class:overview-view={activeLab?.kind === 'overview'}
			style={canvasStyle}
			data-testid="review-canvas"
		>
			{#if viewMode === 'matrix' && activeLab?.kind !== 'overview'}
				<CaseMatrix cases={visibleCases} {draft} onselect={selectCase} />
			{:else if activeLab?.kind === 'overview'}
				<div class="system-overview">
					<div class="overview-grid">
						{#each Object.entries(activeLab.summary) as [label, value]}
							<article><span>{readableIdentifier(label)}</span><strong>{value}</strong></article>
						{/each}
					</div>
					{#if contract.diagnostics.length > 0}
						<section class="overview-diagnostics" aria-label="Build diagnostics">
							<header>
								<div>
									<span>build evidence</span>
									<strong>diagnostics</strong>
								</div>
								<small>{contract.diagnostics.length}</small>
							</header>
							<ul>
								{#each contract.diagnostics as diagnostic}
									<li data-severity={diagnostic.severity}>
										<span>{diagnostic.severity}</span>
										<div>
											<strong>{diagnostic.message}</strong>
											{#if diagnostic.path}<code>{diagnostic.path}</code>{/if}
										</div>
									</li>
								{/each}
							</ul>
						</section>
					{/if}
					{#each contract.labs.filter((lab) => lab.kind !== 'overview') as lab}
						<section class="overview-section">
							<header>
								<div>
									<span>system domain</span>
									<strong>{lab.label}</strong>
								</div>
								<button onclick={() => selectLab(lab)}>
									inspect all {visibleLabCases(lab).length}
								</button>
							</header>
							<CaseMatrix
								cases={visibleLabCases(lab)}
								{draft}
								compact
								onselect={(id) => selectCaseFromLab(lab, id)}
							/>
						</section>
					{/each}
				</div>
			{:else if activeCase?.kind === 'color'}
				<ColorCase reviewCase={activeCase} {draft} />
			{:else if activeCase?.kind === 'typography'}
				<TypographyCase reviewCase={activeCase} {draft} />
			{:else if activeCase?.kind === 'shadow'}
				<ShadowCase reviewCase={activeCase} {draft} />
			{:else if activeCase?.kind === 'motion'}
				{#key activeCase.id}
					<MotionCase reviewCase={activeCase} />
				{/key}
			{:else if activeCase?.kind === 'foundation'}
				<FoundationCase reviewCase={activeCase} />
			{/if}
		</section>
	</main>

	<Inspector
		{activeCase}
		matrix={viewMode === 'matrix' && activeLab?.kind !== 'overview'}
		labLabel={activeLab?.label}
		visibleCaseCount={visibleCases.length}
		{draft}
		editCount={patch.operations.length}
		{setControl}
		{resetControl}
		{resetCase}
		{clearDraft}
	/>
</div>
