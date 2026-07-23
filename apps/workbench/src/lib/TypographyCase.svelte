<script lang="ts">
	import type { TypographyReviewCase } from '@three-forma-styli/core';
	import type { DraftValues } from './draft';
	import { typographyStyle } from './review';

	interface Props {
		reviewCase: TypographyReviewCase;
		draft: DraftValues;
	}

	let { reviewCase, draft }: Props = $props();
	let lineDiagnostics = $state(false);
	let lightSurface = $state(false);
	let wcagSpacing = $state(false);
	let forceFallback = $state(false);
	let typeSample = $state<HTMLElement | undefined>();
	let wrapSample = $state<HTMLElement | undefined>();
	let metricProbe = $state<HTMLElement | undefined>();
	let baselineProbe = $state<HTMLElement | undefined>();
	let capProbe = $state<HTMLElement | undefined>();
	let exProbe = $state<HTMLElement | undefined>();
	let metricGuides = $state({ lineBottom: 0, baseline: 0, cap: 0, ex: 0 });
	let fallbackEvidence = $state('');
	let fallbackMeasurementRun = 0;

	$effect(() => {
		reviewCase.id;
		draft;
		lineDiagnostics;
		forceFallback;
		wcagSpacing;
		const frame = requestAnimationFrame(() => {
			refreshMetricGuides();
			void refreshFallbackEvidence();
		});
		return () => cancelAnimationFrame(frame);
	});

	function refreshMetricGuides(): void {
		if (!metricProbe || !baselineProbe || !capProbe || !exProbe) return;
		const probe = metricProbe.getBoundingClientRect();
		const baseline = baselineProbe.getBoundingClientRect().top - probe.top;
		metricGuides = {
			lineBottom: probe.height,
			baseline,
			cap: baseline - capProbe.getBoundingClientRect().height,
			ex: baseline - exProbe.getBoundingClientRect().height,
		};
	}

	function renderedLineCount(element: HTMLElement): number {
		const range = document.createRange();
		range.selectNodeContents(element);
		const tops = [...range.getClientRects()]
			.filter((rect) => rect.width > 0 && rect.height > 0)
			.map((rect) => Math.round(rect.top * 10) / 10);
		return new Set(tops).size;
	}

	function measureTypography(forceAdjustedFallback: boolean): { width: number; lines: number } {
		if (!typeSample || !wrapSample) return { width: 0, lines: 0 };
		const style = typographyStyle(reviewCase, draft, {
			forceFallback: forceAdjustedFallback,
			wcagSpacing,
		});
		const inline = document.createElement('span');
		inline.textContent = typeSample.textContent;
		inline.style.cssText = `${style};position:fixed;left:-100000px;top:0;visibility:hidden;display:inline-block;width:max-content;max-width:none;white-space:pre`;
		const wrap = document.createElement('div');
		wrap.textContent = wrapSample.textContent;
		wrap.style.cssText = `${style};position:fixed;left:-100000px;top:0;visibility:hidden;width:${wrapSample.getBoundingClientRect().width}px`;
		document.body.append(inline, wrap);
		const result = { width: inline.getBoundingClientRect().width, lines: renderedLineCount(wrap) };
		inline.remove();
		wrap.remove();
		return result;
	}

	async function refreshFallbackEvidence(): Promise<void> {
		const run = ++fallbackMeasurementRun;
		if (!reviewCase.font.adjustedFallback) {
			fallbackEvidence = '';
			return;
		}
		await document.fonts.ready;
		if (run !== fallbackMeasurementRun) return;
		const primary = measureTypography(false);
		const adjusted = measureTypography(true);
		if (run !== fallbackMeasurementRun || primary.width === 0) return;
		const widthDelta = adjusted.width - primary.width;
		const percent = (widthDelta / primary.width) * 100;
		const signed = (value: number, digits: number) =>
			`${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
		fallbackEvidence = `inline width Δ ${signed(widthDelta, 2)}px (${signed(percent, 2)}%) · line count Δ ${adjusted.lines - primary.lines >= 0 ? '+' : ''}${adjusted.lines - primary.lines} (${primary.lines}→${adjusted.lines})`;
	}
</script>

<div class="typography-stage" class:light-surface={lightSurface}>
	<div class="type-tools">
		<label><input type="checkbox" bind:checked={lineDiagnostics} /> metrics</label>
		<label><input type="checkbox" bind:checked={lightSurface} /> light surface</label>
		<label><input type="checkbox" bind:checked={wcagSpacing} /> WCAG spacing stress</label>
		{#if reviewCase.font.adjustedFallback}
			<label><input type="checkbox" bind:checked={forceFallback} /> adjusted fallback</label>
			<output>{fallbackEvidence || 'measuring primary → adjusted fallback…'}</output>
		{/if}
	</div>
	<div class="type-stage-body">
		<p class="eyebrow">{reviewCase.role} · {reviewCase.variant ?? 'base'}</p>
		<div class="metric-sample" class:diagnostics={lineDiagnostics}>
			<p
				class="type-short"
				bind:this={typeSample}
				style={typographyStyle(reviewCase, draft, { forceFallback, wcagSpacing })}
				contenteditable="true"
				aria-label="Editable typography sample"
				spellcheck="false"
				oninput={() => {
					refreshMetricGuides();
					void refreshFallbackEvidence();
				}}
			>
				Sphinx of black quartz, judge my vow.
			</p>
			<span
				class="metric-probe"
				bind:this={metricProbe}
				style={typographyStyle(reviewCase, draft, { forceFallback, wcagSpacing })}
			>
				Hhx<span class="baseline-probe" bind:this={baselineProbe}></span><i
					class="cap-probe"
					bind:this={capProbe}
				></i><i class="ex-probe" bind:this={exProbe}></i>
			</span>
			{#if lineDiagnostics}
				<div class="metric-overlay" aria-hidden="true">
					<i class="metric-line" style="top:0"><span>line top</span></i>
					<i class="metric-line" style={`top:${metricGuides.lineBottom}px`}
						><span>line bottom</span></i
					>
					<i class="metric-cap" style={`top:${metricGuides.cap}px`}><span>1cap</span></i>
					<i class="metric-ex" style={`top:${metricGuides.ex}px`}><span>1ex</span></i>
					<i class="metric-baseline" style={`top:${metricGuides.baseline}px`}
						><span>baseline</span></i
					>
				</div>
			{/if}
		</div>
		<div class="type-columns">
			<div>
				<span class="type-caption">narrow wrapping</span>
				<p
					bind:this={wrapSample}
					style={typographyStyle(reviewCase, draft, { forceFallback, wcagSpacing })}
				>
					Typography becomes a system when every choice remains intentional under density, wrapping,
					different surfaces, real content and imperfect loading conditions.
				</p>
			</div>
			<div>
				<span class="type-caption">glyph stress</span>
				<p
					class="glyph-stress"
					style={typographyStyle(reviewCase, draft, { forceFallback, wcagSpacing })}
				>
					ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · $€£¥ ₿ ± × ÷ → ← ↑
					↓ &#123; &#125; [ ] ( )
				</p>
			</div>
		</div>
		<div class="weight-matrix">
			{#each Object.entries(reviewCase.styleWeights) as [style, weights]}
				{#each weights as weight}
					<article>
						<code>{style} · {weight.alias} · {weight.value}</code>
						<span
							style={`${typographyStyle(reviewCase, draft, {
								forceFallback,
								wcagSpacing,
							})};font-style:${style};font-weight:${weight.value}`}
						>
							Aa 0123
						</span>
					</article>
				{/each}
			{/each}
		</div>
	</div>
</div>
