<script lang="ts">
	import type { MotionReviewCase } from '@three-forma-styli/core';

	interface Props {
		reviewCase: MotionReviewCase;
	}

	let { reviewCase }: Props = $props();
	let motionRun = $state(0);
	let reduced = $state(new URLSearchParams(location.search).get('motion') === 'reduce');
	let value = $derived(reduced ? reviewCase.reducedMotion : reviewCase);

	function setReduced(next: boolean): void {
		reduced = next;
		motionRun += 1;
		const url = new URL(location.href);
		url.searchParams.set('motion', next ? 'reduce' : 'no-preference');
		history.replaceState(null, '', url);
	}
</script>

<div class="motion-stage">
	<div class="motion-preference" aria-label="Motion preference">
		<button class:active={!reduced} onclick={() => setReduced(false)}>standard</button>
		<button class:active={reduced} onclick={() => setReduced(true)}>reduced</button>
		<span data-behavior={reviewCase.reducedMotion.behavior}>
			{reviewCase.reducedMotion.behavior}
		</span>
	</div>
	<div class="motion-meta">
		<article>
			<span>duration</span>
			<strong>{value.duration.milliseconds}ms</strong>
			<code>{value.duration.token ? `--${value.duration.token}` : '0ms'}</code>
		</article>
		<article>
			<span>delay</span>
			<strong>{value.delay.milliseconds}ms</strong>
			<code>{value.delay.token ? `--${value.delay.token}` : '0ms'}</code>
		</article>
		<article>
			<span>easing</span>
			<strong>{value.easing.name}</strong>
			<code>--{value.easing.token}</code>
		</article>
	</div>
	<div class="motion-track">
		{#key motionRun}
			<div
				class:running={motionRun > 0}
				class="motion-object"
				style={`--review-duration:${value.duration.milliseconds}ms;--review-delay:${value.delay.milliseconds}ms;--review-easing:${value.easing.css}`}
			></div>
		{/key}
	</div>
	<button class="motion-play" onclick={() => (motionRun += 1)}>play once</button>
	<code class="motion-tuple">
		{value.duration.milliseconds}ms {value.easing.css}
		{value.delay.milliseconds}ms
	</code>
</div>
