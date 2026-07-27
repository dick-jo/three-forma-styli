<script lang="ts">
	import type { ReviewCase, ReviewControl } from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { controlValue } from './review';

	interface Props {
		activeCase?: ReviewCase;
		matrix: boolean;
		labLabel?: string;
		visibleCaseCount: number;
		draft: DraftValues;
		editCount: number;
		setControl: (control: ReviewControl, value: string | number) => void;
		resetControl: (control: ReviewControl) => void;
		resetCase: () => void;
		clearDraft: () => void;
	}

	let {
		activeCase,
		matrix,
		labLabel,
		visibleCaseCount,
		draft,
		editCount,
		setControl,
		resetControl,
		resetCase,
		clearDraft,
	}: Props = $props();
</script>

<aside class="inspector" aria-label="Case inspector">
	{#if matrix}
		<div class="inspector-title">
			<div>
				<span>matrix overview</span>
				<strong>{labLabel}</strong>
			</div>
		</div>
		<div class="empty-inspector">
			<strong>{visibleCaseCount} visible cases</strong>
			<p>
				Compare the full {labLabel?.toLowerCase()} system at once. Filter or change modes to narrow the
				matrix, then select any specimen for precise calibration and source paths.
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
						These values are generated from compact authored anchors. Calibrate the source schedule
						rather than patching individual derived tokens.
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
		<button onclick={clearDraft} disabled={editCount === 0}>discard all edits</button>
	</div>
</aside>
