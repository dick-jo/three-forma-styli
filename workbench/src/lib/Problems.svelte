<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		problems: readonly string[];
		class?: string;
	}

	let { problems, class: className, ...restProps }: Props = $props();
</script>

{#if problems.length > 0}
	<div class={['host', 'problems', className]} role="alert" {...restProps}>
		<strong>
			✗ {problems.length} problem{problems.length === 1 ? '' : 's'} — showing the last valid output
		</strong>
		<ul>
			{#each problems as problem (problem)}
				<li>{problem}</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.host.problems {
		padding: 0.75rem 1rem;
		background-color: #fdecec;
		border: 1px solid #e5a3a3;
		border-radius: 0.5rem;
		color: #8a1c1c;
		font:
			0.8125rem/1.5 ui-monospace,
			monospace;

		& > ul {
			margin: 0.25rem 0 0;
			padding-left: 1.25rem;
		}
	}
</style>
