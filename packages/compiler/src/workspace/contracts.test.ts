import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
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
	renderTokensContract,
	renderTypographyContract,
	runtimeColorThemeContract,
} from './contracts.js';

function typecheck(source: string): string[] {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-contract-types-'));
	const fixture = path.join(directory, 'fixture.ts');
	try {
		fs.writeFileSync(fixture, source);
		const program = ts.createProgram([fixture], {
			strict: true,
			noEmit: true,
			target: ts.ScriptTarget.ES2022,
			skipLibCheck: true,
		});
		return ts
			.getPreEmitDiagnostics(program)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

describe('workspace runtime contracts', () => {
	it('emits compact typed identities, groups, and CSS-variable helpers', async () => {
		const system: PartialDesignSystem = {
			alpha: {
				defaultScale: 'standard',
				scales: {
					standard: {
						values: { min: 0.1, 'lo-x': 0.2, lo: 0.3, hi: 0.6, 'hi-x': 0.8, max: 0.9 },
					},
				},
			},
			colors: {
				modes: [
					{
						name: 'dark',
						isDefault: true,
						tokens: {
							bg: { mode: 'oklch', l: 0.2 },
							'network-base': { mode: 'oklch', l: 0.7, c: 0.2, h: 250 },
						},
					},
				],
				groups: {
					core: { identities: ['bg'] },
					network: { match: { prefix: 'network-' } },
				},
			},
			border: {
				radius: {
					modes: [{ name: 'default', isDefault: true, tokens: { min: 'min', s: 1, l: 2, max: 3 } }],
				},
				width: { modes: [{ name: 'default', isDefault: true, tokens: { unit: 'px', value: 1 } }] },
			},
			spacing: {
				modes: [
					{ name: 'default', isDefault: true, tokens: { unit: 'px', base: 8, min: 4, range: 3 } },
				],
			},
		};
		const rendered = renderTokensContract(system, generate(system), resolveGeneratorConfig());
		expect(rendered.declaration).toContain('export type ColorIdentity =');
		expect(rendered.declaration).toContain('export type AlphaScaleIdentity =');
		expect(rendered.declaration).toContain('export type ColorIdentityIn<');
		expect(rendered.declaration).toContain('export declare function colorRampStyle');
		const encoded = Buffer.from(rendered.javascript).toString('base64');
		const runtime = (await import(`data:text/javascript;base64,${encoded}`)) as {
			alphaScaleIdentities: readonly string[];
			colorGroups: Record<string, readonly string[]>;
			colorVariable: (color: string, alpha?: string) => string;
			colorRampStyle: (color: string, local: string) => Record<string, string>;
		};
		expect(runtime.alphaScaleIdentities).toEqual(['standard']);
		expect(runtime.colorGroups.network).toEqual(['network-base']);
		expect(runtime.colorVariable('network-base', 'lo-x')).toBe('--clr-network-base-a-lo-x');
		expect(runtime.colorRampStyle('bg', '--loc-color')).toMatchObject({
			'--loc-color': 'var(--clr-bg)',
			'--loc-color-a-non': 'var(--clr-bg-a-non)',
			'--loc-color-a-max': 'var(--clr-bg-a-max)',
		});
		expect(() => runtime.colorVariable('missing')).toThrow('Unknown color identity');
		expect(
			typecheck(`${rendered.declaration}
const color: ColorIdentity = 'network-base';
const network: ColorIdentityIn<'network'> = 'network-base';
const variable: '--clr-network-base-a-hi' = colorVariable('network-base', 'hi');
const reference: 'var(--clr-bg)' = colorReference('bg');
const radius: BorderRadiusIdentity = 's';
const alphaScale: AlphaScaleIdentity = 'standard';
const style: ColorRampStyle<'--loc-color'> = colorRampStyle('bg', '--loc-color');
// @ts-expect-error unknown authored color
const badColor: ColorIdentity = 'missing';
// @ts-expect-error a component subset cannot select an unknown color
const subset = ['bg', 'missing'] as const satisfies readonly ColorIdentity[];
void color; void network; void variable; void reference; void radius; void alphaScale; void style; void badColor; void subset;
`)
		).toEqual([]);
	});

	it('represents absent system mode categories as null plus empty entries', () => {
		const system: PartialDesignSystem = {
			alpha: {
				defaultScale: 'standard',
				scales: {
					standard: {
						values: { min: 0.1, 'lo-x': 0.2, lo: 0.3, hi: 0.6, 'hi-x': 0.8, max: 0.9 },
					},
				},
			},
			colors: {
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

	it('shares the complete discriminated typography selection surface', async () => {
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
						sizes: {
							base: { fontSize: 2, weight: 'min', lineHeight: 1.4, letterSpacing: 0 },
						},
						weights: { min: 400, max: 700 },
						styles: {
							normal: { weights: ['min', 'max'] },
							italic: { weights: ['min'] },
						},
					},
				},
			},
		};
		const rendered = renderTypographyContract(generate(system));
		const declaration = rendered.declaration;
		expect(declaration).toContain('export type TypographySelection =');
		expect(declaration).toContain('fontStyle?: "normal"; weight?: TypographyWeightForStyle');
		expect(declaration).toContain('fontStyle: "italic"; weight: TypographyWeightForStyle');
		expect(declaration).toContain('TypographySelectionByRole[R]');
		expect(declaration).toContain('export type TypographyClassKey =');
		expect(declaration).toContain('export declare function typographyClassName');

		const encoded = Buffer.from(rendered.javascript).toString('base64');
		const runtime = (await import(`data:text/javascript;base64,${encoded}`)) as {
			typographyClassName: (
				selection: Record<string, string>,
				classes: Readonly<Record<string, string>>
			) => string;
		};
		const classes = {
			prose: 'recipe_base',
			'prose-style-normal-weight-min': 'normal_min',
			'prose-style-normal-weight-max': 'normal_max',
			'prose-style-italic-weight-min': 'italic_min',
		};
		expect(runtime.typographyClassName({ role: 'prose' }, classes)).toBe('recipe_base normal_min');
		expect(
			runtime.typographyClassName({ role: 'prose', fontStyle: 'italic', weight: 'min' }, classes)
		).toBe('recipe_base italic_min');
		expect(() => runtime.typographyClassName({ role: 'missing' }, classes)).toThrow(
			'Unknown typography role "missing"'
		);
		expect(() =>
			runtime.typographyClassName({ role: 'prose', fontStyle: 'italic', weight: 'max' }, classes)
		).toThrow('does not expose style "italic" at weight "max"');
	});

	it('keeps default colors complete, override colors authored, and inheritance explicit', () => {
		const system: PartialDesignSystem = {
			alpha: {
				defaultScale: 'standard',
				scales: {
					standard: {
						values: { min: 0.1, 'lo-x': 0.2, lo: 0.3, hi: 0.6, 'hi-x': 0.8, max: 0.9 },
					},
				},
			},
			colors: {
				modes: [
					{
						name: 'dark',
						isDefault: true,
						tokens: {
							neutral: { mode: 'oklch', l: 0.2 },
							brand: { mode: 'oklch', l: 0.7, c: 0.2, h: 30 },
							accent: { mode: 'oklch', l: 0.65, c: 0.1, h: 110 },
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
					},
				],
			},
		};
		const contract = nativeColorModesContract(system);
		expect(contract.defaultMode).toBe('dark');
		expect(contract.colorIdentities).toEqual(['neutral', 'brand', 'accent']);
		expect(contract.alphaSchedule).toEqual({
			non: 0,
			min: 0.1,
			'lo-x': 0.2,
			lo: 0.3,
			hi: 0.6,
			'hi-x': 0.8,
			max: 0.9,
		});
		expect(contract.modes.map((mode) => mode.name)).toEqual(['dark', 'light', 'warm']);
		expect(contract.modes[0]!.metadata).toBeNull();
		expect(contract.modes[0]!.source.colors.neutral).toEqual({ l: 0.2, c: 0, h: 0 });
		expect(contract.modes[1]!.source.colors).toEqual({ neutral: { l: 0.95, c: 0, h: 0 } });
		expect(contract.modes[1]!.source).toEqual({
			colors: { neutral: { l: 0.95, c: 0, h: 0 } },
		});

		const declaration = renderNativeColorModesContract(system).declaration;
		expect(declaration).toContain('readonly defaultMode: "dark";');
		expect(declaration).toContain('readonly colorIdentities: readonly [');
		expect(declaration).toContain('readonly l: number;');
		expect(declaration).toContain('readonly non: 0;');
		expect(declaration).toContain('readonly min: number;');
		expect(declaration).not.toContain('readonly l: 0.2;');
		expect(declaration).toContain('readonly schemaVersion: 2;');
	});

	it('uses null for a schedule-less valid runtime contract', () => {
		const system = {
			colors: {
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

	it('emits a strict runtime-theme policy with literal color-identity types and shared naming', () => {
		const system = {
			alpha: {
				defaultScale: 'standard',
				scales: {
					standard: {
						values: { min: 0.1, 'lo-x': 0.2, lo: 0.3, hi: 0.6, 'hi-x': 0.8, max: 0.9 },
					},
				},
			},
			colors: {
				luminance: {
					minimumLuminanceDelta: 0.4,
					backgroundColors: ['canvas'],
					foregroundColors: ['ink'],
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
		});
		const runtimePolicy = {
			colors: { include: ['canvas', 'ink'] },
			enforce: ['luminance'],
		} as const;
		expect(runtimeColorThemeContract(system, generator, runtimePolicy)).toEqual({
			schemaVersion: 2,
			colorIdentities: ['canvas', 'ink'],
			enforce: ['luminance'],
			alphaSchedule: {
				non: 0,
				min: 0.1,
				'lo-x': 0.2,
				lo: 0.3,
				hi: 0.6,
				'hi-x': 0.8,
				max: 0.9,
			},
			luminance: system.colors.luminance,
			prefixes: { color: 'palette' },
			colorFormat: { alphaModifier: 'a' },
		});

		const rendered = renderRuntimeColorThemeContract(system, generator, runtimePolicy);
		expect(rendered.javascript).toContain('export const runtimeColorThemeConfig');
		expect(rendered.declaration).toContain('readonly colorIdentities: readonly [');
		expect(rendered.declaration).toContain('readonly non: 0;');
		expect(rendered.declaration).toContain('readonly minimumLuminanceDelta: number;');
		expect(rendered.declaration).toContain('export type RuntimeColorIdentity =');
		expect(rendered.declaration).toContain('export type RuntimeColorThemeInput =');
	});
});
