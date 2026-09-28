<script lang="ts">
	import type { WorkbenchData } from 'three-forma-styli';
	import type { Changes } from '../lib/changes.svelte';
	import Section from '../lib/Section.svelte';
	import TypeRow from './TypeRow.svelte';

	interface Props {
		roles: WorkbenchData['roles'];
		fonts: WorkbenchData['fonts'];
		preview: HTMLElement | undefined;
		readStamp: number;
		changes: Changes;
		viewing: string;
	}

	let { roles, fonts, preview, readStamp, changes, viewing }: Props = $props();
	/** Style and weight classes chosen per role, to preview explicit choices. */
	let chosen = $state<Record<string, string[]>>({});

	function toggle(role: string, className: string, group: readonly { className: string }[]) {
		const others = (chosen[role] ?? []).filter((c) => !group.some((g) => g.className === c));
		chosen[role] = chosen[role]?.includes(className) ? others : [...others, className];
	}
</script>

<Section title="Typography">
	{#each fonts as font (font.id)}
		<p class="font">{font.id}: {font.faces.join(' · ')}</p>
	{/each}
	{#each roles as role (role.name)}
		<div class="role">
			<header>
				<h3>{role.name}</h3>
				{#each [role.styles, role.weights] as group, index (index)}
					{#if group.length > 1}
						<span class="choices">
							{#each group as choice (choice.className)}
								<button
									type="button"
									data-is-active={chosen[role.name]?.includes(choice.className)}
									onclick={() => toggle(role.name, choice.className, group)}>{choice.name}</button
								>
							{/each}
						</span>
					{/if}
				{/each}
			</header>
			{#each role.rows as row (row.size)}
				<TypeRow
					role={role.name}
					{row}
					choices={chosen[role.name] ?? []}
					{preview}
					{readStamp}
					{changes}
					{viewing}
				/>
			{/each}
		</div>
	{/each}
</Section>

<style>
	.font {
		margin: 0;
		color: #666;
		font:
			0.75rem ui-monospace,
			monospace;
	}

	.role {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		& > header {
			display: flex;
			align-items: center;
			gap: 1rem;

			& > h3 {
				margin: 0;
				font:
					600 0.8125rem system-ui,
					sans-serif;
			}
		}
	}

	.choices {
		display: flex;
		gap: 0.25rem;

		& > button {
			--loc-clr-bg: transparent;

			&[data-is-active='true'] {
				--loc-clr-bg: #4f6bed22;
			}

			padding: 0.15rem 0.5rem;
			background-color: var(--loc-clr-bg);
			border: 1px solid #0002;
			border-radius: 999px;
			font:
				0.6875rem ui-monospace,
				monospace;
			cursor: pointer;
		}
	}
</style>
