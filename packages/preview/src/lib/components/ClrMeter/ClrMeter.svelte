<script lang="ts">
	import type { Oklch } from 'culori';
	import { oklchToCss } from '@three-forma-styli/core';

	export interface ClrMeterFlag {
		id: string;
		label: string;
		value: number; // Position (0-1 for L, 0-0.5 for C, 0-360 for H)
		draggable: boolean;
		intent: 'primary' | 'secondary';
		clrway?: 'negative';
		position: 'header' | 'footer';
		constraintType?: 'min' | 'max'; // For non-draggable footer flags
		ondrag?: (newValue: number) => void;
	}

	interface Props {
		channel: 'l' | 'c' | 'h';
		color: Oklch;
		flags: ClrMeterFlag[];
		showHandle?: boolean;
		enforceBounds?: boolean;
		pageBackgroundLuminance?: number; // For auto-contrast calculation
	}

	let {
		channel,
		color,
		flags,
		showHandle = true,
		enforceBounds = false,
		pageBackgroundLuminance = 0.5,
	}: Props = $props();

	// Helper: Get max value for channel
	function getMaxValue(ch: 'l' | 'c' | 'h'): number {
		if (ch === 'l') return 1;
		if (ch === 'c') return 0.5;
		return 360;
	}

	// Helper: Convert value to percentage
	function valueToPercent(value: number, ch: 'l' | 'c' | 'h'): number {
		const percent = (value / getMaxValue(ch)) * 100;
		// Clamp to 0-100% to prevent overflow
		return Math.max(0, Math.min(100, percent));
	}

	// Helper: Convert percentage to value
	function percentToValue(percent: number, ch: 'l' | 'c' | 'h'): number {
		return (percent / 100) * getMaxValue(ch);
	}

	// Helper: Generate gradient
	function getGradient(ch: 'l' | 'c' | 'h', clr: Oklch): string {
		if (ch === 'l') {
			// Use multiple stops to show more color throughout the gradient
			const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
				.map((l) => oklchToCss({ mode: 'oklch', l, c: clr.c, h: clr.h }))
				.join(', ');
			return `linear-gradient(to right, ${stops})`;
		}
		if (ch === 'c') {
			// Use multiple stops for smooth chroma gradient
			const stops = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]
				.map((c) => oklchToCss({ mode: 'oklch', l: clr.l, c, h: clr.h }))
				.join(', ');
			return `linear-gradient(to right, ${stops})`;
		}
		// Hue: multiple stops for accuracy
		const stops = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
			.map((h) => oklchToCss({ mode: 'oklch', l: clr.l, c: clr.c, h }))
			.join(', ');
		return `linear-gradient(to right, ${stops})`;
	}

	// Reactive gradient
	let gradient = $derived(getGradient(channel, color));

	// Reactive flags with positioning
	let headerFlags = $derived(flags.filter((f) => f.position === 'header'));
	let footerFlags = $derived(flags.filter((f) => f.position === 'footer'));

	// Handle position (first draggable header flag, or fallback)
	let handleFlag = $derived(flags.find((f) => f.draggable && f.position === 'header'));
	let handlePercent = $derived(handleFlag ? valueToPercent(handleFlag.value, channel) : 80);

	// Helper: Get current color (for handle background)
	function getCurrentColor(ch: 'l' | 'c' | 'h', clr: Oklch, value: number): string {
		if (ch === 'l') {
			return oklchToCss({ mode: 'oklch', l: value, c: clr.c, h: clr.h });
		}
		if (ch === 'c') {
			return oklchToCss({ mode: 'oklch', l: clr.l, c: value, h: clr.h });
		}
		return oklchToCss({ mode: 'oklch', l: clr.l, c: clr.c, h: value });
	}

	// Reactive handle color (must come after handleFlag)
	let handleColor = $derived(
		handleFlag ? getCurrentColor(channel, color, handleFlag.value) : 'white'
	);

	// Smart border color for handle (black or white based on luminance)
	let handleBorderColor = $derived.by(() => {
		if (!handleFlag) return 'black';
		// In OKLCH, luminance > 0.5 means lighter, use black border
		const lum = channel === 'l' ? handleFlag.value : color.l;
		return lum > 0.5 ? 'black' : 'white';
	});

	// Auto-contrast color for flags (black or white based on PAGE background luminance)
	let autoContrastColor = $derived(pageBackgroundLuminance > 0.5 ? 'black' : 'white');

	// Check if a specific flag is being violated (derived helper function)
	let isFlagViolated = $derived.by(() => {
		return (flag: ClrMeterFlag): boolean => {
			if (!handleFlag || flag.draggable) return false;

			if (flag.constraintType === 'min' && handleFlag.value < flag.value) {
				return true;
			}
			if (flag.constraintType === 'max' && handleFlag.value > flag.value) {
				return true;
			}

			return false;
		};
	});

	// Check if there's a constraint violation
	let hasViolation = $derived.by(() => {
		if (!handleFlag) return false;

		// Check footer flags for constraint violations
		for (const constraint of footerFlags) {
			if (constraint.draggable) continue;

			if (constraint.constraintType === 'min' && handleFlag.value < constraint.value) {
				return true;
			}
			if (constraint.constraintType === 'max' && handleFlag.value > constraint.value) {
				return true;
			}
		}

		return false;
	});

	// Calculate overlay position and width for precluded area
	let overlayStyle = $derived.by(() => {
		if (!handleFlag || !hasViolation) return 'display: none;';

		// Check footer flags for violated constraints
		for (const constraint of footerFlags) {
			if (constraint.draggable) continue;

			// Min constraint violation: show 0% to constraint position
			if (constraint.constraintType === 'min' && handleFlag.value < constraint.value) {
				const width = valueToPercent(constraint.value, channel);
				return `left: 0; width: ${width}%; border-right: var(--bdw) solid var(--clr-negative);`;
			}

			// Max constraint violation: show constraint position to 100%
			if (constraint.constraintType === 'max' && handleFlag.value > constraint.value) {
				const left = valueToPercent(constraint.value, channel);
				const width = 100 - left;
				return `left: ${left}%; width: ${width}%; border-left: var(--bdw) solid var(--clr-negative);`;
			}
		}

		return 'display: none;';
	});

	// Drag state
	let isDragging = $state(false);
	let dragTarget = $state<string | 'handle' | null>(null);
	let meterElement: HTMLDivElement | null = $state(null);

	// Drag handlers
	function handlePointerDown(e: PointerEvent, target: string | 'handle', flag?: ClrMeterFlag) {
		if (target === 'handle' && !showHandle) return;
		if (flag && !flag.draggable) return;

		isDragging = true;
		dragTarget = target;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || !meterElement) return;

		const rect = meterElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
		let value = percentToValue(percent, channel);

		// Optional: enforce bounds from footer flags
		if (enforceBounds) {
			for (const constraint of footerFlags) {
				if (constraint.draggable) continue;

				if (constraint.constraintType === 'min' && value < constraint.value) {
					value = constraint.value;
				}
				if (constraint.constraintType === 'max' && value > constraint.value) {
					value = constraint.value;
				}
			}
		}

		// Call appropriate ondrag handler
		if (dragTarget === 'handle' && handleFlag?.ondrag) {
			handleFlag.ondrag(value);
		} else if (dragTarget) {
			const flag = flags.find((f) => f.id === dragTarget);
			if (flag?.ondrag) {
				flag.ondrag(value);
			}
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		dragTarget = null;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	// Meter click handler (for direct clicks on gradient)
	function handleMeterClick(e: PointerEvent) {
		if (!meterElement || !handleFlag?.ondrag) return;

		const rect = meterElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
		let value = percentToValue(percent, channel);

		if (enforceBounds) {
			for (const constraint of footerFlags) {
				if (constraint.draggable) continue;

				if (constraint.constraintType === 'min' && value < constraint.value) {
					value = constraint.value;
				}
				if (constraint.constraintType === 'max' && value > constraint.value) {
					value = constraint.value;
				}
			}
		}

		handleFlag.ondrag(value);
	}
</script>

<!-- MARKUP -------------------------------------------- -->
<div class="host clr-meter">
	<header>
		{#each headerFlags as flag}
			{@const percent = valueToPercent(flag.value, channel)}
			{@const flipBody = percent > 50}
			{#if flag.draggable}
				<div
					class="flag is--interactive intent--{flag.intent} {flag.clrway
						? `clrway--${flag.clrway}`
						: ''}"
					style="--loc-left: {percent}%"
					data-auto-contrast={autoContrastColor}
					role="slider"
					aria-valuenow={flag.value}
					aria-valuemin={0}
					aria-valuemax={getMaxValue(channel)}
					tabindex="0"
					onpointerdown={(e) => handlePointerDown(e, flag.id, flag)}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
				>
					<div class="body" data-flip-body={flipBody}>
						<span>{flag.label}</span>
					</div>
					<div class="line"></div>
				</div>
			{:else}
				<div
					class="flag intent--{flag.intent} {flag.clrway ? `clrway--${flag.clrway}` : ''}"
					style="--loc-left: {percent}%"
					data-auto-contrast={autoContrastColor}
				>
					<div class="body" data-flip-body={flipBody}>
						<span>{flag.label}</span>
					</div>
					<div class="line"></div>
				</div>
			{/if}
		{/each}
	</header>

	<div
		class="meter"
		class:has-violation={hasViolation}
		bind:this={meterElement}
		style="--loc-gradient: {gradient}"
		onpointerdown={handleMeterClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleMeterClick(e as any);
			}
		}}
		role="slider"
		aria-valuenow={handleFlag?.value ?? 0}
		aria-valuemin={0}
		aria-valuemax={getMaxValue(channel)}
		tabindex="0"
	>
		<div class="overlay" style={overlayStyle}></div>
		{#if showHandle}
			<div
				class="handle"
				style="--loc-left: {handlePercent}%; --loc-clr-bg: {handleColor}; --loc-clr-border: {handleBorderColor};"
				onpointerdown={(e) => handlePointerDown(e, 'handle')}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
			></div>
		{/if}
	</div>

	<footer>
		{#each footerFlags as flag}
			{@const percent = valueToPercent(flag.value, channel)}
			{@const flipBody = percent > 50}
			{@const isViolated = isFlagViolated(flag)}
			{@const effectiveIntent = isViolated ? 'primary' : flag.intent}
			{#if flag.draggable}
				<div
					class="flag is--interactive intent--{effectiveIntent} {flag.clrway
						? `clrway--${flag.clrway}`
						: ''}"
					style="--loc-left: {percent}%"
					data-auto-contrast={autoContrastColor}
					role="slider"
					aria-valuenow={flag.value}
					aria-valuemin={0}
					aria-valuemax={getMaxValue(channel)}
					tabindex="0"
					onpointerdown={(e) => handlePointerDown(e, flag.id, flag)}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
				>
					<div class="body" data-flip-body={flipBody}>
						<span>{flag.label}</span>
					</div>
					<div class="line"></div>
				</div>
			{:else}
				<div
					class="flag intent--{effectiveIntent} {flag.clrway ? `clrway--${flag.clrway}` : ''}"
					style="--loc-left: {percent}%"
					data-auto-contrast={autoContrastColor}
				>
					<div class="body" data-flip-body={flipBody}>
						<span>{flag.label}</span>
					</div>
					<div class="line"></div>
				</div>
			{/if}
		{/each}
	</footer>
</div>

<!-- CSS ----------------------------------------------- -->
<style>
	.host {
		--loc-size--meter: var(--sp-2);
		--loc-size--aux: var(--sp-4);
		display: flex;
		flex-direction: column;

		/* METER ------------------------------------------------ */
		.meter {
			height: var(--loc-size--meter);
			position: relative;
			overflow: hidden;
			display: flex;
			align-items: center;
			border: var(--bdw) solid var(--loc-clr-meter-border, var(--clr-neutral));
			border-radius: var(--bdr-min);
			background-image: var(--loc-gradient);

			&.has-violation {
				border-color: var(--clr-negative);
			}

			/* HANDLE ----------------------------------------------- */
			& > .handle {
				width: calc(var(--loc-size--meter) / 2);
				height: calc(var(--loc-size--meter) / 2);
				position: absolute;
				left: var(--loc-left);
				background-color: var(--loc-clr-bg);
				border: var(--bdw) solid var(--loc-clr-border);
				transform: translateX(-50%) rotate(45deg);
				cursor: grab;

				&:hover {
					transform: translateX(-50%) rotate(45deg) scale(1);
				}

				&:active {
					cursor: grabbing;
				}
			}

			/* OVERLAY ---------------------------------------------- */
			& > .overlay {
				position: absolute;
				top: 0;
				bottom: 0;
				background-color: var(--clr-negative-a-hi);
			}
		}

		/* HEADER/FOOTER ---------------------------------------- */
		header,
		footer {
			--loc-size--flag: var(--sp-2);
			--loc-size--line: var(--sp-1);
			height: calc(var(--loc-size--flag) + var(--loc-size--line));
			position: relative;

			& > .flag {
				position: absolute;
				left: var(--loc-left);
				display: flex;
				flex-direction: column;

				/* Auto-contrast: black on light backgrounds */
				&[data-auto-contrast='black'] {
					&.intent--primary {
						--loc-clr-bg: black;
						--loc-clr-border: black;
						--loc-clr-ink: white;
						&.clrway--negative {
							--loc-clr-bg: var(--clr-negative);
							--loc-clr-border: var(--clr-negative);
							--loc-clr-ink: black;
						}
					}
					&.intent--secondary {
						--loc-clr-bg: transparent;
						--loc-clr-border: black;
						--loc-clr-ink: black;
						&.clrway--negative {
							--loc-clr-border: var(--clr-negative);
							--loc-clr-ink: var(--clr-negative);
						}
					}
				}

				/* Auto-contrast: white on dark backgrounds */
				&[data-auto-contrast='white'] {
					&.intent--primary {
						--loc-clr-bg: white;
						--loc-clr-border: white;
						--loc-clr-ink: black;
						&.clrway--negative {
							--loc-clr-bg: var(--clr-negative);
							--loc-clr-border: var(--clr-negative);
							--loc-clr-ink: black;
						}
					}
					&.intent--secondary {
						--loc-clr-bg: transparent;
						--loc-clr-border: white;
						--loc-clr-ink: white;
						&.clrway--negative {
							--loc-clr-border: var(--clr-negative);
							--loc-clr-ink: var(--clr-negative);
						}
					}
				}

				&.is--interactive {
					cursor: grab;

					&:active {
						cursor: grabbing;
					}
				}

				footer & {
					flex-direction: column-reverse;
				}

				& > .body {
					height: var(--loc-size--flag);
					width: fit-content;
					padding: 0 var(--sp-min);
					display: flex;
					justify-content: center;
					align-items: center;
					background-color: var(--loc-clr-bg);
					border: var(--bdw) solid var(--loc-clr-border);
					white-space: nowrap;

					&[data-flip-body='true'] {
						transform: translateX(calc(-100% + var(--bdw)));
					}

					& > span {
						color: var(--loc-clr-ink);
						font-size: var(--fs-1);
						font-weight: bold;
					}
				}

				& > .line {
					height: var(--loc-size--line);
					width: 100%;
					border-left: var(--bdw) solid var(--loc-clr-border);
				}
			}
		}
	}
</style>
