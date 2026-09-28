<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import Section from '../lib/Section.svelte';

	interface Props {
		shadows: WorkbenchData['shadows'];
	}

	let { shadows }: Props = $props();
</script>

<Section title="Shadow">
	{#each shadows as range (range.name)}
		<div class="range">
			{#each range.tokens as token (token)}
				<figure style:box-shadow="var(--{token})"><figcaption>{token}</figcaption></figure>
			{/each}
		</div>
	{/each}
</Section>

<style>
	.range {
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;

		& > figure {
			height: 4rem;
			margin: 0;
			padding: 0.5rem;
			display: flex;
			align-items: flex-end;
			background-color: #fff;
			border-radius: 0.5rem;
			font:
				0.6875rem ui-monospace,
				monospace;
		}
	}
</style>
