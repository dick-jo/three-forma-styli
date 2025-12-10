import { describe, it, expect } from 'vitest';
import { generateTimeTokens } from './time.js';
import { defaultGeneratorConfig } from './types.js';
import type { DesignSystem } from '../types.js';

describe('generateTimeTokens', () => {
	const singleModeTime: DesignSystem['time'] = {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: {
					unit: 'ms',
					base: 100,
					min: 50,
					range: 5,
				},
			},
		],
	};

	it('generates min token for default mode', () => {
		const result = generateTimeTokens(singleModeTime, defaultGeneratorConfig);

		const tMin = result.defaultTokens.find((t) => t.name === 't-min');
		expect(tMin).toBeDefined();
		expect(tMin?.value).toBe('50ms');
		expect(tMin?.rawValue).toBe(50);
		expect(tMin?.unit).toBe('ms');
		expect(tMin?.family).toBe('time');
	});

	it('generates numbered tokens using multiplicative formula', () => {
		const result = generateTimeTokens(singleModeTime, defaultGeneratorConfig);

		const t1 = result.defaultTokens.find((t) => t.name === 't-1');
		const t2 = result.defaultTokens.find((t) => t.name === 't-2');
		const t5 = result.defaultTokens.find((t) => t.name === 't-5');

		expect(t1?.value).toBe('100ms'); // 100 * 1
		expect(t2?.value).toBe('200ms'); // 100 * 2
		expect(t5?.value).toBe('500ms'); // 100 * 5
	});

	it('generates correct number of tokens (min + range)', () => {
		const result = generateTimeTokens(singleModeTime, defaultGeneratorConfig);

		// min + 5 range = 6 tokens
		expect(result.defaultTokens).toHaveLength(6);
	});

	it('stores timeCategory in metadata', () => {
		const result = generateTimeTokens(singleModeTime, defaultGeneratorConfig);

		const t1 = result.defaultTokens.find((t) => t.name === 't-1');
		expect(t1?.metadata?.timeCategory).toBe('default');
	});

	describe('multiple modes', () => {
		const multiModeTime: DesignSystem['time'] = {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						unit: 'ms',
						base: 100,
						min: 50,
						range: 3,
					},
				},
				{
					name: 'anim',
					tokens: {
						unit: 'ms',
						base: 1000,
						min: 500,
						range: 3,
					},
				},
			],
		};

		it('default mode gets unprefixed tokens', () => {
			const result = generateTimeTokens(multiModeTime, defaultGeneratorConfig);

			const t1 = result.defaultTokens.find((t) => t.name === 't-1');
			const tMin = result.defaultTokens.find((t) => t.name === 't-min');

			expect(t1).toBeDefined();
			expect(t1?.value).toBe('100ms');
			expect(tMin).toBeDefined();
			expect(tMin?.value).toBe('50ms');
		});

		it('non-default modes get their name as prefix', () => {
			const result = generateTimeTokens(multiModeTime, defaultGeneratorConfig);

			const tAnim1 = result.defaultTokens.find((t) => t.name === 't-anim-1');
			const tAnimMin = result.defaultTokens.find((t) => t.name === 't-anim-min');

			expect(tAnim1).toBeDefined();
			expect(tAnim1?.value).toBe('1000ms');
			expect(tAnimMin).toBeDefined();
			expect(tAnimMin?.value).toBe('500ms');
		});

		it('all modes output to defaultTokens (no overrideTokens)', () => {
			const result = generateTimeTokens(multiModeTime, defaultGeneratorConfig);

			// default: min + 3 = 4 tokens
			// anim: min + 3 = 4 tokens
			// Total: 8 tokens, all in defaultTokens
			expect(result.defaultTokens).toHaveLength(8);
			expect(result.overrideTokens).toEqual({});
			expect(result.modeInfo.overrides).toEqual([]);
		});

		it('uses first mode as default when no isDefault specified', () => {
			const timeNoDefault: DesignSystem['time'] = {
				modes: [
					{
						name: 'first',
						tokens: {
							unit: 'ms',
							base: 100,
							min: 50,
							range: 2,
						},
					},
					{
						name: 'second',
						tokens: {
							unit: 'ms',
							base: 200,
							min: 100,
							range: 2,
						},
					},
				],
			};

			const result = generateTimeTokens(timeNoDefault, defaultGeneratorConfig);

			// First mode should be unprefixed
			const t1 = result.defaultTokens.find((t) => t.name === 't-1');
			expect(t1?.value).toBe('100ms'); // first mode's base

			// Second mode should be prefixed
			const tSecond1 = result.defaultTokens.find((t) => t.name === 't-second-1');
			expect(tSecond1?.value).toBe('200ms');
		});

		it('stores correct timeCategory for each mode', () => {
			const result = generateTimeTokens(multiModeTime, defaultGeneratorConfig);

			const t1 = result.defaultTokens.find((t) => t.name === 't-1');
			const tAnim1 = result.defaultTokens.find((t) => t.name === 't-anim-1');

			expect(t1?.metadata?.timeCategory).toBe('default');
			expect(tAnim1?.metadata?.timeCategory).toBe('anim');
		});
	});

	describe('custom prefix', () => {
		it('respects custom time prefix from config', () => {
			const customConfig = {
				...defaultGeneratorConfig,
				prefixes: {
					...defaultGeneratorConfig.prefixes,
					time: 'time',
				},
			};

			const result = generateTimeTokens(singleModeTime, customConfig);

			const time1 = result.defaultTokens.find((t) => t.name === 'time-1');
			expect(time1).toBeDefined();
		});

		it('applies custom prefix to non-default modes too', () => {
			const customConfig = {
				...defaultGeneratorConfig,
				prefixes: {
					...defaultGeneratorConfig.prefixes,
					time: 'dur',
				},
			};

			const multiModeTime: DesignSystem['time'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'ms', base: 100, min: 50, range: 2 },
					},
					{
						name: 'slow',
						tokens: { unit: 'ms', base: 500, min: 250, range: 2 },
					},
				],
			};

			const result = generateTimeTokens(multiModeTime, customConfig);

			const dur1 = result.defaultTokens.find((t) => t.name === 'dur-1');
			const durSlow1 = result.defaultTokens.find((t) => t.name === 'dur-slow-1');

			expect(dur1).toBeDefined();
			expect(durSlow1).toBeDefined();
		});
	});

	describe('edge cases', () => {
		it('handles base of 0 (for reduced-motion scenarios)', () => {
			const zeroBaseTime: DesignSystem['time'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: {
							unit: 'ms',
							base: 0,
							min: 0,
							range: 3,
						},
					},
				],
			};

			const result = generateTimeTokens(zeroBaseTime, defaultGeneratorConfig);

			const t1 = result.defaultTokens.find((t) => t.name === 't-1');
			const t2 = result.defaultTokens.find((t) => t.name === 't-2');

			expect(t1?.value).toBe('0ms');
			expect(t2?.value).toBe('0ms');
		});

		it('handles seconds unit', () => {
			const secondsTime: DesignSystem['time'] = {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: {
							unit: 's',
							base: 0.5,
							min: 0.1,
							range: 3,
						},
					},
				],
			};

			const result = generateTimeTokens(secondsTime, defaultGeneratorConfig);

			const tMin = result.defaultTokens.find((t) => t.name === 't-min');
			const t1 = result.defaultTokens.find((t) => t.name === 't-1');
			const t2 = result.defaultTokens.find((t) => t.name === 't-2');

			expect(tMin?.value).toBe('0.1s');
			expect(t1?.value).toBe('0.5s');
			expect(t2?.value).toBe('1s');
		});
	});
});
