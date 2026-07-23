import { describe, expect, it } from 'vitest';
import type { PartialDesignSystem } from '../types.js';
import { generate, ValidationError } from './index.js';

function system(): PartialDesignSystem {
	return {
		time: {
			scales: [
				{
					name: 'default',
					isDefault: true,
					tokens: { unit: 'ms', base: 100, min: 50, range: 4 },
				},
				{
					name: 'ambient',
					tokens: { unit: 's', base: 1, min: 0.5, range: 3 },
				},
			],
		},
		motion: {
			easings: {
				standard: [0.2, 0, 0.38, 0.9],
				exit: [0.2, 0, 1, 0.9],
			},
			recipes: {
				hover: {
					base: { duration: 1, easing: 'standard' },
					variants: {
						min: { duration: 'min' },
						max: {
							duration: { scale: 'ambient', step: 2 },
							easing: 'exit',
							delay: 1,
						},
					},
					displayOrder: ['min', 'base', 'max'],
				},
			},
		},
	};
}

describe('motion generation', () => {
	it('emits reusable property-agnostic fragments and portable JS values', () => {
		const ir = generate(system());

		expect(ir.tokens['motion-ease-standard']?.value).toBe('cubic-bezier(0.2, 0, 0.38, 0.9)');
		expect(ir.tokens['motion-hover']?.value).toBe(
			'var(--motion-hover-duration) var(--motion-hover-easing) var(--motion-hover-delay)'
		);
		expect(ir.tokens['motion-hover-duration']?.value).toBe('var(--t-1)');
		expect(ir.tokens['motion-hover-delay']?.value).toBe('0ms');
		expect(ir.tokens['motion-hover-max-duration']?.value).toBe('var(--t-ambient-2)');
		expect(ir.tokens['motion-hover-max-delay']?.value).toBe('var(--t-1)');

		expect(ir.motion?.recipes.hover?.base.duration).toMatchObject({
			token: 't-1',
			milliseconds: 100,
			seconds: 0.1,
		});
		expect(ir.motion?.recipes.hover?.variants.max?.duration).toMatchObject({
			token: 't-ambient-2',
			milliseconds: 2000,
			seconds: 2,
		});
		expect(ir.motion?.recipes.hover?.displayOrder).toEqual(['min', 'base', 'max']);
	});

	it('allows arbitrary author recipe and variant names', () => {
		const input = system();
		input.motion!.recipes = {
			linger: {
				base: { duration: 2, easing: 'standard' },
				variants: { whisper: { duration: 'min' } },
			},
		};
		const ir = generate(input, { prefixes: { motion: 'move' } });

		expect(ir.tokens['move-linger']?.family).toBe('motion');
		expect(ir.tokens['move-linger-whisper']?.family).toBe('motion');
	});

	it('rejects missing time, unknown easing and invalid scale references', () => {
		const missingTime = system();
		delete missingTime.time;
		expect(() => generate(missingTime)).toThrowError(
			new ValidationError('Motion requires time (motion durations reference time scales)')
		);

		const unknownEasing = system();
		unknownEasing.motion!.recipes.hover!.base.easing = 'spring';
		expect(() => generate(unknownEasing)).toThrow(/unknown easing "spring"/);

		const unknownScale = system();
		unknownScale.motion!.recipes.hover!.base.duration = { scale: 'cinematic', step: 1 };
		expect(() => generate(unknownScale)).toThrow(/unknown time scale "cinematic"/);
	});

	it('rejects invalid Bézier x coordinates and incomplete display order', () => {
		const invalidCurve = system();
		invalidCurve.motion!.easings.standard = [1.2, 0, 0.38, 0.9];
		expect(() => generate(invalidCurve)).toThrow(/x coordinates must be between 0 and 1/);

		const invalidOrder = system();
		invalidOrder.motion!.recipes.hover!.displayOrder = ['base'];
		expect(() => generate(invalidOrder)).toThrow(/displayOrder must contain base/);
	});
});
