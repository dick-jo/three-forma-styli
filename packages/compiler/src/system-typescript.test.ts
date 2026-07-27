import { describe, expect, it } from 'vitest';
import { generate, oklch, type PartialDesignSystem } from '@three-forma-styli/core';
import { generateProjectSystemTypescript, projectSystemContract } from './system-typescript.js';

describe('project system TypeScript contract', () => {
	it('preserves authored modes and simultaneous time scales as separate contracts', () => {
		const system = {
			colors: {
				alphaSchedule: { min: 0.08 },
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
			motion: {
				easings: { standard: [0.2, 0, 0.38, 0.9] },
				recipes: {
					hover: {
						base: { duration: 1, easing: 'standard' },
						variants: { max: { duration: { scale: 'ambient', step: 2 } } },
						reducedMotion: { base: { duration: 0, delay: 0 } },
					},
				},
			},
			shadows: {
				unit: 'px',
				box: {
					elevation: {
						base: [{ x: 0, y: 4, blur: 12, color: { color: 'bg', alpha: 'min' } }],
					},
				},
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
		expect(contract.motion?.recipes.hover?.base.duration).toMatchObject({
			token: 't-1',
			milliseconds: 100,
			seconds: 0.1,
		});
		expect(contract.motion?.recipes.hover?.variants.max?.duration).toMatchObject({
			token: 't-ambient-2',
			milliseconds: 2000,
			seconds: 2,
		});
		expect(contract.shadows?.box.elevation?.base).toMatchObject({
			token: 'shadow-box-elevation',
			layers: [{ y: 4, blur: 12, color: { token: 'clr-bg-a-min' } }],
		});
		expect(generateProjectSystemTypescript(system, generate(system))).toContain(
			'export type TfsColorMode'
		);
		expect(generateProjectSystemTypescript(system, generate(system))).toContain(
			'export type TfsTimeScale'
		);
	});
});
