import { describe, expect, it } from 'vitest';
import { deriveShadowRange } from './authoring.js';

describe('deriveShadowRange', () => {
	it('interpolates matching layered box-shadow geometry', () => {
		const range = deriveShadowRange({
			kind: 'box',
			order: ['min', 'lo', 'base', 'hi', 'max'],
			anchors: {
				min: [{ x: 0, y: 1, blur: 2, color: { color: 'ink', alpha: 'min' } }],
				base: [{ x: 0, y: 5, blur: 10, spread: -2, color: { color: 'ink', alpha: 'min' } }],
				max: [{ x: 0, y: 13, blur: 30, spread: -6, color: { color: 'ink', alpha: 'min' } }],
			},
			derived: {
				lo: { between: ['min', 'base'] },
				hi: { between: ['base', 'max'], at: 0.25 },
			},
		});

		expect(range.variants.lo).toEqual([
			{ x: 0, y: 3, blur: 6, spread: -1, color: { color: 'ink', alpha: 'min' } },
		]);
		expect(range.variants.hi).toEqual([
			{ x: 0, y: 7, blur: 15, spread: -3, color: { color: 'ink', alpha: 'min' } },
		]);
		expect(range.displayOrder).toEqual(['min', 'lo', 'base', 'hi', 'max']);
	});

	it('refuses to invent layer pairing, inset state, or semantic colors', () => {
		expect(() =>
			deriveShadowRange({
				kind: 'box',
				order: ['base', 'max', 'middle'],
				anchors: {
					base: [{ x: 0, y: 1, blur: 2, color: { color: 'ink' } }],
					max: [
						{ x: 0, y: 1, blur: 2, color: { color: 'ink' } },
						{ x: 0, y: 4, blur: 12, color: { color: 'ink' } },
					],
				},
				derived: { middle: { between: ['base', 'max'] } },
			})
		).toThrow(/different layer counts/);

		expect(() =>
			deriveShadowRange({
				kind: 'text',
				order: ['base', 'max', 'middle'],
				anchors: {
					base: [{ x: 0, y: 0, blur: 2, color: { color: 'pri', alpha: 'min' } }],
					max: [{ x: 0, y: 0, blur: 8, color: { color: 'pri', alpha: 'max' } }],
				},
				derived: { middle: { between: ['base', 'max'] } },
			})
		).toThrow(/different semantic colors/);
	});
});
