import { describe, expect, it } from 'vitest';
import {
	generate,
	resolveGeneratorConfig,
	type PartialDesignSystem,
} from '@three-forma-styli/core';
import {
	nativeColorModesContract,
	renderNativeColorModesContract,
	renderRuntimeColorThemeContract,
	renderSystemContract,
	renderTypographyContract,
	runtimeColorThemeContract,
} from './contracts.js';

describe('workspace runtime contracts', () => {
	it('represents absent system mode categories as null plus empty entries', () => {
		const system: PartialDesignSystem = {
			colors: {
				alphaSchedule: { max: 0.9 },
				modes: [
					{
						name: 'only',
						isDefault: true,
						tokens: { ink: { mode: 'oklch', l: 0.2, c: 0, h: 0 } },
					},
				],
			},
		};
		const rendered = renderSystemContract(system, generate(system));
		expect(rendered.javascript).toContain('"default": null');
		expect(rendered.javascript).not.toContain('"": {');
		expect(rendered.declaration).toContain('readonly default: null;');
		expect(rendered.declaration).toContain('export type TfsSizeMode = keyof');
		expect(rendered.declaration).toContain('export type TfsTimeScale = keyof');
	});

	it('shares the complete discriminated typography selection surface', () => {
		const system: PartialDesignSystem = {
			typography: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 8 },
					},
				],
				fonts: {
					ui: {
						family: 'UI',
						verification: 'prepared',
						capabilities: {
							faces: [
								{ style: 'normal', weights: [400, 700] },
								{ style: 'italic', weights: [400] },
							],
						},
					},
				},
				roles: {
					prose: {
						font: 'ui',
						base: { fontSize: 2, weight: 'regular', lineHeight: 1.4, letterSpacing: 0 },
						weights: { regular: 400, strong: 700 },
						styles: {
							normal: { weights: ['regular', 'strong'] },
							italic: { weights: ['regular'] },
						},
					},
				},
			},
		};
		const declaration = renderTypographyContract(generate(system)).declaration;
		expect(declaration).toContain('export type TypographySelection =');
		expect(declaration).toContain('fontStyle: "italic"; weight: TypographyWeightForStyle');
		expect(declaration).toContain('TypographySelectionByRole[R]');
	});

	it('keeps default colors complete, override colors authored, and inheritance explicit', () => {
		const system: PartialDesignSystem = {
			colors: {
				alphaSchedule: { min: 0.1, max: 0.9 },
				modes: [
					{
						name: 'dark',
						isDefault: true,
						tokens: {
							neutral: { mode: 'oklch', l: 0.2 },
							brand: { mode: 'oklch', l: 0.7, c: 0.2, h: 30 },
						},
					},
					{
						name: 'light',
						metadata: { label: 'Light' },
						tokens: { neutral: { mode: 'oklch', l: 0.95 } },
					},
					{
						name: 'warm',
						tokens: {
							brand: { mode: 'oklch', l: 0.8, c: 0.15, h: 70 },
							accent: { mode: 'oklch', l: 0.75, c: 0.1, h: 110 },
						},
						alphaSchedule: { min: 0.2, max: 0.8 },
					},
				],
			},
		};
		const contract = nativeColorModesContract(system);
		expect(contract.defaultMode).toBe('dark');
		expect(contract.colorNames).toEqual(['neutral', 'brand', 'accent']);
		expect(contract.alphaSchedule).toEqual({ min: 0.1, max: 0.9 });
		expect(contract.modes.map((mode) => mode.name)).toEqual(['dark', 'light', 'warm']);
		expect(contract.modes[0]!.metadata).toBeNull();
		expect(contract.modes[0]!.source.colors.neutral).toEqual({ l: 0.2, c: 0, h: 0 });
		expect(contract.modes[1]!.source.colors).toEqual({ neutral: { l: 0.95, c: 0, h: 0 } });
		expect(contract.modes[1]!.source.alphaSchedule).toBeNull();
		expect(contract.modes[2]!.source.alphaSchedule).toEqual({ min: 0.2, max: 0.8 });

		const declaration = renderNativeColorModesContract(system).declaration;
		expect(declaration).toContain('readonly defaultMode: "dark";');
		expect(declaration).toContain('readonly colorNames: readonly [');
		expect(declaration).toContain('readonly l: number;');
		expect(declaration).toContain('readonly min: number;');
		expect(declaration).not.toContain('readonly l: 0.2;');
		expect(declaration).toContain('readonly schemaVersion: 1;');
	});

	it('uses null for a schedule-less valid runtime contract', () => {
		const system = {
			colors: {
				alphaSchedule: undefined,
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { neutral: { mode: 'oklch', l: 0.5 } },
					},
				],
			},
		} as unknown as PartialDesignSystem;
		expect(nativeColorModesContract(system).alphaSchedule).toBeNull();
		expect(() => renderNativeColorModesContract(system)).not.toThrow();
	});

	it('uses the first authored mode when no explicit default marker exists', () => {
		const system = {
			colors: {
				alphaSchedule: { max: 1 },
				modes: [
					{ name: 'first', tokens: { ink: { mode: 'oklch', l: 0.2 } } },
					{ name: 'second', tokens: { ink: { mode: 'oklch', l: 0.8 } } },
				],
			},
		} as unknown as PartialDesignSystem;
		const contract = nativeColorModesContract(system);
		expect(contract.defaultMode).toBe('first');
		expect(contract.modes.map((mode) => mode.name)).toEqual(['first', 'second']);
	});

	it('emits a strict runtime-theme policy with literal color-name types and shared naming', () => {
		const system = {
			colors: {
				alphaSchedule: { low: 0.2 },
				luminance: {
					minimumLuminanceDelta: 0.4,
					backgroundColors: ['canvas'],
					foregroundColors: ['ink'],
				},
				runtimeThemes: {
					colorNames: ['canvas', 'ink'],
				},
				modes: [
					{
						name: 'night',
						isDefault: true,
						tokens: {
							canvas: { mode: 'oklch', l: 0.1, c: 0, h: 0 },
							ink: { mode: 'oklch', l: 0.9, c: 0, h: 0 },
						},
					},
				],
			},
		} satisfies PartialDesignSystem;
		const generator = resolveGeneratorConfig({
			prefixes: { color: 'palette' },
			colorFormat: { alphaModifier: 'opacity' },
		});
		expect(runtimeColorThemeContract(system, generator)).toEqual({
			schemaVersion: 1,
			colorNames: ['canvas', 'ink'],
			alphaSchedule: { low: 0.2 },
			luminance: system.colors.luminance,
			prefixes: { color: 'palette' },
			colorFormat: { alphaModifier: 'opacity' },
		});

		const rendered = renderRuntimeColorThemeContract(system, generator);
		expect(rendered.javascript).toContain('export const runtimeColorThemeConfig');
		expect(rendered.declaration).toContain('readonly colorNames: readonly [');
		expect(rendered.declaration).toContain('readonly minimumLuminanceDelta: number;');
		expect(rendered.declaration).toContain('export type RuntimeColorName =');
		expect(rendered.declaration).toContain('export type RuntimeColorThemeInput =');
	});
});
