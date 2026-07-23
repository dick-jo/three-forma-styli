import { describe, expect, it } from 'vitest';
import { generate, oklch, type PartialDesignSystem } from '@three-forma-styli/core';
import { generateProjectSystemTypescript, projectSystemContract } from './system-typescript.js';

describe('project system TypeScript contract', () => {
	it('preserves authored mode metadata and source values beside resolved CSS tokens', () => {
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
		expect(generateProjectSystemTypescript(system, generate(system))).toContain(
			'export type TfsColorMode'
		);
	});
});
