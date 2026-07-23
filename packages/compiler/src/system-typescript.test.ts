import { describe, expect, it } from 'vitest';
import { generate, oklch, type PartialDesignSystem } from '@three-forma-styli/core';
import { generateProjectSystemTypescript, projectSystemContract } from './system-typescript.js';

describe('project system TypeScript contract', () => {
	it('preserves authored modes and simultaneous time scales as separate contracts', () => {
		const system = {
			colors: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						metadata: { label: 'Default', polarity: 'negative' },
						tokens: { bg: oklch(0.2, 0, 0) },
					},
					{
						name: 'light',
						metadata: { label: 'Light', polarity: 'positive' },
						tokens: { bg: oklch(0.98, 0.01, 90) },
					},
				],
			},
			time: {
				scales: [
					{
						name: 'interaction',
						isDefault: true,
						metadata: { label: 'Interaction' },
						tokens: { unit: 'ms', base: 100, min: 50, range: 2 },
					},
					{
						name: 'ambient',
						tokens: { unit: 'ms', base: 1000, min: 500, range: 2 },
					},
				],
			},
		} satisfies PartialDesignSystem;
		const contract = projectSystemContract(system, generate(system));

		expect(contract.modes.color.entries.light.metadata).toEqual({
			label: 'Light',
			polarity: 'positive',
		});
		expect(contract.modes.color.entries.light.systems.colors).toMatchObject({
			bg: { mode: 'oklch', l: 0.98, c: 0.01, h: 90 },
		});
		expect(contract.modes.color.entries.light.resolvedTokens['clr-bg']).toContain('oklch(');
		expect(contract.scales.time.default).toBe('interaction');
		expect(contract.scales.time.entries.interaction.metadata).toEqual({
			label: 'Interaction',
		});
		expect(contract.scales.time.entries.interaction.resolvedTokens).toEqual({
			't-1': '100ms',
			't-2': '200ms',
			't-min': '50ms',
		});
		expect(contract.scales.time.entries.ambient.resolvedTokens).toEqual({
			't-ambient-1': '1000ms',
			't-ambient-2': '2000ms',
			't-ambient-min': '500ms',
		});
		expect(generateProjectSystemTypescript(system, generate(system))).toContain(
			'export type TfsColorMode'
		);
		expect(generateProjectSystemTypescript(system, generate(system))).toContain(
			'export type TfsTimeScale'
		);
	});
});
