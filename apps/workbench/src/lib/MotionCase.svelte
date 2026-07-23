<script lang="ts">
	import type { MotionReviewCase } from '@three-forma-styli/core';

	interface Props {
		reviewCase: MotionReviewCase;
	}

	let { reviewCase }: Props = $props();
	let motionRun = $state(0);
</script>

<div class="motion-stage">
	<div class="motion-meta">
		<article>
			<span>duration</span>
			<strong>{reviewCase.duration.milliseconds}ms</strong>
			<code>{reviewCase.duration.token ? `--${reviewCase.duration.token}` : '0ms'}</code>
		</article>
		<article>
			<span>delay</span>
			<strong>{reviewCase.delay.milliseconds}ms</strong>
			<code>{reviewCase.delay.token ? `--${reviewCase.delay.token}` : '0ms'}</code>
		</article>
		<article>
			<span>easing</span>
			<strong>{reviewCase.easing.name}</strong>
			<code>--{reviewCase.easing.token}</code>
		</article>
	</div>
	<div class="motion-track">
		{#key motionRun}
			<div
				class:running={motionRun > 0}
				class="motion-object"
				style={`--review-duration:${reviewCase.duration.milliseconds}ms;--review-delay:${reviewCase.delay.milliseconds}ms;--review-easing:${reviewCase.easing.css}`}
			></div>
		{/key}
	</div>
	<button class="motion-play" onclick={() => (motionRun += 1)}>play once</button>
	<code class="motion-tuple">
		{reviewCase.duration.milliseconds}ms {reviewCase.easing.css}
		{reviewCase.delay.milliseconds}ms
	</code>
</div>
