import { describe, expect, it } from 'vitest';
import { generate, oklch } from '../index.js';
import { toShadowCss, toShadowCssModuleTypes } from './shadow-css.js';

const ir = generate({
	colors: {
		modes: [
			{
				name: 'default',
				isDefault: true,
				tokens: { ink: oklch(0.1, 0, 0), pri: oklch(0.7, 0.2, 300) },
			},
		],
		alphaSchedule: { lo: 0.2 },
	},
	shadows: {
		unit: 'px',
		box: {
			elevation: {
				base: [{ x: 0, y: 1, blur: 4, color: { color: 'ink', alpha: 'lo' } }],
				variants: {
					max: [{ x: 0, y: 8, blur: 24, color: { color: 'ink', alpha: 'lo' } }],
				},
			},
		},
		text: {
			glow: {
				base: [{ x: 0, y: 0, blur: 8, color: { color: 'pri', alpha: 'lo' } }],
			},
		},
	},
});

describe('shadow CSS helpers', () => {
	it('emits ordinary, kebab-case global classes by default', () => {
		const css = toShadowCss(ir);
		expect(css).toContain('.shadow--box-elevation {');
		expect(css).toContain('box-shadow: var(--shadow-box-elevation);');
		expect(css).toContain('.shadow--box-elevation-max {');
		expect(css).toContain('.shadow--text-glow {');
		expect(css).toContain('text-shadow: var(--shadow-text-glow);');
	});

	it('supports explicit zero specificity and CSS Module output', () => {
		expect(toShadowCss(ir, { specificity: 'zero' })).toContain(':where(.shadow--box-elevation)');
		const moduleCss = toShadowCss(ir, { scope: 'module' });
		expect(moduleCss).toContain('.box-elevation {');
		expect(moduleCss).not.toContain('.shadow--');
		expect(toShadowCssModuleTypes(ir)).toContain('readonly "box-elevation-max": string;');
	});
});
