import { describe, expect, it } from 'vitest';
import type { FigmaCollection } from '@three-forma-styli/core';
import { buildPayload, buildSyncPlan } from './figma-sync.js';

const collection: FigmaCollection = {
	name: 'Color',
	defaultMode: 'light',
	modes: ['light', 'dark'],
	variables: [
		{
			name: 'clr-ink',
			type: 'COLOR',
			values: {
				light: { hex: '#000000', rgba: { r: 0, g: 0, b: 0, a: 1 } },
				dark: { hex: '#ffffff', rgba: { r: 1, g: 1, b: 1, a: 1 } },
			},
		},
	],
};

describe('buildPayload', () => {
	it('creates a collection, modes, variables, and all values from empty state', () => {
		const payload = buildPayload(collection, { variables: {}, variableCollections: {} });

		expect(payload.variableCollections).toHaveLength(1);
		expect(payload.variableModes).toHaveLength(2);
		expect(payload.variables).toHaveLength(1);
		expect(payload.variableModeValues).toHaveLength(2);
	});

	it('renames Figma default mode without also creating a duplicate', () => {
		const payload = buildPayload(collection, {
			variables: {},
			variableCollections: {
				collection: {
					id: 'collection',
					name: 'Color',
					modes: [{ modeId: 'mode-1', name: 'Mode 1' }],
					defaultModeId: 'mode-1',
					variableIds: [],
				},
			},
		});

		expect(payload.variableModes).toEqual([
			{
				action: 'UPDATE',
				id: 'mode-1',
				name: 'light',
				variableCollectionId: 'collection',
			},
			{
				action: 'CREATE',
				id: 'temp_mode_0',
				name: 'dark',
				variableCollectionId: 'collection',
			},
		]);
	});

	it('updates values in place for an existing variable', () => {
		const payload = buildPayload(collection, {
			variables: {
				ink: {
					id: 'ink',
					name: 'clr-ink',
					variableCollectionId: 'collection',
					resolvedType: 'COLOR',
					valuesByMode: {},
				},
			},
			variableCollections: {
				collection: {
					id: 'collection',
					name: 'Color',
					modes: [
						{ modeId: 'light-id', name: 'light' },
						{ modeId: 'dark-id', name: 'dark' },
					],
					defaultModeId: 'light-id',
					variableIds: ['ink'],
				},
			},
		});

		expect(payload.variables).toEqual([]);
		expect(payload.variableModeValues).toEqual([
			{ variableId: 'ink', modeId: 'light-id', value: { r: 0, g: 0, b: 0, a: 1 } },
			{ variableId: 'ink', modeId: 'dark-id', value: { r: 1, g: 1, b: 1, a: 1 } },
		]);
	});

	it('fails rather than silently preserving a conflicting Figma default mode', () => {
		expect(() =>
			buildPayload(collection, {
				variables: {},
				variableCollections: {
					collection: {
						id: 'collection',
						name: 'Color',
						modes: [
							{ modeId: 'dark-id', name: 'dark' },
							{ modeId: 'light-id', name: 'light' },
						],
						defaultModeId: 'dark-id',
						variableIds: [],
					},
				},
			})
		).toThrow('Align the default mode in Figma before syncing');
	});

	it('keeps stale modes and variables under the safe merge policy', () => {
		const plan = buildSyncPlan(collection, {
			variables: {
				stale: {
					id: 'stale',
					name: 'clr-stale',
					variableCollectionId: 'collection',
					resolvedType: 'COLOR',
					valuesByMode: {},
				},
			},
			variableCollections: {
				collection: {
					id: 'collection',
					name: 'Color',
					modes: [
						{ modeId: 'light-id', name: 'light' },
						{ modeId: 'dark-id', name: 'dark' },
						{ modeId: 'stale-mode-id', name: 'stale' },
					],
					defaultModeId: 'light-id',
					variableIds: ['stale'],
				},
			},
		});

		expect(plan.hasDeletions).toBe(false);
		expect(plan.payload.variableModes).toEqual([]);
		expect(plan.payload.variables).toMatchObject([{ action: 'CREATE', name: 'clr-ink' }]);
	});

	it('deletes stale modes and variables only under the authoritative policy', () => {
		const plan = buildSyncPlan(
			collection,
			{
				variables: {
					stale: {
						id: 'stale',
						name: 'clr-stale',
						variableCollectionId: 'collection',
						resolvedType: 'COLOR',
						valuesByMode: {},
					},
				},
				variableCollections: {
					collection: {
						id: 'collection',
						name: 'Color',
						modes: [
							{ modeId: 'light-id', name: 'light' },
							{ modeId: 'dark-id', name: 'dark' },
							{ modeId: 'stale-mode-id', name: 'stale' },
						],
						defaultModeId: 'light-id',
						variableIds: ['stale'],
					},
				},
			},
			'authoritative'
		);

		expect(plan.hasDeletions).toBe(true);
		expect(plan.payload.variableModes).toContainEqual({
			action: 'DELETE',
			id: 'stale-mode-id',
			variableCollectionId: 'collection',
		});
		expect(plan.payload.variables).toContainEqual({ action: 'DELETE', id: 'stale' });
	});

	it('fails when an existing variable has an incompatible immutable type', () => {
		expect(() =>
			buildPayload(collection, {
				variables: {
					ink: {
						id: 'ink',
						name: 'clr-ink',
						variableCollectionId: 'collection',
						resolvedType: 'FLOAT',
						valuesByMode: {},
					},
				},
				variableCollections: {
					collection: {
						id: 'collection',
						name: 'Color',
						modes: [
							{ modeId: 'light-id', name: 'light' },
							{ modeId: 'dark-id', name: 'dark' },
						],
						defaultModeId: 'light-id',
						variableIds: ['ink'],
					},
				},
			})
		).toThrow("Figma cannot update a variable's type in place");
	});

	it('fails rather than choosing between duplicate collection names', () => {
		expect(() =>
			buildPayload(collection, {
				variables: {},
				variableCollections: {
					first: {
						id: 'first',
						name: 'Color',
						modes: [{ modeId: 'first-default', name: 'light' }],
						defaultModeId: 'first-default',
						variableIds: [],
					},
					second: {
						id: 'second',
						name: 'Color',
						modes: [{ modeId: 'second-default', name: 'light' }],
						defaultModeId: 'second-default',
						variableIds: [],
					},
				},
			})
		).toThrow('collections named "Color"');
	});

	it('fails when source variable values do not cover the collection modes exactly', () => {
		const incomplete: FigmaCollection = structuredClone(collection);
		delete incomplete.variables[0]!.values.dark;

		expect(() => buildPayload(incomplete, { variables: {}, variableCollections: {} })).toThrow(
			'mode values do not match collection modes; missing: dark'
		);
	});
});
