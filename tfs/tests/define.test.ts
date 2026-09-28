import { describe, expect, it } from 'vitest';
import { cubicBezier, deriveAlphaScale, linear, oklch, shadowsForColors } from 'three-forma-styli';
import config from './fixtures/everything/tfs.config.js';

describe('authoring helpers return plain data', () => {
	it('oklch', () => {
		expect(oklch(0.7, 0.16, 285)).toEqual({ mode: 'oklch', l: 0.7, c: 0.16, h: 285 });
	});

	it('deriveAlphaScale divides evenly, matching 0.4.0', () => {
		expect(deriveAlphaScale({ distribution: 'linear', min: 0.1, max: 0.6 }).values).toEqual({
			min: 0.1,
			'lo-x': 0.2,
			lo: 0.3,
			hi: 0.4,
			'hi-x': 0.5,
			max: 0.6,
		});
		expect(deriveAlphaScale({ distribution: 'linear', max: 0.6 }).values.min).toBe(0.1);
	});

	it('easing constructors', () => {
		expect(cubicBezier(0.2, 0, 0.38, 0.9)).toEqual({
			type: 'cubicBezier',
			value: [0.2, 0, 0.38, 0.9],
		});
		expect(linear()).toEqual({
			type: 'linear',
			value: [
				[0, 0],
				[1, 1],
			],
		});
	});

	it('shadowsForColors copies one design per colour', () => {
		const layer = { x: 0, y: 0, blur: 4 };
		const ranges = shadowsForColors({
			prefix: 'glow',
			colors: ['pri', 'duo'],
			range: { min: [{ ...layer, alpha: 'min' }], lo: [layer], hi: [layer], max: [layer] },
		});
		expect(Object.keys(ranges)).toEqual(['glow-pri', 'glow-duo']);
		expect(ranges['glow-duo'].min).toEqual([{ ...layer, color: { color: 'duo', alpha: 'min' } }]);
		expect(ranges['glow-duo'].lo).toEqual([{ ...layer, color: { color: 'duo' } }]);
	});
});

describe('the everything-project assembles', () => {
	it('contains every domain', () => {
		expect(Object.keys(config.system)).toEqual([
			'axes',
			'alpha',
			'colors',
			'spacing',
			'gap',
			'border',
			'shadows',
			'time',
			'easings',
			'fontSize',
			'fonts',
			'typography',
		]);
		expect(Object.keys(config.system.shadows.ranges)).toEqual(['glow-pri', 'glow-duo']);
	});
});
