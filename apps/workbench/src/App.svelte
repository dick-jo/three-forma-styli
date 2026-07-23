<script lang="ts">
	import type {
		ColorReviewCase,
		MotionReviewCase,
		FoundationReviewCase,
		ReviewControl,
		ReviewLab,
		ShadowReviewCase,
		TfsWorkbenchContract,
		TypographyReviewCase,
		WorkbenchDraftOperation,
	} from '@three-forma-styli/core';
	import { untrack } from 'svelte';
	import { agentHandoff, downloadJson, patchFromDraft, type DraftValues } from './lib/draft';
	import CaseMatrix from './lib/CaseMatrix.svelte';
	import {
		canvasVariables,
		colorStyle,
		controlValue,
		shadowStyle,
		typographyStyle,
	} from './lib/review';

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
	let motionRun = $state(0);
	let lineDiagnostics = $state(false);
	let lightSurface = $state(false);
	let wcagSpacing = $state(false);
	let forceFallback = $state(false);
	let typeSample = $state<HTMLElement | undefined>();
	let wrapSample = $state<HTMLElement | undefined>();
	let metricProbe = $state<HTMLElement | undefined>();
	let baselineProbe = $state<HTMLElement | undefined>();
	let capProbe = $state<HTMLElement | undefined>();
	let exProbe = $state<HTMLElement | undefined>();
	let metricGuides = $state({ lineBottom: 0, baseline: 0, cap: 0, ex: 0 });
	let fallbackEvidence = $state('');
	let fallbackMeasurementRun = 0;

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
	let visibleCases = $derived(
		cases.filter((reviewCase) => {
			if (
				activeLab?.kind === 'color' &&
				reviewCase.kind === 'color' &&
				reviewCase.mode !== colorMode
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
		activeCase?.id;
		draft;
		sizeMode;
		colorMode;
		lineDiagnostics;
		forceFallback;
		wcagSpacing;
		if (activeCase?.kind !== 'typography') return;
		const reviewCase = activeCase as TypographyReviewCase;
		const frame = requestAnimationFrame(() => {
			refreshMetricGuides();
			void refreshFallbackEvidence(reviewCase);
		});
		return () => cancelAnimationFrame(frame);
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
		motionRun = 0;
	}

	function selectCase(id: string): void {
		activeCaseId = id;
		viewMode = 'case';
		const selected = cases.find((reviewCase) => reviewCase.id === id);
		if (selected?.kind === 'color') colorMode = selected.mode;
		motionRun = 0;
	}

	function selectCaseFromLab(lab: ReviewLab, id: string): void {
		if (lab.kind === 'overview') return;
		activeLabId = lab.id;
		activeCaseId = id;
		caseQuery = '';
		viewMode = 'case';
		const selected = lab.cases.find((reviewCase) => reviewCase.id === id);
		if (selected?.kind === 'color') colorMode = selected.mode;
		motionRun = 0;
	}

	function visibleLabCases(lab: ReviewLab) {
		if (lab.kind === 'overview') return [];
		if (lab.kind === 'color')
			return lab.cases.filter((reviewCase) => reviewCase.mode === colorMode);
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

	function refreshMetricGuides(): void {
		if (!metricProbe || !baselineProbe || !capProbe || !exProbe) return;
		const probe = metricProbe.getBoundingClientRect();
		const baseline = baselineProbe.getBoundingClientRect().top - probe.top;
		metricGuides = {
			lineBottom: probe.height,
			baseline,
			cap: baseline - capProbe.getBoundingClientRect().height,
			ex: baseline - exProbe.getBoundingClientRect().height,
		};
	}

	function renderedLineCount(element: HTMLElement): number {
		const range = document.createRange();
		range.selectNodeContents(element);
		const tops = [...range.getClientRects()]
			.filter((rect) => rect.width > 0 && rect.height > 0)
			.map((rect) => Math.round(rect.top * 10) / 10);
		return new Set(tops).size;
	}

	function measureTypography(
		reviewCase: TypographyReviewCase,
		forceAdjustedFallback: boolean
	): { width: number; lines: number } {
		if (!typeSample || !wrapSample) return { width: 0, lines: 0 };
		const style = typographyStyle(reviewCase, draft, {
			forceFallback: forceAdjustedFallback,
			wcagSpacing,
		});
		const inline = document.createElement('span');
		inline.textContent = typeSample.textContent;
		inline.style.cssText = `${style};position:fixed;left:-100000px;top:0;visibility:hidden;display:inline-block;width:max-content;max-width:none;white-space:pre`;
		const wrap = document.createElement('div');
		wrap.textContent = wrapSample.textContent;
		wrap.style.cssText = `${style};position:fixed;left:-100000px;top:0;visibility:hidden;width:${wrapSample.getBoundingClientRect().width}px`;
		document.body.append(inline, wrap);
		const result = { width: inline.getBoundingClientRect().width, lines: renderedLineCount(wrap) };
		inline.remove();
		wrap.remove();
		return result;
	}

	async function refreshFallbackEvidence(reviewCase: TypographyReviewCase): Promise<void> {
		const run = ++fallbackMeasurementRun;
		if (!reviewCase.font.adjustedFallback) {
			fallbackEvidence = '';
			return;
		}
		await document.fonts.ready;
		if (run !== fallbackMeasurementRun) return;
		const primary = measureTypography(reviewCase, false);
		const adjusted = measureTypography(reviewCase, true);
		if (run !== fallbackMeasurementRun || primary.width === 0) return;
		const widthDelta = adjusted.width - primary.width;
		const percent = (widthDelta / primary.width) * 100;
		const signed = (value: number, digits: number) =>
			`${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
		fallbackEvidence = `inline width Δ ${signed(widthDelta, 2)}px (${signed(percent, 2)}%) · line count Δ ${adjusted.lines - primary.lines >= 0 ? '+' : ''}${adjusted.lines - primary.lines} (${primary.lines}→${adjusted.lines})`;
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
			<button
				onclick={() => downloadJson('tfs.review.patch.json', patch)}
				disabled={patch.operations.length === 0}
			>
				export
			</button>
			<button onclick={copyHandoff} disabled={patch.operations.length === 0}
				>copy agent handoff</button
			>
			<span class="sr-only" aria-live="polite">{handoffStatus}</span>
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
				<div class="color-stage">
					<div
						class="color-hero"
						style={`--review-color:${colorStyle(activeCase as ColorReviewCase, draft)}`}
					>
						<div class="color-chip">
							<strong>{activeCase.color}</strong>
							<span>{activeCase.mode}</span>
							<code>{colorStyle(activeCase as ColorReviewCase, draft)}</code>
						</div>
					</div>
					<div class="alpha-ramp">
						{#each activeCase.alphaVariants as alpha}
							<article>
								<div
									class="alpha-chip"
									style={`--review-color:${colorStyle(activeCase as ColorReviewCase, draft, alpha.alpha)}`}
								></div>
								<strong>{alpha.label}</strong>
								<small>{Math.round(alpha.alpha * 100)}%</small>
								<code>--{alpha.token}</code>
							</article>
						{/each}
					</div>
				</div>
			{:else if activeCase?.kind === 'typography'}
				<div class="typography-stage" class:light-surface={lightSurface}>
					<div class="type-tools">
						<label><input type="checkbox" bind:checked={lineDiagnostics} /> metrics</label>
						<label><input type="checkbox" bind:checked={lightSurface} /> light surface</label>
						<label><input type="checkbox" bind:checked={wcagSpacing} /> WCAG spacing stress</label>
						{#if activeCase.font.adjustedFallback}
							<label>
								<input type="checkbox" bind:checked={forceFallback} /> adjusted fallback
							</label>
							<output>{fallbackEvidence || 'measuring primary → adjusted fallback…'}</output>
						{/if}
					</div>
					<div class="type-stage-body">
						<p class="eyebrow">{activeCase.role} · {activeCase.variant ?? 'base'}</p>
						<div class="metric-sample" class:diagnostics={lineDiagnostics}>
							<p
								class="type-short"
								bind:this={typeSample}
								style={typographyStyle(activeCase as TypographyReviewCase, draft, {
									forceFallback,
									wcagSpacing,
								})}
								contenteditable="true"
								aria-label="Editable typography sample"
								spellcheck="false"
								oninput={() => {
									refreshMetricGuides();
									void refreshFallbackEvidence(activeCase as TypographyReviewCase);
								}}
							>
								Sphinx of black quartz, judge my vow.
							</p>
							<span
								class="metric-probe"
								bind:this={metricProbe}
								style={typographyStyle(activeCase as TypographyReviewCase, draft, {
									forceFallback,
									wcagSpacing,
								})}
							>
								Hhx<span class="baseline-probe" bind:this={baselineProbe}></span><i
									class="cap-probe"
									bind:this={capProbe}
								></i><i class="ex-probe" bind:this={exProbe}></i>
							</span>
							{#if lineDiagnostics}
								<div class="metric-overlay" aria-hidden="true">
									<i class="metric-line" style="top:0"><span>line top</span></i>
									<i class="metric-line" style={`top:${metricGuides.lineBottom}px`}
										><span>line bottom</span></i
									>
									<i class="metric-cap" style={`top:${metricGuides.cap}px`}><span>1cap</span></i>
									<i class="metric-ex" style={`top:${metricGuides.ex}px`}><span>1ex</span></i>
									<i class="metric-baseline" style={`top:${metricGuides.baseline}px`}
										><span>baseline</span></i
									>
								</div>
							{/if}
						</div>
						<div class="type-columns">
							<div>
								<span class="type-caption">narrow wrapping</span>
								<p
									bind:this={wrapSample}
									style={typographyStyle(activeCase as TypographyReviewCase, draft, {
										forceFallback,
										wcagSpacing,
									})}
								>
									Typography becomes a system when every choice remains intentional under density,
									wrapping, different surfaces, real content and imperfect loading conditions.
								</p>
							</div>
							<div>
								<span class="type-caption">glyph stress</span>
								<p
									class="glyph-stress"
									style={typographyStyle(activeCase as TypographyReviewCase, draft, {
										forceFallback,
										wcagSpacing,
									})}
								>
									ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · $€£¥ ₿ ± ×
									÷ → ← ↑ ↓ &#123; &#125; [ ] ( )
								</p>
							</div>
						</div>
						<div class="weight-matrix">
							{#each Object.entries(activeCase.styleWeights) as [style, weights]}
								{#each weights as weight}
									<article>
										<code>{style} · {weight.alias} · {weight.value}</code>
										<span
											style={`${typographyStyle(activeCase as TypographyReviewCase, draft, {
												forceFallback,
												wcagSpacing,
											})};font-style:${style};font-weight:${weight.value}`}
										>
											Aa 0123
										</span>
									</article>
								{/each}
							{/each}
						</div>
					</div>
				</div>
			{:else if activeCase?.kind === 'shadow'}
				<div class="shadow-stage">
					<div class="shadow-pair">
						<div class="shadow-object" style={shadowStyle(activeCase as ShadowReviewCase, draft)}>
							Aa
						</div>
						<div class="clip-boundary">
							<div class="shadow-object" style={shadowStyle(activeCase as ShadowReviewCase, draft)}>
								Aa
							</div>
						</div>
					</div>
					<pre>{shadowStyle(activeCase as ShadowReviewCase, draft)}</pre>
				</div>
			{:else if activeCase?.kind === 'motion'}
				<div class="motion-stage">
					<div class="motion-meta">
						<article>
							<span>duration</span>
							<strong>{activeCase.duration.milliseconds}ms</strong>
							<code>{activeCase.duration.token ? `--${activeCase.duration.token}` : '0ms'}</code>
						</article>
						<article>
							<span>delay</span>
							<strong>{activeCase.delay.milliseconds}ms</strong>
							<code>{activeCase.delay.token ? `--${activeCase.delay.token}` : '0ms'}</code>
						</article>
						<article>
							<span>easing</span>
							<strong>{activeCase.easing.name}</strong>
							<code>--{activeCase.easing.token}</code>
						</article>
					</div>
					<div class="motion-track">
						{#key motionRun}
							<div
								class:running={motionRun > 0}
								class="motion-object"
								style={`--review-duration:${(activeCase as MotionReviewCase).duration.milliseconds}ms;--review-delay:${(activeCase as MotionReviewCase).delay.milliseconds}ms;--review-easing:${(activeCase as MotionReviewCase).easing.css}`}
							></div>
						{/key}
					</div>
					<button class="motion-play" onclick={() => (motionRun += 1)}>play once</button>
					<code class="motion-tuple">
						{activeCase.duration.milliseconds}ms {activeCase.easing.css}
						{activeCase.delay.milliseconds}ms
					</code>
				</div>
			{:else if activeCase?.kind === 'foundation'}
				<div class="foundation-stage">
					{#each (activeCase as FoundationReviewCase).tokens as token}
						<article class="foundation-item">
							<div
								class="foundation-sample"
								data-family={(activeCase as FoundationReviewCase).family}
								style={`--review-value:var(--${token.name});--review-raw:${token.rawValue ?? 0}`}
							></div>
							<strong>--{token.name}</strong>
							<code>{token.value}</code>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</main>

	<aside class="inspector" aria-label="Case inspector">
		{#if viewMode === 'matrix' && activeLab?.kind !== 'overview'}
			<div class="inspector-title">
				<div>
					<span>matrix overview</span>
					<strong>{activeLab?.label}</strong>
				</div>
			</div>
			<div class="empty-inspector">
				<strong>{visibleCases.length} visible cases</strong>
				<p>
					Compare the full {activeLab?.label.toLowerCase()} system at once. Filter or change modes to
					narrow the matrix, then select any specimen for precise calibration and source paths.
				</p>
			</div>
		{:else if activeCase}
			<div class="inspector-title">
				<div>
					<span>{activeCase.controls.length > 0 ? 'calibration' : 'resolved case'}</span>
					<strong>{activeCase.label}</strong>
				</div>
				{#if activeCase.controls.length > 0}
					<button onclick={resetCase}>reset case</button>
				{/if}
			</div>
			{#if activeCase.controls.length > 0}
				<div class="controls">
					{#each activeCase.controls as control}
						<label class:changed={draft[control.path] !== undefined}>
							<span>{control.label}</span>
							{#if control.kind === 'number'}
								<div class="number-pair">
									<input
										type="range"
										aria-label={`${control.label} slider`}
										min={control.min}
										max={control.max}
										step={control.step}
										value={controlValue(control, draft)}
										oninput={(event) => setControl(control, Number(event.currentTarget.value))}
										ondblclick={() => resetControl(control)}
									/>
									<input
										type="number"
										aria-label={`${control.label} value`}
										min={control.min}
										max={control.max}
										step={control.step}
										value={controlValue(control, draft)}
										oninput={(event) => setControl(control, Number(event.currentTarget.value))}
									/>
									<small>{control.unit}</small>
								</div>
							{:else}
								<select
									aria-label={control.label}
									value={controlValue(control, draft)}
									onchange={(event) => {
										const option = control.options.find(
											(entry) => String(entry.value) === event.currentTarget.value
										);
										if (option) setControl(control, option.value);
									}}
								>
									{#each control.options as option}
										<option
											value={option.value}
											selected={option.value === controlValue(control, draft)}
										>
											{option.label}
										</option>
									{/each}
								</select>
							{/if}
							<code>{control.path}</code>
						</label>
					{/each}
				</div>
			{:else}
				<div class="empty-inspector">
					{#if activeCase.kind === 'motion'}
						<strong>Playback-only review</strong>
						<p>
							This case exposes resolved timing and easing facts. Its authored references remain
							source-controlled until structured time-reference editing is designed.
						</p>
					{:else}
						<strong>Derived scale</strong>
						<p>
							These values are generated from compact authored anchors. Calibrate the source
							schedule rather than patching individual derived tokens.
						</p>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="empty-inspector">
				<strong>Resolved system</strong>
				<p>Select a lab and case to inspect source decisions and create a non-destructive draft.</p>
			</div>
		{/if}
		<div class="draft-footer">
			<button onclick={clearDraft} disabled={patch.operations.length === 0}
				>discard all edits</button
			>
		</div>
	</aside>
</div>
