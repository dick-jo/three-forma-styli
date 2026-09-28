<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import type { Changes } from '../lib/changes.svelte';
	import { formatOklch, parseOklch, readToken } from '../lib/css';
	import Section from '../lib/Section.svelte';
	import Slider from '../lib/Slider.svelte';

	interface Props {
		colors: WorkbenchData['colors'];
		contrast: WorkbenchData['contrast'];
		preview: HTMLElement | undefined;
		readStamp: number;
		changes: Changes;
		viewing: string;
	}

	let { colors, contrast, preview, readStamp, changes, viewing }: Props = $props();
	let open = $state<string | undefined>();

	let current = $derived.by(() => {
		void readStamp;
		return Object.fromEntries(
			colors.map((color) => [color.name, parseOklch(readToken(preview, color.token))])
		);
	});

	function tweak(color: WorkbenchData['colors'][number], channel: 'l' | 'c' | 'h', value: number) {
		const from = current[color.name];
		if (!from) return;
		const next = { ...from, [channel]: value };
		changes.set({
			key: `color:${color.name}`,
			label: `colors.tokens.${color.name} (viewing ${viewing})`,
			from: formatOklch(from),
			to: formatOklch(next),
			vars: Object.fromEntries([
				[color.token, formatOklch(next)],
				...color.ramp.map((step) => [step.token, formatOklch(next, step.alpha)]),
			]),
		});
	}
</script>

<Section title="Colour">
	{#if contrast.length > 0}
		<p class="contrast">
			Contrast rule
			{#each contrast as result (result.palette)}
				<span data-is-ok={result.ok}>
					{result.palette}
					{result.ok ? '✓' : '✗'}
					{result.delta}
					{result.ok ? '≥' : '<'}
					{result.required}{result.ok ? '' : ` (${result.worst})`}
				</span>
			{/each}
		</p>
	{/if}
	<div class="swatches">
		{#each colors as color (color.name)}
			<button
				type="button"
				class="swatch"
				data-is-active={open === color.name}
				onclick={() => (open = open === color.name ? undefined : color.name)}
			>
				<span class="chip" style:background-color="var(--{color.token})"></span>
				<span class="ramp">
					{#each color.ramp as step (step.token)}
						<span style:background-color="var(--{step.token})"></span>
					{/each}
				</span>
				<span class="name">{color.name}</span>
			</button>
		{/each}
	</div>
	{#if open && current[open]}
		{@const color = colors.find((c) => c.name === open)!}
		{@const value = current[open]!}
		<div class="sliders">
			<Slider
				label="{open} lightness"
				min="0"
				max="1"
				step="0.005"
				value={value.l}
				oninput={(e) => tweak(color, 'l', e.currentTarget.valueAsNumber)}
			/>
			<Slider
				label="{open} chroma"
				min="0"
				max="0.4"
				step="0.005"
				value={value.c}
				oninput={(e) => tweak(color, 'c', e.currentTarget.valueAsNumber)}
			/>
			<Slider
				label="{open} hue"
				min="0"
				max="360"
				step="1"
				value={value.h}
				oninput={(e) => tweak(color, 'h', e.currentTarget.valueAsNumber)}
			/>
		</div>
	{/if}
</Section>

<style>
	.contrast {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		color: #666;
		font:
			0.8125rem system-ui,
			sans-serif;

		& > span {
			--loc-clr: #1d7a3a;

			&[data-is-ok='false'] {
				--loc-clr: #b42318;
			}

			color: var(--loc-clr);
		}
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: 0.75rem;
	}

	.swatch {
		--loc-outline: transparent;

		&[data-is-active='true'] {
			--loc-outline: #222;
		}

		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: none;
		border: 0;
		outline: 2px solid var(--loc-outline);
		outline-offset: 2px;
		border-radius: 0.5rem;
		text-align: left;
		cursor: pointer;

		& > .chip {
			height: 3.5rem;
			border-radius: 0.5rem 0.5rem 0 0;
		}

		& > .ramp {
			height: 0.75rem;
			display: grid;
			grid-auto-flow: column;
		}

		& > .name {
			color: #444;
			font:
				0.75rem ui-monospace,
				monospace;
		}
	}

	.sliders {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
