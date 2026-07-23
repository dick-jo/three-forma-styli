<script lang="ts">
	import type { ReviewCase } from '@three-forma-styli/core';
	import ColorCase from './ColorCase.svelte';
	import type { DraftValues } from './draft';
	import FoundationCase from './FoundationCase.svelte';
	import MotionCase from './MotionCase.svelte';
	import ShadowCase from './ShadowCase.svelte';
	import TypographyCase from './TypographyCase.svelte';

	interface Props {
		reviewCase?: ReviewCase;
		draft: DraftValues;
	}

	let { reviewCase, draft }: Props = $props();
</script>

{#if reviewCase?.kind === 'color'}
	<ColorCase {reviewCase} {draft} />
{:else if reviewCase?.kind === 'typography'}
	<TypographyCase {reviewCase} {draft} />
{:else if reviewCase?.kind === 'shadow'}
	<ShadowCase {reviewCase} {draft} />
{:else if reviewCase?.kind === 'motion'}
	{#key reviewCase.id}
		<MotionCase {reviewCase} />
	{/key}
{:else if reviewCase?.kind === 'foundation'}
	<FoundationCase {reviewCase} />
{/if}
