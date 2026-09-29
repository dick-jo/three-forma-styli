import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FigmaData } from 'three-forma-styli';
import { repairSelection, type RepairNode } from '../src/repair';
import { sync, type Variable } from '../src/sync';
import { fakeFigma } from './fake';

const data: FigmaData = JSON.parse(
	readFileSync(
		new URL('../../tfs/tests/fixtures/everything/expected/figma.json', import.meta.url),
		'utf8'
	)
);

/** A synced file that also holds an older collection with the same variable names. */
async function fileWithOldCollection() {
	const figma = fakeFigma();
	await sync(figma.api, data);
	const old = figma.api.createCollection('Color');
	old.renameMode(old.modes[0]!.modeId, 'default');
	const light = old.addMode('light');
	old.addMode('nonon-ten');
	const oldVar = (name: string, type: 'COLOR' | 'FLOAT') =>
		figma.api.createVariable(name, old, type);
	const tfs = (name: string) =>
		figma.variables.find((v) => v.name === name && v.variableCollectionId !== old.id)!;
	return { figma, old, light, oldVar, tfs };
}

function node(
	name: string,
	parts: Partial<RepairNode> = {}
): RepairNode & { bound: Record<string, string>; modes: Record<string, string> } {
	const bound: Record<string, string> = {};
	const modes: Record<string, string> = { ...(parts.explicitVariableModes ?? {}) };
	return {
		name,
		...parts,
		bound,
		modes,
		get explicitVariableModes() {
			return modes;
		},
		setBoundVariable(field: string, variable: Variable) {
			bound[field] = variable.id;
		},
		clearExplicitVariableModeForCollection(collection) {
			delete modes[collection.id];
		},
		setExplicitVariableModeForCollection(collection, modeId) {
			modes[collection.id] = modeId;
		},
	};
}

describe('repair selection', () => {
	it('rebinds fills, effects and fields from an older collection to TFS variables of the same name', async () => {
		const { figma, oldVar, tfs } = await fileWithOldCollection();
		const bg = oldVar('clr/bg', 'COLOR');
		const shd = oldVar('clr/shd/lo', 'COLOR');
		const radius = oldVar('bdr/l', 'FLOAT');
		const card = node('card', {
			fills: [{ type: 'SOLID', boundVariables: { color: { id: bg.id } } }],
			effects: [{ type: 'DROP_SHADOW', boundVariables: { color: { id: shd.id } } }],
			boundVariables: { topLeftRadius: { id: radius.id } },
		});
		const report = await repairSelection(figma.repairApi, data, [
			node('frame', { children: [card] }),
		]);
		expect(report.rebound).toBe(3);
		expect((card.fills as any)[0].boundVariables.color.id).toBe(tfs('clr/bg').id);
		expect((card.effects as any)[0].boundVariables.color.id).toBe(tfs('clr/shd/lo').id);
		expect(card.bound.topLeftRadius).toBe(tfs('bdr/l').id);
		expect(report.manual).toEqual([]);
	});

	it("moves a frame's mode from the old collection to the TFS one with the same mode name", async () => {
		const { figma, old, light } = await fileWithOldCollection();
		const frame = node('frame', { explicitVariableModes: { [old.id]: light } });
		const report = await repairSelection(figma.repairApi, data, [frame]);
		const theme = figma.collections.find((c) => c.name === 'theme')!;
		expect(report.modes).toBe(1);
		expect(frame.modes).toEqual({
			[theme.id]: theme.modes.find((m) => m.name === 'light')!.modeId,
		});
	});

	it('leaves TFS bindings alone, and lists what it cannot fix', async () => {
		const { figma, oldVar, tfs } = await fileWithOldCollection();
		const shimmer = oldVar('clr/shimmer-a', 'COLOR');
		const ok = node('ok', {
			fills: [{ type: 'SOLID', boundVariables: { color: { id: tfs('clr/pri').id } } }],
		});
		const orphan = node('orphan', {
			fills: [{ type: 'SOLID', boundVariables: { color: { id: 'deleted' } } }],
		});
		const unknown = node('unknown', {
			fills: [{ type: 'SOLID', boundVariables: { color: { id: shimmer.id } } }],
		});
		const report = await repairSelection(figma.repairApi, data, [ok, orphan, unknown]);
		expect(report.rebound).toBe(0);
		expect(report.manual).toEqual([
			'orphan: fill uses a variable that no longer exists',
			"unknown: fill uses clr/shimmer-a, which TFS doesn't have",
		]);
	});
});
