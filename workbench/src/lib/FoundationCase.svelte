<script lang="ts">
	import type { FoundationReviewCase } from '@three-forma-styli/core';

	interface Props {
		reviewCase: FoundationReviewCase;
	}

	let { reviewCase }: Props = $props();
</script>

<div class="foundation-stage">
	{#each reviewCase.tokens as token}
		<article class="foundation-item">
			<div
				class="foundation-sample"
				data-family={reviewCase.family}
				style={`--review-value:var(--${token.name});--review-raw:${token.rawValue ?? 0}`}
			></div>
			<strong>--{token.name}</strong>
			<code>{token.value}</code>
		</article>
	{/each}
</div>
