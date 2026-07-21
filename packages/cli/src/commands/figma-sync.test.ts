import { describe, expect, it } from 'vitest';
import type { FigmaCollection } from '@three-forma-styli/core';
import { buildPayload } from './figma-sync.js';

const collection: FigmaCollection = {
	name: 'Color',
	defaultMode: 'light',
	modes: ['light', 'dark'],
	variables: [{
		name: 'clr-ink',
		type: 'COLOR',
		values: {
			light: { hex: '#000000', rgba: { r: 0, g: 0, b: 0, a: 1 } },
			dark: { hex: '#ffffff', rgba: { r: 1, g: 1, b: 1, a: 1 } },
		},
	}],
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
				id: 'temp_mode_dark',
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
		expect(() => buildPayload(collection, {
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
		})).toThrow('Align the default mode in Figma before syncing');
	});
});
