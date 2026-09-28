<script lang="ts">
	import type { AlphaReviewCase } from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { alphaValue } from './review';

	interface Props {
		reviewCase: AlphaReviewCase;
		draft: DraftValues;
	}

	let { reviewCase, draft }: Props = $props();
</script>

<div class="alpha-stage">
	<header>
		<div>
			<span>atomic scale</span>
			<strong>{reviewCase.scale}</strong>
		</div>
		{#if reviewCase.isDefault}<small>default · unqualified --a-* namespace</small>{/if}
	</header>
	<div class="alpha-scale">
		{#each reviewCase.values as value}
			<article>
				<div class="alpha-atomic-sample">
					<span style={`opacity:${alphaValue(reviewCase, value.position, draft)}`}></span>
				</div>
				<div>
					<strong>{value.position}</strong>
					<small>{Math.round(alphaValue(reviewCase, value.position, draft) * 1000) / 10}%</small>
				</div>
				<code>--{value.token}</code>
			</article>
		{/each}
	</div>
</div>
