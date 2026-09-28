<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import type { Changes } from '../lib/changes.svelte';
	import { parseLength, readToken } from '../lib/css';
	import Section from '../lib/Section.svelte';
	import Slider from '../lib/Slider.svelte';

	interface Props {
		spacing: NonNullable<WorkbenchData['spacing']>;
		gap: WorkbenchData['gap'];
		radius: WorkbenchData['radius'];
		width: WorkbenchData['width'];
		preview: HTMLElement | undefined;
		readStamp: number;
		changes: Changes;
		viewing: string;
	}

	let { spacing, gap, radius, width, preview, readStamp, changes, viewing }: Props = $props();

	let values = $derived.by(() => {
		void readStamp;
		const read = (token: string) => readToken(preview, token);
		return {
			min: parseLength(read(spacing.min)),
			step: parseLength(read(spacing.steps[0]!)),
			all: [spacing.min, ...spacing.steps].map((token) => [token, read(token)] as const),
			gap: gap.map((token) => [token, read(token)] as const),
			radius: radius.map((token) => [token, read(token)] as const),
			width: width ? read(width) : '',
		};
	});
	let range = $derived(
		values.step.unit === 'px' ? { max: 64, step: 0.5 } : { max: 4, step: 0.0625 }
	);

	function tweak(field: 'min' | 'step', value: number) {
		const { unit } = values.step;
		const min = field === 'min' ? value : values.min.number;
		const step = field === 'step' ? value : values.step.number;
		changes.set({
			key: `spacing:${field}`,
			label: `spacing.${field} (viewing ${viewing})`,
			from: `${values[field].number}${unit}`,
			to: `${value}${unit}`,
			vars: Object.fromEntries([
				[spacing.min, `${min}${unit}`],
				...spacing.steps.map((token, index) => [
					token,
					`${Number((step * (index + 1)).toFixed(4))}${unit}`,
				]),
			]),
		});
	}
</script>

<Section title="Spacing">
	<div class="bars">
		{#each values.all as [token, value] (token)}
			<code>{token}</code><span class="bar" style:width="var(--{token})"></span><output
				>{value}</output
			>
		{/each}
	</div>
	<div class="sliders">
		<Slider
			label="spacing min"
			min="0"
			max={values.step.number}
			step={range.step}
			value={values.min.number}
			display="{values.min.number}{values.min.unit}"
			oninput={(e) => tweak('min', e.currentTarget.valueAsNumber)}
		/>
		<Slider
			label="spacing step"
			min={range.step}
			max={range.max}
			step={range.step}
			value={values.step.number}
			display="{values.step.number}{values.step.unit}"
			oninput={(e) => tweak('step', e.currentTarget.valueAsNumber)}
		/>
	</div>
	{#if gap.length || radius.length || width}
		<div class="boxes">
			{#each values.gap as [token, value] (token)}
				<figure>
					<span class="gap" style:gap="var(--{token})"><i></i><i></i></span>
					<figcaption>{token} {value}</figcaption>
				</figure>
			{/each}
			{#each values.radius as [token, value] (token)}
				<figure>
					<span class="radius" style:border-radius="var(--{token})"></span>
					<figcaption>{token} {value}</figcaption>
				</figure>
			{/each}
			{#if width}
				<figure>
					<span class="radius" style:border-width="var(--{width})"></span>
					<figcaption>{width} {values.width}</figcaption>
				</figure>
			{/if}
		</div>
	{/if}
</Section>

<style>
	.bars {
		display: grid;
		grid-template-columns: max-content 1fr max-content;
		align-items: center;
		gap: 0.25rem 1rem;
		font:
			0.75rem ui-monospace,
			monospace;

		& > .bar {
			height: 0.75rem;
			background-color: #4f6bed;
			border-radius: 2px;
		}
	}

	.sliders {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.boxes {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;

		& figure {
			margin: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.5rem;
			font:
				0.75rem ui-monospace,
				monospace;
		}

		& .gap {
			display: flex;

			& > i {
				width: 1.5rem;
				height: 1.5rem;
				background-color: #4f6bed;
			}
		}

		& .radius {
			width: 3rem;
			height: 3rem;
			border: 1px solid #4f6bed;
			background-color: #4f6bed22;
		}
	}
</style>
