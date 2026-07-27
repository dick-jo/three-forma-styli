import { describe, expect, it } from 'vitest';
import type { TfsProject } from '../project.js';
import { workspacePlanContext } from './context.js';

function project(system: TfsProject['system'], fonts: TfsProject['fonts'] = {}): TfsProject {
	return {
		kind: 'three-forma-styli/project',
		schemaVersion: 1,
		fonts,
		system,
		output: { directory: './generated' },
	};
}

describe('workspacePlanContext', () => {
	it('derives one capability model for every compiler entrypoint', () => {
		const context = workspacePlanContext(
			project({
				colors: {
					modes: [
						{
							name: 'default',
							tokens: {
								canvas: { mode: 'oklch', l: 0.1, c: 0, h: 0 },
								ink: { mode: 'oklch', l: 0.9, c: 0, h: 0 },
							},
						},
					],
					alphaSchedule: {},
					luminance: {
						minimumLuminanceDelta: 0.4,
						backgroundColors: ['canvas'],
						foregroundColors: ['ink'],
					},
					runtimeThemes: { colorNames: ['canvas', 'ink'] },
				},
				shadows: {
					unit: 'px',
					box: {
						focus: {
							base: [
								{
									x: 0,
									y: 0,
									blur: 4,
									color: { color: 'ink' },
								},
							],
						},
					},
				},
			})
		);

		expect(context).toEqual({
			hasColors: true,
			hasRuntimeColorPolicy: true,
			hasTypography: false,
			hasShadows: true,
			hasFonts: false,
		});
	});

	it('does not infer a runtime payload from luminance policy alone', () => {
		const context = workspacePlanContext(
			project({
				colors: {
					modes: [{ name: 'default', tokens: { ink: { mode: 'oklch', l: 0.9 } } }],
					alphaSchedule: {},
					luminance: {
						minimumLuminanceDelta: 0.4,
						backgroundColors: ['ink'],
						foregroundColors: ['ink'],
					},
				},
			})
		);

		expect(context.hasColors).toBe(true);
		expect(context.hasRuntimeColorPolicy).toBe(false);
	});

	it('accepts planning facts discovered from physical inputs', () => {
		const context = workspacePlanContext(project({}), {
			hasFonts: true,
		});
		expect(context.hasFonts).toBe(true);
	});
});
