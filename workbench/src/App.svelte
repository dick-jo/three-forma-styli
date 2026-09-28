<script lang="ts">
	import { onMount } from 'svelte';
	import { Changes } from './lib/changes.svelte';
	import ChangesTray from './lib/ChangesTray.svelte';
	import { Live } from './lib/live.svelte';
	import ModeBar from './lib/ModeBar.svelte';
	import Problems from './lib/Problems.svelte';
	import ColorSection from './sections/ColorSection.svelte';
	import MotionSection from './sections/MotionSection.svelte';
	import ShadowSection from './sections/ShadowSection.svelte';
	import SpacingSection from './sections/SpacingSection.svelte';
	import TypeSection from './sections/TypeSection.svelte';

	const live = new Live();
	const changes = new Changes();
	let selection = $state<Record<string, string | undefined>>({});
	let preview = $state<HTMLElement>();
	/** Changes after the DOM reflects new CSS, modes or tweaks, so computed values are re-read. */
	let readStamp = $state(0);

	let data = $derived(live.data);
	let attributes = $derived(
		Object.fromEntries(
			(data?.axes ?? []).flatMap((axis) =>
				selection[axis.name] ? [[axis.attribute, selection[axis.name]]] : []
			)
		)
	);
	let viewing = $derived(
		Object.entries(selection)
			.flatMap(([axis, mode]) => (mode ? [`${axis} ${mode}`] : []))
			.join(', ') || 'ordinary'
	);
	let overrides = $derived(
		Object.entries(changes.vars)
			.map(([token, value]) => `--${token}: ${value}`)
			.join('; ')
	);

	onMount(() => live.connect());

	$effect(() => {
		void [live.stamp, attributes, overrides];
		readStamp = performance.now();
	});

	// Tweaks also apply at :root, so tokens declared there (and everything referring to them) follow.
	$effect(() => {
		const root = document.documentElement;
		const vars = changes.vars;
		for (const [token, value] of Object.entries(vars)) root.style.setProperty(`--${token}`, value);
		return () => Object.keys(vars).forEach((token) => root.style.removeProperty(`--${token}`));
	});
</script>

<main class="host workbench">
	<header>
		<h1>Three Forma Styli</h1>
		{#if data}
			<ModeBar axes={data.axes} bind:selection />
		{/if}
	</header>
	{#if data}
		<Problems problems={data.problems} />
		<div class="preview" bind:this={preview} {...attributes} style={overrides}>
			{#if data.colors.length}
				<ColorSection
					colors={data.colors}
					contrast={data.contrast}
					{preview}
					{readStamp}
					{changes}
					{viewing}
				/>
			{/if}
			{#if data.spacing}
				<SpacingSection
					spacing={data.spacing}
					gap={data.gap}
					radius={data.radius}
					width={data.width}
					{preview}
					{readStamp}
					{changes}
					{viewing}
				/>
			{/if}
			{#if data.shadows.length}
				<ShadowSection shadows={data.shadows} />
			{/if}
			{#if data.easings.length || data.time.length}
				<MotionSection time={data.time} easings={data.easings} {preview} {readStamp} />
			{/if}
			{#if data.roles.length || data.fonts.length}
				<TypeSection
					roles={data.roles}
					fonts={data.fonts}
					{preview}
					{readStamp}
					{changes}
					{viewing}
				/>
			{/if}
		</div>
	{:else}
		<p>Waiting for tfs dev…</p>
	{/if}
	<ChangesTray {changes} />
</main>

<style>
	:global(body) {
		margin: 0;
		background-color: #f4f4f2;
	}

	.host.workbench {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.5rem 2rem 12rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: #222;
		font:
			0.875rem/1.5 system-ui,
			sans-serif;

		& > header {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;

			& > h1 {
				margin: 0;
				font:
					600 1rem system-ui,
					sans-serif;
			}
		}

		& > .preview {
			padding: 0 1.5rem;
			background-color: #fff;
			border-radius: 0.75rem;
		}
	}
</style>
