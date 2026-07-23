import { describe, expect, it } from 'vitest';
import { fontFromManifest } from './prepared-font.js';

describe('fontFromManifest', () => {
	it('preserves raw face capabilities without inventing semantic aliases', () => {
		const font = fontFromManifest(
			{
				schemaVersion: 2,
				families: {
					editorial: {
						family: 'Editorial Sans',
						faces: [
							{
								style: 'normal',
								weight: { min: 100, max: 800 },
								features: ['kern', 'liga'],
								axes: { wght: { min: 100, default: 400, max: 800 } },
							},
							{ style: 'italic', weight: { min: 100, max: 800 } },
						],
					},
				},
			},
			'editorial',
			{ category: 'sans' }
		);

		expect(font).toEqual({
			family: 'Editorial Sans',
			fallbacks: ['system-ui', 'sans-serif'],
			verification: 'prepared',
			diagnostics: { warnings: [] },
			capabilities: {
				faces: [
					{
						style: 'normal',
						weights: { min: 100, max: 800 },
						features: ['kern', 'liga'],
						axes: { wght: { min: 100, default: 400, max: 800 } },
					},
					{
						style: 'italic',
						weights: { min: 100, max: 800 },
						features: undefined,
						axes: undefined,
					},
				],
			},
		});
		expect('weights' in font).toBe(false);
	});

	it('preserves exact static cuts as separate physical faces', () => {
		const font = fontFromManifest(
			{
				schemaVersion: 2,
				families: {
					example: {
						family: 'Example',
						faces: [300, 400, 800].map((weight) => ({ style: 'normal', weight })),
					},
				},
			},
			'example',
			{ fallbacks: ['serif'] }
		);
		expect(font.capabilities?.faces.map((face) => face.weights)).toEqual([[300], [400], [800]]);
	});

	it('allows a physically valid italic-only family and leaves role policy to validation', () => {
		const font = fontFromManifest(
			{
				schemaVersion: 2,
				families: {
					example: { family: 'Example', faces: [{ style: 'italic', weight: 400 }] },
				},
			},
			'example',
			{ category: 'serif' }
		);
		expect(font.capabilities?.faces[0].style).toBe('italic');
	});

	it('rejects duplicate and overlapping face descriptors', () => {
		expect(() =>
			fontFromManifest(
				{
					schemaVersion: 2,
					families: {
						example: {
							family: 'Example',
							faces: [
								{ style: 'normal', weight: { min: 100, max: 700 } },
								{ style: 'normal', weight: 400 },
							],
						},
					},
				},
				'example',
				{ category: 'sans' }
			)
		).toThrow('overlapping normal weight faces');
	});

	it('requires an intentional fallback category or stack', () => {
		expect(() =>
			fontFromManifest(
				{
					schemaVersion: 2,
					families: {
						example: { family: 'Example', faces: [{ style: 'normal', weight: 400 }] },
					},
				},
				'example'
			)
		).toThrow('requires options.category or a non-empty options.fallbacks');
	});

	it('rejects unsupported schemas and inconsistent variable-axis evidence', () => {
		expect(() =>
			fontFromManifest(
				{
					schemaVersion: 1,
					families: {
						example: { family: 'Example', faces: [{ style: 'normal', weight: 400 }] },
					},
				},
				'example',
				{ category: 'sans' }
			)
		).toThrow('schemaVersion 1 is unsupported');

		expect(() =>
			fontFromManifest(
				{
					schemaVersion: 2,
					families: {
						example: {
							family: 'Example',
							faces: [
								{
									style: 'normal',
									weight: { min: 100, max: 800 },
									axes: { wght: { min: 100, max: 700 } },
								},
							],
						},
					},
				},
				'example',
				{ category: 'sans' }
			)
		).toThrow('inconsistent weight and wght axis ranges');

		expect(() =>
			fontFromManifest(
				{
					schemaVersion: 2,
					families: {
						example: {
							family: 'Example',
							faces: [
								{
									style: 'normal',
									weight: 400,
									axes: { slnt: { min: -12, max: 0 } },
								},
							],
						},
					},
				},
				'example',
				{ category: 'sans' }
			)
		).toThrow('variable ital/slnt axis');
	});
});
