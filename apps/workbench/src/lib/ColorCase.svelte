<script lang="ts">
	import type { ColorReviewCase } from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { colorStyle } from './review';

	interface Props {
		reviewCase: ColorReviewCase;
		draft: DraftValues;
	}

	let { reviewCase, draft }: Props = $props();
</script>

<div class="color-stage">
	<div class="color-hero" style={`--review-color:${colorStyle(reviewCase, draft)}`}>
		<div class="color-chip">
			<strong>{reviewCase.color}</strong>
			<span>{reviewCase.mode}</span>
			<code>{colorStyle(reviewCase, draft)}</code>
		</div>
	</div>
	<div class="alpha-ramp">
		{#each reviewCase.alphaVariants as alpha}
			<article>
				<div
					class="alpha-chip"
					style={`--review-color:${colorStyle(reviewCase, draft, alpha.alpha)}`}
				></div>
				<strong>{alpha.label}</strong>
				<small>{Math.round(alpha.alpha * 100)}%</small>
				<code>--{alpha.token}</code>
			</article>
		{/each}
	</div>
</div>
