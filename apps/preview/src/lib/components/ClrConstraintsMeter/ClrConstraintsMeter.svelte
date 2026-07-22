<script lang="ts">
	import type { ClassValue, HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class'> {
		class?: ClassValue;
	}

	let { class: className, ...divProps }: Props = $props();
</script>

<!-- MARKUP -------------------------------------------- -->
<div class={['host', className]} {...divProps}>test</div>

<!-- CSS ----------------------------------------------- -->
<style>
</style>
