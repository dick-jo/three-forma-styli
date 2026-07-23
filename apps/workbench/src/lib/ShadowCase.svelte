<script lang="ts">
	import type { ShadowReviewCase } from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { shadowStyle } from './review';

	interface Props {
		reviewCase: ShadowReviewCase;
		draft: DraftValues;
	}

	let { reviewCase, draft }: Props = $props();
</script>

<div class="shadow-stage">
	<div class="shadow-pair">
		<div class="shadow-object" style={shadowStyle(reviewCase, draft)}>Aa</div>
		<div class="clip-boundary">
			<div class="shadow-object" style={shadowStyle(reviewCase, draft)}>Aa</div>
		</div>
	</div>
	<pre>{shadowStyle(reviewCase, draft)}</pre>
</div>
