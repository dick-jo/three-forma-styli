import { describe, expect, it } from 'vitest';
import { generate } from '../generator/index.js';
import type { PartialDesignSystem } from '../types.js';
import { createReviewCapturePlan } from './capture.js';
import { createWorkbenchContract } from './contract.js';

const system: PartialDesignSystem = {
	colors: {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { ink: { mode: 'oklch', l: 0.1, c: 0, h: 0 } },
			},
			{
				name: 'light',
				tokens: { ink: { mode: 'oklch', l: 0.9, c: 0, h: 0 } },
			},
		],
	},
	typography: {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.125, range: 4 },
			},
			{
				name: 'display',
				tokens: { unit: 'rem', base: 2, min: 1, increment: 0.5, range: 4 },
			},
		],
		fonts: {
			sans: {
				family: 'Example Sans',
				fallbacks: ['sans-serif'],
				verification: 'unavailable',
			},
		},
		roles: {
			prose: {
				font: 'sans',
				weights: { base: 400 },
				base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0, weight: 'base' },
			},
		},
	},
	shadows: {
		unit: 'px',
		box: {
			elevation: {
				base: [{ x: 0, y: 1, blur: 4, color: { color: 'ink' } }],
			},
		},
	},
};

describe('createReviewCapturePlan', () => {
	it('expands domain-aware policies into exact portable browser states', () => {
		const contract = createWorkbenchContract(system, generate(system), {
			systemFingerprint: 'abc123',
			toolVersion: '0.2.0',
			stylesheets: ['./system.css'],
		});
		const plan = createReviewCapturePlan(contract);

		expect(plan).toMatchObject({
			kind: 'three-forma-styli/review-captures',
			schemaVersion: 1,
			systemFingerprint: 'abc123',
			entrypoint: './index.html',
		});
		expect(plan.states).toHaveLength(7);
		expect(plan.states.map((state) => state.id)).toEqual([
			'overview--viewport-desktop--color-default--size-default',
			'color--default--ink--viewport-desktop--color-default--size-default',
			'color--light--ink--viewport-desktop--color-light--size-default',
			'typography--prose--base--viewport-desktop--color-default--size-default',
			'typography--display--prose--base--viewport-desktop--color-default--size-display',
			'shadows--box--elevation--base--viewport-desktop--color-default--size-default',
			'shadows--box--elevation--base--viewport-desktop--color-light--size-default',
		]);
		expect(plan.states[4]).toEqual({
			id: 'typography--display--prose--base--viewport-desktop--color-default--size-display',
			lab: 'typography',
			caseId: 'typography--display--prose--base',
			viewport: { id: 'desktop', width: 1440, height: 900 },
			colorMode: 'default',
			sizeMode: 'display',
			url: './index.html?lab=typography&case=typography--display--prose--base&view=case&color=default&size=display',
		});
	});

	it('rejects capture policies that reference unknown modes or viewports', () => {
		const contract = createWorkbenchContract(system, generate(system), {
			systemFingerprint: 'invalid',
			toolVersion: '0.2.0',
			stylesheets: [],
		});
		const color = contract.labs.find((lab) => lab.kind === 'color')!;
		color.cases[0]!.capture.colorModes = ['missing'];
		expect(() => createReviewCapturePlan(contract)).toThrow(
			'requests unknown color mode "missing"'
		);

		color.cases[0]!.capture.colorModes = ['$default'];
		color.cases[0]!.capture.viewports = ['missing'];
		expect(() => createReviewCapturePlan(contract)).toThrow('requests unknown viewport "missing"');
	});
});
