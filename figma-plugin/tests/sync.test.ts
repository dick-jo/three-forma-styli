import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FigmaData } from 'three-forma-styli';
import { sync } from '../src/sync';
import { fakeFigma } from './fake';

// TFS's real output for its everything-project (a committed snapshot).
const data: FigmaData = JSON.parse(
	readFileSync(
		new URL('../../tfs/tests/fixtures/everything/expected/figma.json', import.meta.url),
		'utf8'
	)
);

describe('syncing figma.json into a Figma file', () => {
	it('creates collections with the right modes, and variables with values per mode', async () => {
		const figma = fakeFigma();
		const report = await sync(figma.api, data);
		expect(
			figma.collections.map((c) => `${c.name}: ${c.modes.map((m) => m.name).join(', ')}`)
		).toEqual(['theme: dark, light', 'size: regular, s, l', 'base: value']);
		const size = figma.collections.find((c) => c.name === 'size')!;
		const sp1 = figma.variables.find((v) => v.name === 'sp/1')!;
		expect(size.modes.map((m) => sp1.values[m.modeId])).toEqual([8, 6, 10]);
		expect(sp1.scopes).toEqual(['WIDTH_HEIGHT', 'GAP']);
		expect(report.errors).toEqual([]);
	});

	it('makes references into aliases', async () => {
		const figma = fakeFigma();
		await sync(figma.api, data);
		const gap = figma.variables.find((v) => v.name === 'gap/s')!;
		const sp1 = figma.variables.find((v) => v.name === 'sp/1')!;
		expect(Object.values(gap.values)).toEqual([{ type: 'VARIABLE_ALIAS', id: sp1.id }]);
	});

	it('creates text styles with the right font style, bound to font-size variables', async () => {
		const figma = fakeFigma();
		const report = await sync(figma.api, data);
		const label = figma.textStyles.find((s) => s.name === 'label/s')!;
		expect(label.fontName).toEqual({ family: 'JetBrains Mono', style: 'Medium' });
		expect(label.bound).toBe('fs/1');
		expect(label.lineHeight).toEqual({ unit: 'PERCENT', value: 125 });
		expect(label.textCase).toBe('UPPER');
		expect(report.skipped).toContain(
			'text styles for prose: font "sans" is a system font with no Figma equivalent'
		);
	});

	it('creates effect styles whose colours are bound to colour variables', async () => {
		const figma = fakeFigma();
		await sync(figma.api, data);
		const lo = figma.effectStyles.find((s) => s.name === 'shd/lo')!;
		const shdLo = figma.variables.find((v) => v.name === 'clr/shd/lo')!;
		expect(lo.effects[0]).toMatchObject({
			type: 'DROP_SHADOW',
			offset: { x: 0, y: 1 },
			radius: 2,
			boundVariables: { color: { id: shdLo.id } },
		});
	});

	it('a second sync updates in place: no duplicates', async () => {
		const figma = fakeFigma();
		await sync(figma.api, data);
		const counts = [
			figma.collections.length,
			figma.variables.length,
			figma.textStyles.length,
			figma.effectStyles.length,
		];
		const report = await sync(figma.api, data);
		expect([
			figma.collections.length,
			figma.variables.length,
			figma.textStyles.length,
			figma.effectStyles.length,
		]).toEqual(counts);
		expect(report.created).toEqual([]);
		expect(report.stale).toEqual([]);
	});

	it('reports what no longer exists in TFS, without deleting it', async () => {
		const figma = fakeFigma();
		await sync(figma.api, data);
		const fewer: FigmaData = {
			...data,
			collections: data.collections.map((c) =>
				c.name === 'base' ? { ...c, variables: c.variables.filter((v) => v.name !== 'bdw') } : c
			),
			effectStyles: data.effectStyles.slice(1),
		};
		const report = await sync(figma.api, fewer);
		expect(report.stale).toEqual(['variable bdw', 'effect style shd/min']);
		expect(figma.variables.some((v) => v.name === 'bdw')).toBe(true);
	});

	it('ignores same-named variables in other collections (e.g. an older sync)', async () => {
		const figma = fakeFigma();
		const old = figma.api.createCollection('Color');
		const oldBg = figma.api.createVariable('clr/bg', old, 'COLOR');
		const report = await sync(figma.api, data);
		expect(report.errors).toEqual([]);
		const theme = figma.collections.find((c) => c.name === 'theme')!;
		const bg = figma.variables.filter((v) => v.name === 'clr/bg');
		expect(bg.map((v) => v.variableCollectionId).sort()).toEqual([old.id, theme.id].sort());
		const lo = figma.effectStyles.find((s) => s.name === 'shd/lo')!;
		expect((lo.effects[0] as any).boundVariables.color.id).not.toBe(oldBg.id);
	});

	it('skips a text style whose weight the font lacks, and says why', async () => {
		const figma = fakeFigma([{ family: 'JetBrains Mono', style: 'Regular' }]);
		const report = await sync(figma.api, data);
		expect(report.skipped).toContain(
			'text style label/s: JetBrains Mono has no style for weight 500 (has Regular)'
		);
	});
});
