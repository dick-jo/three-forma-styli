<script lang="ts">
	import type {
		ColorReviewCase,
		FoundationReviewCase,
		MotionReviewCase,
		ShadowReviewCase,
		TypographyReviewCase,
	} from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { colorStyle, shadowStyle, typographyStyle } from './review';

	type MatrixReviewCase =
		| ColorReviewCase
		| TypographyReviewCase
		| ShadowReviewCase
		| MotionReviewCase
		| FoundationReviewCase;

	interface Props {
		cases: MatrixReviewCase[];
		draft: DraftValues;
		onselect: (id: string) => void;
		compact?: boolean;
	}

	let { cases, draft, onselect, compact = false }: Props = $props();
	let domain = $derived(cases[0]?.kind ?? 'empty');
</script>

<div class="case-matrix" class:compact data-lab={domain}>
	{#each cases as reviewCase}
		<button class="matrix-card" onclick={() => onselect(reviewCase.id)}>
			<header>
				<strong>{reviewCase.label}</strong>
				<code>{reviewCase.sourcePath}</code>
			</header>
			{#if reviewCase.kind === 'color'}
				<div class="matrix-color" style={`--review-color:${colorStyle(reviewCase, draft)}`}></div>
				<code>{colorStyle(reviewCase, draft)}</code>
			{:else if reviewCase.kind === 'typography'}
				<span class="matrix-type" style={typographyStyle(reviewCase, draft)}>
					Sphinx of black quartz, judge my vow.
				</span>
				<code>
					--{reviewCase.recipe.atomicFontSizeToken} · {reviewCase.weight.alias} ·
					{reviewCase.recipe.lineHeight}
				</code>
			{:else if reviewCase.kind === 'shadow'}
				<div class="matrix-shadow">
					<span style={shadowStyle(reviewCase, draft)}>Aa</span>
				</div>
				<code>{reviewCase.css}</code>
			{:else if reviewCase.kind === 'motion'}
				<div class="matrix-motion">
					<span style={`width:${Math.max(8, Math.min(100, reviewCase.duration.milliseconds / 4))}%`}
					></span>
				</div>
				<code>{reviewCase.duration.milliseconds}ms · {reviewCase.easing.name}</code>
			{:else if reviewCase.kind === 'foundation'}
				<div class="matrix-foundation">
					<strong>{reviewCase.tokens.length}</strong>
					<span>generated tokens</span>
				</div>
				<code>{reviewCase.tokens[0]?.value} → {reviewCase.tokens.at(-1)?.value}</code>
			{/if}
		</button>
	{/each}
</div>
