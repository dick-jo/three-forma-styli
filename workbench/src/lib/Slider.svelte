<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'value'> {
		label: string;
		value: number;
		display?: string;
		class?: string;
	}

	let { label, value, display, class: className, ...restProps }: Props = $props();
</script>

<label class={['host', 'slider', className]}>
	<span class="label">{label}</span>
	<!-- value after min/max/step, or the browser clamps it to the default 0–100 range -->
	<input type="range" {...restProps} {value} />
	<output>{display ?? value}</output>
</label>

<style>
	.host.slider {
		display: grid;
		grid-template-columns: 7rem 1fr 4.5rem;
		align-items: center;
		gap: 0.75rem;
		color: #444;
		font:
			0.75rem/1 system-ui,
			sans-serif;

		& > output {
			font-variant-numeric: tabular-nums;
			text-align: right;
		}
	}
</style>
