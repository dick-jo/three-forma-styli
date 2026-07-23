import { describe, expect, it } from 'vitest';
import { generate } from '../generator/index.js';
import type { PartialDesignSystem } from '../types.js';
import { createWorkbenchContract } from './contract.js';

const system: PartialDesignSystem = {
	colors: {
		alphaSchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 },
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { bg: { mode: 'oklch', l: 0.1, c: 0, h: 0 } },
			},
			{
				name: 'light',
				tokens: { bg: { mode: 'oklch', l: 0.95, c: 0, h: 0 } },
			},
		],
	},
	spacing: {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { unit: 'px', base: 8, min: 4, range: 2 },
			},
			{
				name: 'compact',
				tokens: { unit: 'px', base: 7, min: 3.5, range: 2 },
			},
		],
	},
	typography: {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.125, range: 4 },
			},
			{
				name: 'compact',
				tokens: { unit: 'rem', base: 0.875, min: 0.6875, increment: 0.125, range: 4 },
			},
		],
		fonts: {
			sans: {
				family: 'Example Sans',
				fallbacks: ['Arial', 'sans-serif'],
				verification: 'unavailable',
				faces: [{ style: 'normal', weight: { min: 300, max: 700 } }],
			},
		},
		roles: {
			prose: {
				font: 'sans',
				weights: { min: 300, max: 700 },
				base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0, weight: 'min' },
				variants: {
					max: { fontSize: 4, lineHeight: 1.1, letterSpacing: -0.01, weight: 'max' },
				},
				modeOverrides: {
					compact: {
						base: {
							fontSize: 1,
							lineHeight: 1.2,
							letterSpacing: 0.005,
							weight: 'max',
						},
					},
				},
				displayOrder: ['base', 'max'],
			},
		},
	},
	shadows: {
		unit: 'px',
		box: {
			glow: {
				base: [{ x: 0, y: 0, blur: 12, color: { color: 'bg', alpha: 'lo' } }],
			},
		},
	},
};

describe('workbench review contract', () => {
	it('enumerates stable cases, controls and independently applicable mode overrides', () => {
		const contract = createWorkbenchContract(system, generate(system), {
			systemFingerprint: 'abc123',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});

		expect(contract.kind).toBe('three-forma-styli/workbench');
		expect(contract.systemFingerprint).toBe('abc123');
		expect(contract.labs.map((lab) => lab.id)).toEqual([
			'overview',
			'color',
			'typography',
			'shadows',
			'foundations',
		]);

		const color = contract.labs.find((lab) => lab.kind === 'color');
		expect(color?.cases.map((reviewCase) => reviewCase.id)).toEqual([
			'color--default--bg',
			'color--light--bg',
		]);
		expect(color?.cases[0]?.controls.map((control) => control.id)).toEqual(['l', 'c', 'h']);

		const typography = contract.labs.find((lab) => lab.kind === 'typography');
		expect(typography?.cases.map((reviewCase) => reviewCase.id)).toEqual([
			'typography--prose--base',
			'typography--prose--max',
			'typography--compact--prose--base',
			'typography--compact--prose--max',
		]);
		expect(typography?.cases[0]?.controls.map((control) => control.id)).toEqual([
			'fontSize',
			'lineHeight',
			'letterSpacing',
			'weight',
		]);
		expect(typography?.cases[0]?.sourcePath).toBe('/typography/roles/prose/base');
		expect(typography?.cases[2]).toMatchObject({
			mode: 'compact',
			sourcePath: '/typography/roles/prose/modeOverrides/compact/base',
			weight: { alias: 'max', value: 700 },
			recipe: {
				fontSizeReference: 1,
				atomicFontSizeToken: 'fs-1',
				lineHeight: 1.2,
				letterSpacingEm: 0.005,
				weight: 'max',
			},
		});
		expect(typography?.cases[2]?.controls.map((control) => control.path)).toEqual([
			'/typography/roles/prose/modeOverrides/compact/base/fontSize',
			'/typography/roles/prose/modeOverrides/compact/base/lineHeight',
			'/typography/roles/prose/modeOverrides/compact/base/letterSpacing',
			'/typography/roles/prose/modeOverrides/compact/base/weight',
		]);

		const shadows = contract.labs.find((lab) => lab.kind === 'shadows');
		expect(shadows?.cases[0]).toMatchObject({
			id: 'shadows--box--glow--base',
			sourcePath: '/shadows/box/glow/base',
		});

		const light = contract.globals.modes
			.find((group) => group.category === 'color')
			?.modes.find((mode) => mode.name === 'light');
		expect(light?.tokens['--clr-bg']).toContain('oklch(');
		const compact = contract.globals.modes
			.find((group) => group.category === 'size')
			?.modes.find((mode) => mode.name === 'compact');
		expect(compact?.tokens['--sp-1']).toBeDefined();
	});

	it('omits nonexistent mode categories instead of inventing empty modes', () => {
		const typographyOnly: PartialDesignSystem = { typography: system.typography };
		const contract = createWorkbenchContract(typographyOnly, generate(typographyOnly), {
			systemFingerprint: 'typography-only',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});

		expect(contract.globals.modes.map((group) => group.category)).toEqual(['size']);
		expect(contract.globals.modes[0]?.modes.map((mode) => mode.name)).toEqual([
			'default',
			'compact',
		]);
		expect(contract.agent.verification).toEqual({
			generate: 'tfs build .',
			check: 'tfs check .',
		});
		expect(contract.diagnostics).toEqual([
			{
				id: 'typography-font-sans-unverified',
				severity: 'info',
				message: 'Font "sans" is externally managed; TFS did not verify a prepared font manifest.',
				path: '/typography/fonts/sans',
			},
		]);
	});

	it('identifies an adjusted fallback without duplicating it in the ordinary stack', () => {
		const withAdjustedFallback = structuredClone(system);
		withAdjustedFallback.typography!.fonts!.sans!.fallbacks = [
			'__tfs-sans-adjusted-fallback',
			'Arial',
			'sans-serif',
		];
		const contract = createWorkbenchContract(withAdjustedFallback, generate(withAdjustedFallback), {
			systemFingerprint: 'fallback',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
			adjustedFallbackFamilies: { prose: '__tfs-sans-adjusted-fallback' },
		});
		const typography = contract.labs.find((lab) => lab.kind === 'typography');
		expect(typography?.cases[0]?.font).toEqual({
			id: 'sans',
			family: 'Example Sans',
			adjustedFallback: '__tfs-sans-adjusted-fallback',
			fallbacks: ['Arial', 'sans-serif'],
		});
	});

	it('does not share mutable capture policy arrays between cases or contracts', () => {
		const first = createWorkbenchContract(system, generate(system), {
			systemFingerprint: 'first',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});
		const second = createWorkbenchContract(system, generate(system), {
			systemFingerprint: 'second',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});
		const firstCases = first.labs.flatMap((lab) => (lab.kind === 'overview' ? [] : lab.cases));
		const secondCases = second.labs.flatMap((lab) => (lab.kind === 'overview' ? [] : lab.cases));
		const mutated = firstCases[0]!;
		const sibling = firstCases[1]!;
		const fresh = secondCases[0]!;

		mutated.capture.viewports.push('mutation');
		mutated.capture.colorModes.push('mutation');
		mutated.capture.sizeModes.push('mutation');

		expect(sibling.capture.viewports).not.toContain('mutation');
		expect(sibling.capture.colorModes).not.toContain('mutation');
		expect(sibling.capture.sizeModes).not.toContain('mutation');
		expect(fresh.capture.viewports).not.toContain('mutation');
		expect(fresh.capture.colorModes).not.toContain('mutation');
		expect(fresh.capture.sizeModes).not.toContain('mutation');
	});

	it('preserves arbitrary author vocabulary while emitting safe, collision-free case IDs', () => {
		const authored: PartialDesignSystem = {
			colors: {
				modes: [
					{
						name: 'a--b',
						isDefault: true,
						tokens: { c: { mode: 'oklch', l: 0.2, c: 0.03, h: 30 } },
					},
					{
						name: 'a',
						tokens: { 'b--c': { mode: 'oklch', l: 0.8, c: 0.04, h: 210 } },
					},
				],
			},
			typography: {
				modes: [
					{
						name: 'screen-default',
						isDefault: true,
						tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.125, range: 4 },
					},
				],
				fonts: {
					editorial: {
						family: 'Author Sans',
						fallbacks: ['sans-serif'],
						verification: 'unavailable',
						faces: [{ style: 'normal', weight: { min: 350, max: 800 } }],
					},
				},
				roles: {
					'editorial-copy': {
						font: 'editorial',
						weights: { book: 350, black: 800 },
						base: { fontSize: 2, lineHeight: 1.4, letterSpacing: 0, weight: 'book' },
						variants: {
							'hero--wide': {
								fontSize: 4,
								lineHeight: 0.95,
								letterSpacing: -0.02,
								weight: 'black',
							},
						},
						displayOrder: ['base', 'hero--wide'],
					},
				},
			},
		};
		const contract = createWorkbenchContract(authored, generate(authored), {
			systemFingerprint: 'arbitrary-vocabulary',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});
		const cases = contract.labs.flatMap((lab) => (lab.kind === 'overview' ? [] : lab.cases));
		const ids = cases.map((reviewCase) => reviewCase.id);

		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every((id) => /^[A-Za-z0-9]+(?:--[A-Za-z0-9_]+)+$/.test(id))).toBe(true);
		expect(ids).toContain('color--a_2D__2D_b--c');
		expect(ids).toContain('color--a--b_2D__2D_c');
		expect(ids).toContain('typography--editorial_2D_copy--hero_2D__2D_wide');
		expect(
			cases.find(
				(reviewCase) => reviewCase.id === 'typography--editorial_2D_copy--hero_2D__2D_wide'
			)?.label
		).toBe('editorial-copy / hero--wide');
	});
});
