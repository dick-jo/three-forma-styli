<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import { readToken } from '../lib/css';
	import Section from '../lib/Section.svelte';

	interface Props {
		time: WorkbenchData['time'];
		easings: WorkbenchData['easings'];
		preview: HTMLElement | undefined;
		readStamp: number;
	}

	let { time, easings, preview, readStamp }: Props = $props();
	let chosen = $state<string>();
	let duration = $derived(chosen ?? time[0]?.tokens[2] ?? '');
	let played = $state(false);

	let values = $derived.by(() => {
		void readStamp;
		return time.map((scale) => ({
			...scale,
			values: scale.tokens.map((token) => [token, readToken(preview, token)] as const),
		}));
	});
</script>

<Section title="Motion">
	<div class="times">
		{#each values as scale (scale.name)}
			{#each scale.values as [token, value] (token)}
				<button type="button" data-is-active={duration === token} onclick={() => (chosen = token)}
					>{token} <b>{value}</b></button
				>
			{/each}
		{/each}
	</div>
	<button type="button" class="play" onclick={() => (played = !played)}
		>Play easings with {duration}</button
	>
	<div class="tracks">
		{#each easings as easing (easing.token)}
			<code>{easing.token}</code>
			<span class="track">
				<i
					data-is-played={played}
					style:transition="transform var(--{duration}) var(--{easing.token})"
				></i>
			</span>
		{/each}
	</div>
</Section>

<style>
	.times {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;

		& > button {
			--loc-clr-bg: transparent;

			&[data-is-active='true'] {
				--loc-clr-bg: #4f6bed22;
			}

			padding: 0.25rem 0.6rem;
			background-color: var(--loc-clr-bg);
			border: 1px solid #0002;
			border-radius: 999px;
			font:
				0.75rem ui-monospace,
				monospace;
			cursor: pointer;
		}
	}

	.play {
		align-self: flex-start;
		padding: 0.35rem 0.8rem;
		background-color: #222;
		border: 0;
		border-radius: 999px;
		color: #fff;
		font:
			0.75rem system-ui,
			sans-serif;
		cursor: pointer;
	}

	.tracks {
		display: grid;
		grid-template-columns: max-content 1fr;
		align-items: center;
		gap: 0.5rem 1rem;
		font:
			0.75rem ui-monospace,
			monospace;

		& > .track {
			container-type: inline-size;
			height: 1rem;
			position: relative;
			background-color: #0001;
			border-radius: 999px;

			& > i {
				--loc-offset: 0;

				&[data-is-played='true'] {
					--loc-offset: calc(100cqw - 1rem);
				}

				width: 1rem;
				height: 1rem;
				position: absolute;
				background-color: #4f6bed;
				border-radius: 50%;
				transform: translateX(var(--loc-offset));
			}
		}
	}
</style>
