import { describe, expect, it } from 'vitest';
import { oklch, type PartialDesignSystem } from '../index.js';
import { generate, ValidationError } from './index.js';

function system(): PartialDesignSystem {
	return {
		colors: {
			modes: [
				{
					name: 'default',
					isDefault: true,
					tokens: {
						ink: oklch(0.1, 0, 0),
						pri: oklch(0.7, 0.2, 300),
					},
				},
			],
			alphaSchedule: { min: 0.08, lo: 0.2, hi: 0.6, max: 0.9 },
		},
		shadows: {
			unit: 'px',
			box: {
				elevation: {
					base: [
						{ x: 0, y: 1, blur: 2, color: { color: 'ink', alpha: 'lo' } },
						{
							x: 0,
							y: 8,
							blur: 24,
							spread: -4,
							color: { color: 'ink', alpha: 'min' },
						},
					],
					variants: {
						max: [
							{ x: 0, y: 2, blur: 4, color: { color: 'ink', alpha: 'hi' } },
							{
								x: 0,
								y: 16,
								blur: 48,
								spread: -8,
								color: { color: 'ink', alpha: 'lo' },
							},
						],
					},
					displayOrder: ['base', 'max'],
				},
			},
			text: {
				glow: {
					base: [
						{ x: 0, y: 0, blur: 2, color: { color: 'pri', alpha: 'hi' } },
						{ x: 0, y: 0, blur: 12, color: { color: 'pri', alpha: 'lo' } },
					],
				},
			},
		},
	};
}

describe('shadow generation', () => {
	it('emits ordered multi-layer box and text composites using semantic colors', () => {
		const ir = generate(system());

		expect(ir.tokens['shadow-box-elevation']?.value).toBe(
			'0px 1px 2px var(--clr-ink-a-lo), 0px 8px 24px -4px var(--clr-ink-a-min)'
		);
		expect(ir.tokens['shadow-text-glow']?.value).toBe(
			'0px 0px 2px var(--clr-pri-a-hi), 0px 0px 12px var(--clr-pri-a-lo)'
		);
		expect(ir.shadows?.box.elevation?.base.layers).toHaveLength(2);
		expect(ir.shadows?.box.elevation?.base.layers[1]).toMatchObject({
			spread: -4,
			color: { name: 'ink', alpha: 'min', token: 'clr-ink-a-min' },
		});
		expect(ir.shadows?.text.glow?.displayOrder).toEqual(['base']);
	});

	it('preserves arbitrary names and configurable namespaces', () => {
		const input = system();
		input.shadows!.box = {
			floaty: {
				base: [{ x: 0, y: 2, blur: 8, color: { color: 'ink' } }],
				variants: {
					whisper: [{ x: 0, y: 1, blur: 3, color: { color: 'ink', alpha: 'min' } }],
				},
			},
		};
		const ir = generate(input, { prefixes: { shadow: 'fx' } });
		expect(ir.tokens['fx-box-floaty']?.value).toContain('var(--clr-ink)');
		expect(ir.tokens['fx-box-floaty-whisper']?.value).toContain('var(--clr-ink-a-min)');
	});

	it('rejects unknown semantic colors and alpha levels', () => {
		const badColor = system();
		badColor.shadows!.box!.elevation!.base[0]!.color.color = 'bg';
		expect(() => generate(badColor)).toThrow(/unknown default color "bg"/);

		const badAlpha = system();
		badAlpha.shadows!.text!.glow!.base[0]!.color.alpha = 'ghost';
		expect(() => generate(badAlpha)).toThrow(/unknown alpha level "ghost"/);
	});

	it('rejects text-only grammar violations and invalid geometry', () => {
		const textSpread = system();
		(textSpread.shadows!.text!.glow!.base[0] as unknown as { spread: number }).spread = 2;
		expect(() => generate(textSpread)).toThrow(/unsupported field "spread"/);

		const negativeBlur = system();
		negativeBlur.shadows!.box!.elevation!.base[0]!.blur = -1;
		expect(() => generate(negativeBlur)).toThrow(
			new ValidationError('shadows.box.elevation.base[0].blur must be non-negative')
		);
	});
});
