import { describe, expect, it } from 'vitest';
import { emitFigmaJson, TfsError, type FigmaData } from 'three-forma-styli';
import { oklchToSrgb } from '../src/emit/srgb.js';
import { fonts, resolved } from './everything.js';

const data = (modes?: Record<string, string[]>): FigmaData =>
	JSON.parse(emitFigmaJson(resolved, fonts.stacks, modes ? { modes } : {}));

describe('OKLCH → sRGB for Figma', () => {
	it('matches known colours', () => {
		expect(oklchToSrgb({ l: 1, c: 0, h: 0 })).toEqual({ r: 1, g: 1, b: 1 });
		expect(oklchToSrgb({ l: 0, c: 0, h: 0 })).toEqual({ r: 0, g: 0, b: 0 });
		const red = oklchToSrgb({ l: 0.62796, c: 0.25768, h: 29.2339 });
		expect([red.r, red.g, red.b].map((v) => Math.round(v * 255))).toEqual([255, 0, 0]);
	});

	it('brings out-of-gamut colours inside sRGB', () => {
		const { r, g, b } = oklchToSrgb({ l: 0.7, c: 0.4, h: 150 });
		for (const channel of [r, g, b])
			(expect(channel).toBeGreaterThanOrEqual(0), expect(channel).toBeLessThanOrEqual(1));
	});
});

describe('figma.json', () => {
	it('puts each variable in the collection of the axis that changes it', () => {
		const collections = Object.fromEntries(data().collections.map((c) => [c.name, c]));
		expect(Object.keys(collections)).toEqual(['theme', 'size', 'base']);
		expect(collections.theme!.modes).toEqual(['dark', 'light']);
		expect(collections.theme!.variables.map((v) => v.name)).toContain('clr/pri/lo');
		expect(collections.size!.variables.find((v) => v.name === 'sp/1')!.values).toEqual([8, 6, 10]);
		expect(collections.size!.variables.find((v) => v.name === 'fs/1')!.values).toEqual([
			12, 11, 13,
		]);
	});

	it('turns references into aliases, so they follow modes inside Figma', () => {
		const base = data().collections.find((c) => c.name === 'base')!;
		expect(base.variables.find((v) => v.name === 'gap/s')!.values).toEqual([{ alias: 'sp/1' }]);
		expect(base.variables.find((v) => v.name === 'bdw')!.values).toEqual([1]);
	});

	it('carries only the chosen modes', () => {
		const size = data({ size: ['regular'] }).collections.find((c) => c.name === 'size')!;
		expect(size.modes).toEqual(['regular']);
		expect(size.variables.find((v) => v.name === 'sp/1')!.values).toEqual([8]);
	});

	it('rejects unknown modes and more than four', () => {
		expect(() => data({ size: ['xl'] })).toThrow(TfsError);
		expect(() => data({ size: ['xl'] })).toThrow('"xl" is not a mode of size');
	});

	it('makes text and effect styles bound to variables, and lists what it skips', () => {
		const figma = data();
		expect(figma.textStyles.find((s) => s.name === 'label/s')).toEqual({
			name: 'label/s',
			family: 'JetBrains Mono',
			weight: 500,
			fontSize: { px: 12, variable: 'fs/1' },
			lineHeightPercent: 125,
			letterSpacingPercent: 1.5,
			textCase: 'UPPER',
		});
		expect(figma.effectStyles.find((s) => s.name === 'shd/glow-pri/lo')!.layers[0]!.color).toBe(
			'clr/pri/lo-x'
		);
		expect(figma.skipped).toEqual(
			expect.arrayContaining([
				'text styles for prose: font "sans" is a system font with no Figma equivalent',
				'shadows: shapes changed by modes use their ordinary values in Figma',
				'easing (3): Figma has no easing variables',
			])
		);
	});
});
