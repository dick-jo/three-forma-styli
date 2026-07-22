<script lang='ts'>
import '$lib/style/main.css'
import { setContext } from 'svelte';
import { generateCss, type DesignSystem } from '@three-forma-styli/core';
import { designSystem as defaultTheme } from '@three-forma-styli/themes';

const {children} = $props()

// Deep clone via JSON (structuredClone doesn't work with culori objects)
function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// Reactive design system - shared via context
let designSystem = $state<DesignSystem>(deepClone(defaultTheme));

// Auto-regenerate CSS when designSystem changes
let generatedCss = $derived(generateCss(designSystem));

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
