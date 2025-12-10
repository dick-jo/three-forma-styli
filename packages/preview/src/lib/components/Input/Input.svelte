<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		hint?: string;
	}

	let { label, hint, value = $bindable(), ...inputProps }: Props = $props();
</script>

<!-- MARKUP -------------------------------------------- -->
<div class={['host', 'input']}>
	{#if label || hint}
		<div class="header">
			{#if label}
				<label class="label" for={inputProps.id}>
					{label}
				</label>
			{/if}

			{#if hint}
				<div class="aux" data-sentiment="negative">
					<div class="wrapper">
						<span>{hint}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<div class="body">
		<input bind:value {...inputProps} />
	</div>
</div>

<!-- CSS ----------------------------------------------- -->
<style>
	.host {
		--loc-gap: var(--sp-min);
		--loc-clr-bg: var(--clr-neutral-a-min);
		--loc-clr-ink: var(--clr-ink);
		--loc-clr-border: var(--clr-neutral-a-lo);
		--loc-bdr: var(--bdr-s);
		--loc-bdr--s: var(--bdr-min);
		--loc-transition: var(--t-ix-hover);
		&:has(input:focus) {
			--loc-clr-bg: var(--clr-neutral-a-lo-x);
			--loc-clr-border: var(--clr-neutral-a-hi);
		}
		max-height: fit-content;
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;

		/* HEADER ----------------------------------------------- */
		.header {
			--loc-height: var(--sp-3);
			height: var(--loc-height);
			display: flex;
			justify-content: space-between;

			/* LABEL ------------------------------------------------ */
			label {
				--loc-clr-bg: var(--clr-neutral-a-lo-x);
				--loc-clr-ink: var(--clr-ink);
				.host:has(input:focus) & {
					--loc-clr-bg: var(--clr-neutral);
					--loc-clr-ink: var(--clr-bg);
				}
				padding: 0 calc(var(--loc-gap) * 2);
				display: flex;
				justify-content: center;
				align-items: center;
				background-color: var(--loc-clr-bg);
				border: var(--bdw) solid var(--loc-clr-border);
				border-bottom: none;
				border-radius: var(--loc-bdr--s) var(--loc-bdr--s) 0 0;
				color: var(--loc-clr-ink);
				font: var(--font--label);
				font-size: var(--fs-1);
				text-transform: capitalize;
				transition: var(--loc-transition);
				.host:has(input:focus) & {
					padding: 0 calc(var(--loc-gap) * 4);
				}
			}

			/* AUX -------------------------------------------------- */
			.aux {
				padding-bottom: var(--loc-gap);

				.wrapper {
					height: 100%;
					display: flex;
					justify-content: center;
					align-items: center;
					gap: var(--gap-s);
				}

				span {
					color: var(--loc-clr-ink);
					font: var(--font--body--s);
					font-size: var(--fs-min);
					font-weight: 500;
				}
			}
		}

		/* BODY ------------------------------------------------- */
		.body {
			--loc-height: var(--sp-5);
			width: 100%;
			height: var(--loc-height);
			background-color: var(--loc-clr-bg);
			border: var(--bdw) solid var(--loc-clr-border);
			border-radius: 0 var(--loc-bdr) var(--loc-bdr) var(--loc-bdr);
			transition: var(--loc-transition);

			/* INPUT ------------------------------------------------ */
			input {
				width: 100%;
				height: 100%;
				padding: var(--gap-s);
				background-color: transparent;
				border-style: none;
				color: var(--loc-clr-ink);
				font: var(--font--body--s);
				transition: var(--loc-transition);
				&::placeholder {
					color: var(--loc-clr-ink--placeholder);
				}
				&:focus {
					outline: none;
				}
			}
		}
	}
</style>
