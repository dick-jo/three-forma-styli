import { describe, expect, it } from 'vitest';
import { generate } from '../generator/index.js';
import { toTypographyCss, toTypographyCssModuleTypes } from './typography-css.js';

const system = {
	typography: {
		modes: [
			{
				name: 'default',
				isDefault: true as const,
				tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 8 },
			},
		],
		fonts: {
			interface: {
				family: 'Interface',
				fallbacks: ['sans-serif'],
				verification: 'prepared' as const,
				capabilities: {
					faces: [
						{ style: 'normal' as const, weights: [400, 700] },
						{ style: 'italic' as const, weights: [400] },
					],
				},
			},
		},
		roles: {
			control: {
				font: 'interface',
				base: { fontSize: 2, weight: 'regular', lineHeight: 1.2, letterSpacing: 0 },
				variants: {
					compact: { fontSize: 1, weight: 'strong', lineHeight: 1.1, letterSpacing: 0.01 },
				},
				weights: { regular: 400, strong: 700 },
				styles: {
					normal: { weights: ['regular', 'strong'] },
					italic: { weights: ['regular'] },
				},
			},
		},
	},
};

describe('typography CSS recipes', () => {
	it('emits unsuffixed base and arbitrary ordinary-class kebab-case helpers', () => {
		const css = toTypographyCss(generate(system));
		expect(css).toContain('.text--control {');
		expect(css).toContain('.text--control-compact {');
		expect(css).toContain('font-family: var(--text-control-font-family);');
		expect(css).toContain('font-weight: var(--text-control-font-weight);');
		expect(css).toContain('font-weight: var(--text-control-compact-font-weight);');
		expect(css).toContain('font-synthesis: none;');
		expect(css).toContain('.text--control-style-normal-weight-strong {');
		expect(css).not.toContain('.text--control-weight-strong)');
		expect(css).toContain('.text--control-style-italic-weight-regular {');
		expect(css).not.toContain('.text--control-style-italic-weight-strong)');
		expect(css).not.toContain('.controlCompact');
	});

	it('supports deliberate zero-specificity global helpers', () => {
		const css = toTypographyCss(generate(system), { specificity: 'zero' });
		expect(css).toContain(':where(.text--control) {');
		expect(css).toContain(':where(.text--control-compact) {');
	});

	it('supports a caller-owned global prefix and places supplied font faces first', () => {
		const css = toTypographyCss(generate(system), {
			classPrefix: 'app-type',
			fontFaceCss: '@font-face { font-family: "Interface"; src: url("./fonts/interface.woff2"); }',
		});
		expect(css).toContain('.app-type--control {');
		expect(css.indexOf('@font-face')).toBeLessThan(css.indexOf('.app-type--control'));
		expect(() => toTypographyCss(generate(system), { classPrefix: 'bad prefix' })).toThrow(
			'CSS-safe'
		);
	});

	it('derives the helper namespace from a configured semantic token namespace', () => {
		const css = toTypographyCss(generate(system, { prefixes: { typographyRole: 'copy' } }));
		expect(css).toContain('.copy--control {');
		expect(css).toContain('font-family: var(--copy-control-font-family);');
	});

	it('accepts the earlier separator-bearing prefix without duplicating punctuation', () => {
		const css = toTypographyCss(generate(system), { classPrefix: 'text--' });
		expect(css).toContain('.text--control {');
		expect(css).not.toContain('.text----control');
	});

	it('emits local CSS Module classes and matching literal declarations', () => {
		const ir = generate(system);
		const css = toTypographyCss(ir, { scope: 'module' });
		const types = toTypographyCssModuleTypes(ir);
		expect(css).toContain('.control {');
		expect(css).toContain('.control-compact {');
		expect(css).not.toContain(':where(');
		expect(types).toContain('readonly "control": string;');
		expect(types).toContain('readonly "control-compact": string;');
		expect(types).toContain('readonly "control-style-normal-weight-strong": string;');
	});
});
