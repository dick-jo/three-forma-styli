<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Changes } from './changes.svelte';

	interface Props extends HTMLAttributes<HTMLElement> {
		changes: Changes;
		class?: string;
	}

	let { changes, class: className, ...restProps }: Props = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(changes.text());
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

{#if changes.list.length > 0}
	<aside class={['host', 'changes-tray', className]} {...restProps}>
		<header>
			<strong>Preview changes</strong>
			<span>not saved — edit your files to keep them</span>
			<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
			<button type="button" onclick={() => changes.reset()}>Reset</button>
		</header>
		<ul>
			{#each changes.list as change (change.key)}
				<li><code>{change.label}</code> {change.from} → <strong>{change.to}</strong></li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	.host.changes-tray {
		max-height: 40vh;
		padding: 0.75rem 1rem;
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		left: 1rem;
		background-color: #222;
		border-radius: 0.75rem;
		box-shadow: 0 8px 32px #0004;
		color: #eee;
		font:
			0.8125rem/1.5 system-ui,
			sans-serif;
		overflow: auto;
		z-index: 1;

		& > header {
			display: flex;
			align-items: center;
			gap: 0.75rem;

			& > span {
				flex: 1;
				color: #999;
			}
		}

		& button {
			padding: 0.25rem 0.75rem;
			background-color: #fff2;
			border: 0;
			border-radius: 999px;
			color: inherit;
			cursor: pointer;
		}

		& > ul {
			margin: 0.5rem 0 0;
			padding-left: 1.25rem;
		}
	}
</style>
