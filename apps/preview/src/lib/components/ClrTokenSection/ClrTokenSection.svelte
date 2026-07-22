<script lang="ts">
	import type { ClrTokenSectionProps } from './types';

	const { colorName, colorValue }: ClrTokenSectionProps = $props();

	// Transparency variant names from the system
	const transparencyVariants = ['min', 'lo-x', 'lo', 'hi', 'hi-x', 'max'];

	// CSS variable names
	const solidVar = $derived(`--clr-${colorName}`);
	const alphaVars = $derived(
		transparencyVariants.map((variant) => `--clr-${colorName}-a-${variant}`)
	);
</script>

<!-- MARKUP -------------------------------------------- -->
<section class={['host', 'clr-token-section']}>
	<header>
		<h3>CLR: {colorName}</h3>
	</header>

	<div class="grid">
		<!-- Solid swatch -->
		<div class="swatch-item intent--primary" style="background: var({solidVar})"></div>

		<!-- Alpha/transparent variants -->
		{#each alphaVars as alphaVar}
			<div class="swatch-item intent--secondary" style="background: var({alphaVar})"></div>
		{/each}
	</div>
</section>

<!-- CSS ----------------------------------------------- -->
<style>
	.host {
		display: flex;
		flex-direction: column;
		gap: var(--gap-s);

		header {
			h3 {
				margin: 0;
			}
		}

		.grid {
			display: grid;
			grid-template-columns: repeat(12, 1fr);
			gap: var(--gap-s);

			.swatch-item {
				--loc-grid-cols: 1;
				height: var(--sp-5);
				grid-column: span var(--loc-grid-cols);

				&.intent--primary {
					--loc-grid-cols: 6;
				}
			}
		}
	}
</style>
