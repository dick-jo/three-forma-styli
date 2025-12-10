<script lang="ts">
	import { ClrMeter, type ClrMeterFlag } from '$lib/components/ClrMeter';
	import Input from '$lib/components/Input/Input.svelte';
	import type { Oklch } from 'culori';

	interface Props {
		name: string;
		color: Oklch;
		lValue: number;
		cValue: number;
		hValue: number;
		lumFlags: ClrMeterFlag[];
		chromaFlags: ClrMeterFlag[];
		hueFlags: ClrMeterFlag[];
		enforceBounds?: boolean;
		hint?: string;
		pageBackgroundLuminance?: number;
	}

	let {
		name,
		color,
		lValue = $bindable(),
		cValue = $bindable(),
		hValue = $bindable(),
		lumFlags,
		chromaFlags,
		hueFlags,
		enforceBounds = false,
		hint,
		pageBackgroundLuminance = 0.5,
	}: Props = $props();
</script>

<!-- MARKUP -------------------------------------------- -->
<div class="item">
	<h3>{name.toUpperCase()}</h3>
	<div class="swatch-row">
		<div class="swatch" style="background-color: var(--clr-{name});"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-min);"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-lo-x);"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-lo);"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-hi);"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-hi-x);"></div>
		<div class="swatch" style="background-color: var(--clr-{name}-a-max);"></div>
	</div>

	<div class="input-row">
		<Input
			label="LUM"
			hint={hint || '0 - 1'}
			type="number"
			step="0.01"
			min="0"
			max="1"
			bind:value={lValue}
		/>
		<ClrMeter
			channel="l"
			{color}
			flags={lumFlags}
			{enforceBounds}
			{pageBackgroundLuminance}
		/>
	</div>

	<div class="input-row">
		<Input
			label="CHR"
			hint="0 - 0.5"
			type="number"
			step="0.01"
			min="0"
			max="0.5"
			bind:value={cValue}
		/>
		<ClrMeter
			channel="c"
			{color}
			flags={chromaFlags}
			{enforceBounds}
			{pageBackgroundLuminance}
		/>
	</div>

	<div class="input-row">
		<Input
			label="HUE"
			hint="0 - 360"
			type="number"
			step="1"
			min="0"
			max="360"
			bind:value={hValue}
		/>
		<ClrMeter
			channel="h"
			{color}
			flags={hueFlags}
			{enforceBounds}
			{pageBackgroundLuminance}
		/>
	</div>
</div>

<!-- CSS ----------------------------------------------- -->
<style>
	.item {
		--loc-grid-cols: 6;
		@container (max-width: 720px) {
			--loc-grid-cols: 12;
		}
		padding: var(--gap-l);
		grid-column: span var(--loc-grid-cols);
		display: flex;
		flex-direction: column;
		gap: var(--gap-s);
		&:not(:last-child) {
			border-right: var(--bdw) solid var(--clr-neutral-a-min);
		}
		@container (max-width: 720px) {
			&:not(:last-child) {
				border-right: none;
				border-bottom: var(--bdw) solid var(--clr-neutral-a-min);
			}
		}

		/* SWATCH ROW ------------------------------------------- */
		.swatch-row {
			height: var(--sp-3);
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			gap: var(--gap-min);

			/* Swatch */
			& > .swatch {
				height: 100%;
				border: var(--bdw) solid var(--clr-neutral-a-lo-x);
			}
		}

		/* INPUT ROW -------------------------------------------- */
		.input-row {
			display: flex;
			gap: var(--gap-l);

			& > :global(*) {
				&:first-child {
					flex: 1;
				}
				&:last-child {
					flex: 4;
				}
			}
		}
	}
</style>
