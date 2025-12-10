<script lang="ts">
	import { getContext } from 'svelte';
	import {
		generateCssVariables,
		validateLuminance,
		type DesignSystem,
	} from '@three-forma-styli/core';
	import ClrTokenSection from '$lib/components/ClrTokenSection';
	import ClrConstraintsMeter from '$lib/components/ClrConstraintsMeter/ClrConstraintsMeter.svelte';

	// Get design system and CSS from layout context
	let designSystem = getContext<DesignSystem>('designSystem');
	let getGeneratedCss = getContext<() => string>('generatedCss');
	let generatedCss = $derived(getGeneratedCss());

	// Get default mode color tokens
	let defaultMode = $derived(designSystem.colors.modes[0]);
	let colorTokens = $derived(defaultMode.tokens);

	// Validate luminance constraints (full groups except positive/negative)
	let validation = $derived(
		validateLuminance(
			{
				bg: colorTokens.bg,
				ev: colorTokens.ev,
				primary: colorTokens.primary,
				neutral: colorTokens.neutral,
				ink: colorTokens.ink,
			},
			{
				type: 'dark',
				minDelta: 0.4, // OKLCH uses 0-1 scale (0.4 = 40% contrast)
			}
		)
	);

	// Update color functions
	function updateColor(colorName: keyof typeof colorTokens, l: number, c: number, h: number) {
		designSystem.colors.modes[0].tokens[colorName] = { mode: 'oklch', l, c, h };
	}
</script>

<h1>Three-Forma-Styli Preview</h1>

<ClrConstraintsMeter />

<!-- Color Controls -->
<section class="color-controls">
	<h3>Color System Controls (OKLCH)</h3>

	{#each ['bg', 'ev', 'primary', 'neutral', 'ink'] as colorName}
		{@const color = colorTokens[colorName]}
		<div class="color-control">
			<h4>{colorName}</h4>
			<div class="controls">
				<div class="control-row">
					<label>
						L:
						<input
							type="number"
							min="0"
							max="1"
							step="0.01"
							value={color.l}
							oninput={(e) =>
								updateColor(colorName, Number(e.currentTarget.value), color.c, color.h)}
						/>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={color.l}
							oninput={(e) =>
								updateColor(colorName, Number(e.currentTarget.value), color.c, color.h)}
						/>
					</label>
				</div>
				<div class="control-row">
					<label>
						C:
						<input
							type="number"
							min="0"
							max="0.5"
							step="0.01"
							value={color.c}
							oninput={(e) =>
								updateColor(colorName, color.l, Number(e.currentTarget.value), color.h)}
						/>
						<input
							type="range"
							min="0"
							max="0.5"
							step="0.01"
							value={color.c}
							oninput={(e) =>
								updateColor(colorName, color.l, Number(e.currentTarget.value), color.h)}
						/>
					</label>
				</div>
				<div class="control-row">
					<label>
						H:
						<input
							type="number"
							min="0"
							max="360"
							step="1"
							value={color.h}
							oninput={(e) =>
								updateColor(colorName, color.l, color.c, Number(e.currentTarget.value))}
						/>
						<input
							type="range"
							min="0"
							max="360"
							step="1"
							value={color.h}
							oninput={(e) =>
								updateColor(colorName, color.l, color.c, Number(e.currentTarget.value))}
						/>
					</label>
				</div>
			</div>
		</div>
	{/each}
</section>

<!-- Luminance Validation -->
<section class="validation">
	<h3>Luminance Constraint Validation (Dark Mode)</h3>

	<div class="validation-output">
		<div class="section">
			<h4>Background Group:</h4>
			<pre>  bg:  {colorTokens.bg?.l.toFixed(4)}
  ev:  {colorTokens.ev?.l.toFixed(4)} ← max</pre>
		</div>

		<div class="section">
			<h4>Foreground Group:</h4>
			<pre>  primary: {colorTokens.primary?.l.toFixed(4)}
  neutral: {colorTokens.neutral?.l.toFixed(4)}
  ink:     {colorTokens.ink?.l.toFixed(4)} ← min</pre>
		</div>

		<div class="section">
			<h4>Delta Calculation:</h4>
			<pre>  Actual delta:   min(foreground) - max(background)
                  {validation.foregroundMin.toFixed(4)} - {validation.backgroundMax.toFixed(4)} = {validation.actualDelta.toFixed(4)}
  Required delta: {validation.requiredDelta.toFixed(4)}
  Status: {#if validation.deltaValid}<span class="valid">✓ VALID</span
					> ({validation.actualDelta.toFixed(4)} >= {validation.requiredDelta.toFixed(
						4
					)}){:else}<span class="invalid">✗ INVALID</span> ({validation.actualDelta.toFixed(
						4
					)} &lt; {validation.requiredDelta.toFixed(4)}){/if}</pre>
		</div>

		<div class="section">
			<h4>Boundaries (for dark mode):</h4>
			<pre>  Background colors must be ≤ {validation.backgroundMax.toFixed(4)}
  Foreground colors must be ≥ {validation.foregroundMin.toFixed(4)}
  Gap between them: {validation.actualDelta.toFixed(4)}</pre>
		</div>

		<div class="section">
			<h4>Background Order Check:</h4>
			<pre>  {#if validation.backgroundOrderValid}<span class="valid">✓ VALID</span
					> ev ({colorTokens.ev?.l.toFixed(4)}) > bg ({colorTokens.bg?.l.toFixed(4)}){:else}<span
						class="invalid">✗ INVALID</span
					> {validation.backgroundOrderViolation}{/if}</pre>
		</div>
	</div>
</section>

<!-- All color token sections -->
{#each Object.entries(colorTokens) as [colorName, colorValue]}
	{#if colorValue}
		<ClrTokenSection {colorName} {colorValue} />
	{/if}
{/each}

<details>
	<summary>Generated CSS</summary>
	<textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px;"
		>{generatedCss}</textarea
	>
</details>

<!-- CSS ----------------------------------------------- -->
<style>
	.color-controls {
		display: flex;
		flex-direction: column;
		gap: var(--gap-m);
		padding: var(--sp-3);
		background: var(--clr-bg-a-lo);
		border: 1px solid var(--clr-fg-a-lo);

		h3 {
			margin: 0 0 var(--sp-2) 0;
		}

		.color-control {
			padding: var(--sp-2);
			background: var(--clr-ev);
			border: 1px solid var(--clr-fg-a-lo);

			h4 {
				margin: 0 0 var(--sp-2) 0;
				font-size: 1em;
				color: var(--clr-primary);
			}

			.controls {
				display: flex;
				flex-direction: column;
				gap: var(--gap-s);

				.control-row {
					display: flex;
					align-items: center;

					label {
						display: flex;
						align-items: center;
						gap: var(--gap-s);
						width: 100%;
						font-size: 0.9em;

						input[type='number'] {
							width: 80px;
							padding: 4px 8px;
							font-family: monospace;
						}

						input[type='range'] {
							flex: 1;
						}
					}
				}
			}
		}
	}

	.validation {
		display: flex;
		flex-direction: column;
		gap: var(--gap-m);
		padding: var(--sp-3);
		background: var(--clr-bg-a-lo);
		border: 1px solid var(--clr-fg-a-lo);
		margin-top: var(--sp-3);

		h3 {
			margin: 0;
			font-size: 1.1em;
		}

		.validation-output {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--gap-m);

			.section {
				h4 {
					margin: 0 0 var(--sp-1) 0;
					font-size: 0.95em;
					color: var(--clr-neutral);
				}

				pre {
					margin: 0;
					padding: var(--sp-2);
					background: var(--clr-ev);
					border: 1px solid var(--clr-fg-a-lo);
					font-family: monospace;
					font-size: 0.9em;
					line-height: 1.6;
					color: var(--clr-ink);

					.valid {
						color: var(--clr-positive);
						font-weight: bold;
					}

					.invalid {
						color: var(--clr-negative);
						font-weight: bold;
					}
				}
			}
		}
	}
</style>
