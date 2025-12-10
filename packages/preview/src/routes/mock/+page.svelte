<script lang="ts">
	import { type ClrMeterFlag } from '$lib/components/ClrMeter';
	import { ClrInputSection } from '$lib/components/ClrInputSection';
	import { getContext } from 'svelte';
	import { type DesignSystem, validateLuminance } from '@three-forma-styli/core';

	let designSystem = getContext<DesignSystem>('designSystem');

	// Get color tokens
	let colorTokens = $derived(designSystem.colors.modes[0].tokens);
	let primaryColor = $derived(colorTokens.primary);
	let bgColor = $derived(colorTokens.bg);
	let evColor = $derived(colorTokens.ev);
	let inkColor = $derived(colorTokens.ink);
	let neutralColor = $derived(colorTokens.neutral);

	// Constraint configuration (user-adjustable)
	let constraintPolarity = $state<'negative' | 'positive'>('negative');
	let minDelta = $state(0.4);

	// Define which colors belong to which group for validation
	const backgroundColorKeys = ['bg', 'ev'];
	const foregroundColorKeys = ['primary', 'neutral', 'ink'];

	// Calculate minimum valid luminance
	let validation = $derived(
		validateLuminance(
			{
				bg: colorTokens.bg,
				ev: colorTokens.ev,
				primary: colorTokens.primary,
				neutral: colorTokens.neutral,
				ink: colorTokens.ink,
			},
			{
				polarity: constraintPolarity,
				minDelta: minDelta,
				backgroundColors: backgroundColorKeys,
				foregroundColors: foregroundColorKeys,
			}
		)
	);

	// Input values (for number inputs)
	let primaryL = $state(0);
	let primaryC = $state(0);
	let primaryH = $state(0);
	let bgL = $state(0);
	let bgC = $state(0);
	let bgH = $state(0);
	let evL = $state(0);
	let evC = $state(0);
	let evH = $state(0);
	let inkL = $state(0);
	let inkC = $state(0);
	let inkH = $state(0);
	let neutralL = $state(0);
	let neutralC = $state(0);
	let neutralH = $state(0);

	// Sync input values with color changes from meter
	$effect(() => {
		if (primaryColor) {
			primaryL = primaryColor.l;
			primaryC = primaryColor.c;
			primaryH = primaryColor.h || 0;
		}
	});

	$effect(() => {
		if (bgColor) {
			bgL = bgColor.l;
			bgC = bgColor.c;
			bgH = bgColor.h || 0;
		}
	});

	$effect(() => {
		if (evColor) {
			evL = evColor.l;
			evC = evColor.c;
			evH = evColor.h || 0;
		}
	});

	$effect(() => {
		if (inkColor) {
			inkL = inkColor.l;
			inkC = inkColor.c;
			inkH = inkColor.h || 0;
		}
	});

	$effect(() => {
		if (neutralColor) {
			neutralL = neutralColor.l;
			neutralC = neutralColor.c;
			neutralH = neutralColor.h || 0;
		}
	});

	// Update from input changes
	$effect(() => {
		designSystem.colors.modes[0].tokens.primary = {
			mode: 'oklch',
			l: primaryL,
			c: primaryC,
			h: primaryH,
		};
	});

	$effect(() => {
		designSystem.colors.modes[0].tokens.bg = {
			mode: 'oklch',
			l: bgL,
			c: bgC,
			h: bgH,
		};
	});

	$effect(() => {
		designSystem.colors.modes[0].tokens.ev = {
			mode: 'oklch',
			l: evL,
			c: evC,
			h: evH,
		};
	});

	$effect(() => {
		designSystem.colors.modes[0].tokens.ink = {
			mode: 'oklch',
			l: inkL,
			c: inkC,
			h: inkH,
		};
	});

	$effect(() => {
		designSystem.colors.modes[0].tokens.neutral = {
			mode: 'oklch',
			l: neutralL,
			c: neutralC,
			h: neutralH,
		};
	});

	// Update color handlers (for meter drag)
	function updatePrimaryLuminance(newL: number) {
		primaryL = Math.round(newL * 100) / 100;
	}

	function updatePrimaryChroma(newC: number) {
		primaryC = Math.round(newC * 100) / 100;
	}

	function updatePrimaryHue(newH: number) {
		primaryH = Math.round(newH);
	}

	function updateBgLuminance(newL: number) {
		bgL = Math.round(newL * 100) / 100;
	}

	function updateBgChroma(newC: number) {
		bgC = Math.round(newC * 100) / 100;
	}

	function updateBgHue(newH: number) {
		bgH = Math.round(newH);
	}

	function updateEvLuminance(newL: number) {
		evL = Math.round(newL * 100) / 100;
	}

	function updateEvChroma(newC: number) {
		evC = Math.round(newC * 100) / 100;
	}

	function updateEvHue(newH: number) {
		evH = Math.round(newH);
	}

	function updateInkLuminance(newL: number) {
		inkL = Math.round(newL * 100) / 100;
	}

	function updateInkChroma(newC: number) {
		inkC = Math.round(newC * 100) / 100;
	}

	function updateInkHue(newH: number) {
		inkH = Math.round(newH);
	}

	function updateNeutralLuminance(newL: number) {
		neutralL = Math.round(newL * 100) / 100;
	}

	function updateNeutralChroma(newC: number) {
		neutralC = Math.round(newC * 100) / 100;
	}

	function updateNeutralHue(newH: number) {
		neutralH = Math.round(newH);
	}

	// Flags for luminance meter
	let lumFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'primary',
			label: 'PRI-L',
			value: primaryColor?.l ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updatePrimaryLuminance,
		},
		{
			id: 'constraint',
			label: validation.foregroundConstraintType.toUpperCase(),
			value: validation.foregroundConstraint,
			draggable: false,
			intent: 'secondary',
			clrway: 'negative',
			position: 'footer',
			constraintType: validation.foregroundConstraintType,
		},
	]);

	// Flags for chroma meter
	let chromaFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'primary',
			label: 'PRI-C',
			value: primaryColor?.c ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updatePrimaryChroma,
		},
	]);

	// Flags for hue meter
	let hueFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'primary',
			label: 'PRI-H',
			value: primaryColor?.h ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updatePrimaryHue,
		},
	]);

	// Flags for bg color
	let bgLumFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'bg',
			label: 'BG-L',
			value: bgColor?.l ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateBgLuminance,
		},
		{
			id: 'constraint',
			label: validation.backgroundConstraintType.toUpperCase(),
			value: validation.backgroundConstraint,
			draggable: false,
			intent: 'secondary',
			clrway: 'negative',
			position: 'footer',
			constraintType: validation.backgroundConstraintType,
		},
	]);

	let bgChromaFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'bg',
			label: 'BG-C',
			value: bgColor?.c ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateBgChroma,
		},
	]);

	let bgHueFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'bg',
			label: 'BG-H',
			value: bgColor?.h ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateBgHue,
		},
	]);

	// Flags for ev color
	let evLumFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ev',
			label: 'EV-L',
			value: evColor?.l ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateEvLuminance,
		},
		{
			id: 'constraint',
			label: validation.backgroundConstraintType.toUpperCase(),
			value: validation.backgroundConstraint,
			draggable: false,
			intent: 'secondary',
			clrway: 'negative',
			position: 'footer',
			constraintType: validation.backgroundConstraintType,
		},
	]);

	let evChromaFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ev',
			label: 'EV-C',
			value: evColor?.c ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateEvChroma,
		},
	]);

	let evHueFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ev',
			label: 'EV-H',
			value: evColor?.h ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateEvHue,
		},
	]);

	// Flags for ink color
	let inkLumFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ink',
			label: 'INK-L',
			value: inkColor?.l ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateInkLuminance,
		},
		{
			id: 'constraint',
			label: validation.foregroundConstraintType.toUpperCase(),
			value: validation.foregroundConstraint,
			draggable: false,
			intent: 'secondary',
			clrway: 'negative',
			position: 'footer',
			constraintType: validation.foregroundConstraintType,
		},
	]);

	let inkChromaFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ink',
			label: 'INK-C',
			value: inkColor?.c ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateInkChroma,
		},
	]);

	let inkHueFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'ink',
			label: 'INK-H',
			value: inkColor?.h ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateInkHue,
		},
	]);

	// Flags for neutral color
	let neutralLumFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'neutral',
			label: 'NEU-L',
			value: neutralColor?.l ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateNeutralLuminance,
		},
		{
			id: 'constraint',
			label: validation.foregroundConstraintType.toUpperCase(),
			value: validation.foregroundConstraint,
			draggable: false,
			intent: 'secondary',
			clrway: 'negative',
			position: 'footer',
			constraintType: validation.foregroundConstraintType,
		},
	]);

	let neutralChromaFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'neutral',
			label: 'NEU-C',
			value: neutralColor?.c ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateNeutralChroma,
		},
	]);

	let neutralHueFlags = $derived<ClrMeterFlag[]>([
		{
			id: 'neutral',
			label: 'NEU-H',
			value: neutralColor?.h ?? 0,
			draggable: true,
			intent: 'primary',
			position: 'header',
			ondrag: updateNeutralHue,
		},
	]);

	// Smart meter border color (black or white based on bg luminance)
	let meterBorderColor = $derived.by(() => {
		if (!bgColor) return 'white';
		// In OKLCH, luminance > 0.5 means lighter, use black border
		return bgColor.l > 0.5 ? 'black' : 'white';
	});
</script>

<!-- MARKUP -------------------------------------------- -->
<section id="section--clr-builder">
	<section id="section--controls" style="--loc-clr-meter-border: {meterBorderColor}">
		<!-- Row 1: Primary (solo) -->
		<div class="row">
			<ClrInputSection
				name="primary"
				color={primaryColor ?? { mode: 'oklch', l: 0, c: 0, h: 0 }}
				bind:lValue={primaryL}
				bind:cValue={primaryC}
				bind:hValue={primaryH}
				{lumFlags}
				{chromaFlags}
				{hueFlags}
				hint={`${validation.foregroundConstraintType.toUpperCase()}: ${validation.foregroundConstraint.toFixed(2)}`}
				pageBackgroundLuminance={bgColor?.l ?? 0}
			/>
		</div>

		<!-- Row 2: BG + EV -->
		<div class="row">
			<ClrInputSection
				name="bg"
				color={bgColor ?? { mode: 'oklch', l: 0, c: 0, h: 0 }}
				bind:lValue={bgL}
				bind:cValue={bgC}
				bind:hValue={bgH}
				lumFlags={bgLumFlags}
				chromaFlags={bgChromaFlags}
				hueFlags={bgHueFlags}
				hint={`${validation.backgroundConstraintType.toUpperCase()}: ${validation.backgroundConstraint.toFixed(2)}`}
				pageBackgroundLuminance={bgColor?.l ?? 0}
			/>
			<ClrInputSection
				name="ev"
				color={evColor ?? { mode: 'oklch', l: 0, c: 0, h: 0 }}
				bind:lValue={evL}
				bind:cValue={evC}
				bind:hValue={evH}
				lumFlags={evLumFlags}
				chromaFlags={evChromaFlags}
				hueFlags={evHueFlags}
				hint={`${validation.backgroundConstraintType.toUpperCase()}: ${validation.backgroundConstraint.toFixed(2)}`}
				pageBackgroundLuminance={bgColor?.l ?? 0}
			/>
		</div>

		<!-- Row 3: Ink + Neutral -->
		<div class="row">
			<ClrInputSection
				name="ink"
				color={inkColor ?? { mode: 'oklch', l: 0, c: 0, h: 0 }}
				bind:lValue={inkL}
				bind:cValue={inkC}
				bind:hValue={inkH}
				lumFlags={inkLumFlags}
				chromaFlags={inkChromaFlags}
				hueFlags={inkHueFlags}
				hint={`${validation.foregroundConstraintType.toUpperCase()}: ${validation.foregroundConstraint.toFixed(2)}`}
				pageBackgroundLuminance={bgColor?.l ?? 0}
			/>
			<ClrInputSection
				name="neutral"
				color={neutralColor ?? { mode: 'oklch', l: 0, c: 0, h: 0 }}
				bind:lValue={neutralL}
				bind:cValue={neutralC}
				bind:hValue={neutralH}
				lumFlags={neutralLumFlags}
				chromaFlags={neutralChromaFlags}
				hueFlags={neutralHueFlags}
				hint={`${validation.foregroundConstraintType.toUpperCase()}: ${validation.foregroundConstraint.toFixed(2)}`}
				pageBackgroundLuminance={bgColor?.l ?? 0}
			/>
		</div>

		<!-- Constraint Settings (Temporary) -->
		<div class="constraint-settings">
			<h3>Constraint Settings (Temporary)</h3>

			<div>
				<label>
					Polarity:
					<select bind:value={constraintPolarity}>
						<option value="negative">Negative (dark backgrounds)</option>
						<option value="positive">Positive (light backgrounds)</option>
					</select>
				</label>
			</div>

			<div>
				<label>
					Min Luminance Delta:
					<input type="number" min="0" max="1" step="0.01" bind:value={minDelta} />
					<input type="range" min="0" max="1" step="0.01" bind:value={minDelta} />
					<span>{minDelta.toFixed(2)}</span>
				</label>
			</div>

			<div>
				<p>Current constraints:</p>
				<pre>
Polarity: {constraintPolarity}
Min Delta: {minDelta.toFixed(2)}

Background {validation.backgroundConstraintType.toUpperCase()}: {validation.backgroundConstraint.toFixed(4)}
Foreground {validation.foregroundConstraintType.toUpperCase()}: {validation.foregroundConstraint.toFixed(4)}
Actual Delta: {validation.actualDelta.toFixed(4)}
Valid: {validation.deltaValid ? 'YES' : 'NO'}
				</pre>
			</div>
		</div>
	</section>

	<section id="section--preview">
		<!-- Mock UI will be built here -->
	</section>
</section>

<!-- CSS ----------------------------------------------- -->
<style>
	section#section--clr-builder {
		min-height: 100vh;
		display: grid;
		grid-template-columns: repeat(12, 1fr);

		/* SECTION: Controls ------------------------------------ */
		section#section--controls {
			container-type: inline-size;
			--loc-grid-cols: 12;
			height: 100%;
			grid-column: span var(--loc-grid-cols);
			display: flex;
			flex-direction: column;
			border-right: var(--bdw) solid var(--clr-neutral-a-min);

			/* ROW -------------------------------------------------- */
			& > .row {
				display: grid;
				grid-template-columns: repeat(12, 1fr);
				border-bottom: var(--bdw) solid var(--clr-neutral-a-min);
			}

			/* CONSTRAINT SETTINGS ---------------------------------- */
			& > .constraint-settings {
				padding: var(--gap-l);
				border-top: var(--bdw) solid var(--clr-neutral-a-min);
				display: flex;
				flex-direction: column;
				gap: var(--gap-s);
			}
		}
	}
</style>
