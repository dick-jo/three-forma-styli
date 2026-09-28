import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FigmaData } from 'three-forma-styli';
import {
	sync,
	type Api,
	type Collection,
	type EffectStyle,
	type FontName,
	type TextStyle,
	type Variable,
} from '../src/sync';

// TFS's real output for its everything-project (a committed snapshot).
const data: FigmaData = JSON.parse(
	readFileSync(
		new URL('../../tfs/tests/fixtures/everything/expected/figma.json', import.meta.url),
		'utf8'
	)
);

/** An in-memory stand-in for the slice of Figma's API the plugin uses. */
function fakeFigma(
	fonts: FontName[] = [
		{ family: 'JetBrains Mono', style: 'Regular' },
		{ family: 'JetBrains Mono', style: 'Medium' },
		{ family: 'JetBrains Mono', style: 'Bold' },
	]
) {
	let ids = 0;
	const collections: (Collection & { modeList: { modeId: string; name: string }[] })[] = [];
	const variables: (Variable & { values: Record<string, unknown> })[] = [];
	const textStyles: (TextStyle & { bound?: string })[] = [];
	const effectStyles: EffectStyle[] = [];
	const api: Api = {
		getCollections: async () => collections,
		createCollection: (name) => {
			const collection = {
				id: `c${ids++}`,
				name,
				modeList: [{ modeId: `m${ids++}`, name: 'Mode 1' }],
				get modes() {
					return this.modeList;
				},
				renameMode(modeId: string, next: string) {
					this.modeList.find((m) => m.modeId === modeId)!.name = next;
				},
				addMode(next: string) {
					const modeId = `m${ids++}`;
					this.modeList.push({ modeId, name: next });
					return modeId;
				},
			};
			collections.push(collection);
			return collection;
		},
		getVariables: async () => [...variables],
		createVariable: (name, collection, type) => {
			const variable = {
				id: `v${ids++}`,
				name,
				variableCollectionId: collection.id,
				resolvedType: type,
				scopes: [] as readonly string[],
				values: {} as Record<string, unknown>,
				setValueForMode(modeId: string, value: unknown) {
					this.values[modeId] = value;
				},
			};
			variables.push(variable);
			return variable;
		},
		alias: (variable) => ({ type: 'VARIABLE_ALIAS', id: variable.id }),
		availableFonts: async () => fonts,
		loadFont: async () => {},
		getTextStyles: async () => [...textStyles],
		createTextStyle: () => {
			const style = {
				name: '',
				description: '',
				fontName: { family: '', style: '' },
				fontSize: 0,
				lineHeight: null,
				letterSpacing: null,
				textCase: '',
				bound: undefined as string | undefined,
				setBoundVariable(_field: 'fontSize', variable: Variable | null) {
					this.bound = variable?.name;
				},
			};
			textStyles.push(style);
			return style;
		},
		getEffectStyles: async () => [...effectStyles],
		createEffectStyle: () => {
			const style = { name: '', description: '', effects: [] as readonly unknown[] };
			effectStyles.push(style);
			return style;
		},
		bindEffectColor: (effect, variable) => ({
			...(effect as object),
			boundVariables: { color: { id: variable.id } },
		}),
	};
	return { api, collections, variables, textStyles, effectStyles };
}

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

	it('skips a text style whose weight the font lacks, and says why', async () => {
		const figma = fakeFigma([{ family: 'JetBrains Mono', style: 'Regular' }]);
		const report = await sync(figma.api, data);
		expect(report.skipped).toContain(
			'text style label/s: JetBrains Mono has no style for weight 500 (has Regular)'
		);
	});
});
