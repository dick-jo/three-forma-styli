<script lang='ts'>
import '$lib/style/main.css'
import { setContext } from 'svelte';
import { generateCssVariables, type DesignSystem } from '@three-forma-styli/core';
import { designSystem as defaultTheme } from '@three-forma-styli/themes';

const {children} = $props()

// Reactive design system - shared via context
let designSystem = $state<DesignSystem>(structuredClone(defaultTheme));

// Auto-regenerate CSS when designSystem changes
let generatedCss = $derived(generateCssVariables(designSystem));

// Share both via context
setContext('designSystem', designSystem);
setContext('generatedCss', () => generatedCss);
</script>

<!-- Inject generated CSS into page -->
<svelte:head>
	{@html `<style>${generatedCss}</style>`}
</svelte:head>

<main>

{@render children()}
</main>
