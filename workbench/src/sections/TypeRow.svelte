<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import type { Changes } from '../lib/changes.svelte';
	import { parseLength, readToken } from '../lib/css';
	import Slider from '../lib/Slider.svelte';

	type Row = WorkbenchData['roles'][number]['rows'][number];

	interface Props {
		role: string;
		row: Row;
		choices: string[];
		preview: HTMLElement | undefined;
		readStamp: number;
		changes: Changes;
		viewing: string;
	}

	let { role, row, choices, preview, readStamp, changes, viewing }: Props = $props();
	let sample = $state<HTMLElement>();
	let open = $state(false);

	let values = $derived.by(() => {
		void readStamp;
		const style = sample ? getComputedStyle(sample) : undefined;
		return {
			lineHeight: Number(readToken(preview, row.lineHeight)) || 0,
			letterSpacing: parseLength(readToken(preview, row.letterSpacing)).number,
			meta: style
				? `${style.fontSize} · ${style.fontWeight} · ${style.lineHeight} · ${style.letterSpacing} · ${style.fontFamily.split(',')[0]}`
				: '',
		};
	});

	function tweak(field: 'lineHeight' | 'letterSpacing', value: number) {
		const token = row[field];
		const format = (v: number) => (field === 'lineHeight' ? String(v) : v === 0 ? '0' : `${v}em`);
		changes.set({
			key: `type:${role}:${row.size}:${field}`,
			label: `typography.roles.${role}.sizes.${row.size}.${field} (viewing ${viewing})`,
			from: format(values[field]),
			to: format(value),
			vars: { [token]: format(value) },
		});
	}
</script>

<div class="host type-row">
	<button type="button" class="size" data-is-active={open} onclick={() => (open = !open)}
		>{row.size}</button
	>
	<p bind:this={sample} class={[row.className, ...choices]}>
		The quick brown fox jumps over the lazy dog
	</p>
	<code class="meta">{values.meta}</code>
	{#if open}
		<div class="sliders">
			<Slider
				label="line height"
				min="0.7"
				max="2.2"
				step="0.005"
				value={values.lineHeight}
				oninput={(e) => tweak('lineHeight', e.currentTarget.valueAsNumber)}
			/>
			<Slider
				label="letter spacing"
				min="-0.08"
				max="0.2"
				step="0.0025"
				value={values.letterSpacing}
				display="{values.letterSpacing}em"
				oninput={(e) => tweak('letterSpacing', e.currentTarget.valueAsNumber)}
			/>
		</div>
	{/if}
</div>

<style>
	.host.type-row {
		display: grid;
		grid-template-columns: 3rem 1fr;
		align-items: baseline;
		gap: 0.25rem 1rem;

		& > .size {
			--loc-clr-bg: transparent;

			&[data-is-active='true'] {
				--loc-clr-bg: #4f6bed22;
			}

			padding: 0.15rem 0.4rem;
			background-color: var(--loc-clr-bg);
			border: 1px solid #0002;
			border-radius: 999px;
			font:
				0.6875rem ui-monospace,
				monospace;
			cursor: pointer;
		}

		& > p {
			margin: 0;
		}

		& > .meta,
		& > .sliders {
			grid-column: 2;
		}

		& > .meta {
			color: #888;
			font:
				0.6875rem ui-monospace,
				monospace;
		}

		& > .sliders {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
