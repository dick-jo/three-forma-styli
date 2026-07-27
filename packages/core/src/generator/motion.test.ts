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
					reducedMotion: {
						base: { duration: 0, delay: 0 },
						variants: {
							max: 'preserve',
						},
					},
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
		expect(ir.motion?.recipes.hover?.reducedMotion.base).toMatchObject({
			behavior: 'override',
			duration: { token: null, milliseconds: 0 },
		});
		expect(ir.motion?.recipes.hover?.reducedMotion.variants.min).toMatchObject({
			behavior: 'override',
			duration: { token: null, milliseconds: 0 },
		});
		expect(ir.motion?.recipes.hover?.reducedMotion.variants.max).toMatchObject({
			behavior: 'preserve',
			duration: { token: 't-ambient-2', milliseconds: 2000 },
		});
		expect(ir.mediaOverrides['(prefers-reduced-motion: reduce)']).toMatchObject({
			'motion-hover-duration': { value: '0ms' },
			'motion-hover-min-duration': { value: '0ms' },
		});
		expect(ir.mediaOverrides['(prefers-reduced-motion: reduce)']).not.toHaveProperty(
			'motion-hover-max-duration'
		);
	});

	it('allows arbitrary author recipe and variant names', () => {
		const input = system();
		input.motion!.recipes = {
			linger: {
				base: { duration: 2, easing: 'standard' },
				variants: { whisper: { duration: 'min' } },
				reducedMotion: 'preserve',
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

	it('requires an explicit reduced-motion policy and validates overrides', () => {
		const missing = system();
		delete (missing.motion!.recipes.hover as Partial<(typeof missing.motion.recipes)['hover']>)
			.reducedMotion;
		expect(() => generate(missing)).toThrow(/reducedMotion is required/);

		const unknownVariant = system();
		if (unknownVariant.motion!.recipes.hover!.reducedMotion !== 'preserve') {
			unknownVariant.motion!.recipes.hover!.reducedMotion.variants = {
				unknown: { duration: 0 },
			};
		}
		expect(() => generate(unknownVariant)).toThrow(/references unknown variant "unknown"/);

		const empty = system();
		if (empty.motion!.recipes.hover!.reducedMotion !== 'preserve') {
			empty.motion!.recipes.hover!.reducedMotion.base = {};
		}
		expect(() => generate(empty)).toThrow(/must override duration, easing, or delay/);

		const invalidVariants = system();
		if (invalidVariants.motion!.recipes.hover!.reducedMotion !== 'preserve') {
			invalidVariants.motion!.recipes.hover!.reducedMotion.variants = [] as never;
		}
		expect(() => generate(invalidVariants)).toThrow(/reducedMotion\.variants must be an object/);
	});
});
