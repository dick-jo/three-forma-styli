<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLElement> {
		title: string;
		children?: Snippet;
		class?: string;
	}

	let { title, children, class: className, ...restProps }: Props = $props();
</script>

<section class={['host', 'section', className]} {...restProps}>
	<h2>{title}</h2>
	{#if children}
		{@render children()}
	{/if}
</section>

<style>
	.host.section {
		--loc-gap: 1rem;

		padding: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: var(--loc-gap);
		border-top: 1px solid #0001;

		& > h2 {
			margin: 0;
			color: #666;
			font:
				600 0.75rem/1 system-ui,
				sans-serif;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
	}
</style>
