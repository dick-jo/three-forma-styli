<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { WorkbenchData } from 'three-forma-styli';

	interface Props extends HTMLAttributes<HTMLElement> {
		axes: WorkbenchData['axes'];
		selection: Record<string, string | undefined>;
		class?: string;
	}

	let { axes, selection = $bindable(), class: className, ...restProps }: Props = $props();
</script>

<nav class={['host', 'mode-bar', className]} {...restProps}>
	{#each axes as axis (axis.name)}
		<fieldset>
			<legend>{axis.name}</legend>
			{#each [undefined, ...axis.modes] as mode (mode ?? '')}
				<button
					type="button"
					data-is-active={selection[axis.name] === mode}
					onclick={() => (selection[axis.name] = mode)}
				>
					{mode ?? '—'}
				</button>
			{/each}
		</fieldset>
	{/each}
</nav>

<style>
	.host.mode-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;

		& > fieldset {
			margin: 0;
			padding: 0;
			display: flex;
			align-items: center;
			gap: 0.25rem;
			border: 0;
		}

		& legend {
			float: left;
			padding-right: 0.5rem;
			color: #666;
			font:
				0.75rem system-ui,
				sans-serif;
		}

		& button {
			--loc-clr-bg: transparent;
			--loc-clr-text: #444;

			&[data-is-active='true'] {
				--loc-clr-bg: #222;
				--loc-clr-text: #fff;
			}

			padding: 0.25rem 0.6rem;
			background-color: var(--loc-clr-bg);
			border: 1px solid #0002;
			border-radius: 999px;
			color: var(--loc-clr-text);
			font:
				0.75rem system-ui,
				sans-serif;
			cursor: pointer;
		}
	}
</style>
