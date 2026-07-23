import { describe, expect, it } from 'vitest';
import { generate } from '../generator/index.js';
import { toTypographySpecimen } from './typography-specimen.js';
import type { DesignSystem } from '../types.js';

const typography: DesignSystem['typography'] = {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 8 },
		},
		{
			name: 'display',
			tokens: { unit: 'rem', base: 1.5, min: 1, increment: 0.5, range: 10 },
		},
	],
	fonts: {
		editorial: {
			family: 'Editorial',
			fallbacks: ['serif'],
			verification: 'unavailable',
		},
	},
	roles: {
		reading: {
			font: 'editorial',
			base: { fontSize: 2, weight: 'regular', lineHeight: 1.3, letterSpacing: 0 },
			variants: {
				legal: { fontSize: 'min', weight: 'strong', lineHeight: 1.4, letterSpacing: 0.01 },
			},
			modeOverrides: {
				display: {
					base: { fontSize: 6, weight: 'strong', lineHeight: 0.9, letterSpacing: -0.02 },
				},
			},
			displayOrder: ['legal', 'base'],
			weights: { regular: 400, strong: 700 },
		},
	},
};

describe('toTypographySpecimen', () => {
	it('generates a generic interactive role and variant calibration workbench', () => {
		const html = toTypographySpecimen(generate({ typography }), { title: 'Example system' });
		expect(html).toContain('<!doctype html>');
		expect(html).toContain('<title>Example system</title>');
		expect(html).toContain('data-type-role="reading"');
		expect(html).toContain('data-type-variant="legal"');
		expect(html).toContain('font-size: var(--text-reading-font-size)');
		expect(html).toContain('font-size: var(--text-reading-legal-font-size)');
		expect(html).toContain('Draft configuration patch');
		expect(html).toContain('data-control="lineHeight"');
		expect(html.match(/step="any"/g)).toHaveLength(4);
		expect(html).toContain('data-control="weight"');
		expect(html).toContain('<select id="size-mode">');
		expect(html).toContain('<option value="display">display</option>');
		expect(html).toContain('body[data-size-mode="display"]');
		expect(html).toContain('--text-reading-line-height: 0.9;');
		expect(html).toContain('const defaultSizeMode="default"');
		expect(html).toContain('"display":{"reading":{"base":{"fontSize":6');
		expect(html).toContain('roles[role].modeOverrides[mode]');
		expect(html).toContain('sizeModeSelect?.addEventListener');
		expect(html).toContain("querySelectorAll('.sample-preview,.sample-copy')");
		expect(html).toContain('weight strong · 700');
		expect(html).toContain('weight:controls.weight.value');
		expect(html.indexOf('<strong>legal</strong>')).toBeLessThan(
			html.indexOf('<strong>base</strong>')
		);
		expect(html).toContain('class="metric-probe"');
		expect(html).toContain("CSS.supports('height','1cap')");
		expect(html).toContain("control.addEventListener('dblclick'");
		expect(html).toContain('Reset recipe');
		expect(html).not.toContain('calc(1em - 1px)');
		expect(html).toContain('No @font-face CSS was supplied');
		expect(html).not.toContain('Collection activity');
		expect(html).not.toContain('data-fallback-measure=');
		expect(html).not.toContain('Measured fallback comparison');
		expect(html.match(/<\/script>/g)).toHaveLength(1);
		expect(html).not.toContain('</script>\n</script>');
	});

	it('embeds supplied font CSS, escapes metadata, and checks loaded faces', () => {
		const html = toTypographySpecimen(generate({ typography }), {
			title: '<unsafe>',
			fontFaceCss: '@font-face { font-family: "Example"; }',
			fontFaceHref: './fonts.css',
		});
		expect(html).toContain('<title>&lt;unsafe&gt;</title>');
		expect(html).toContain('@font-face { font-family: "Example"; }');
		expect(html).toContain('href="./fonts.css"');
		expect(html).toContain('Font assets are connected');
		expect(html).toContain('font-synthesis: none');
		expect(html).toContain('Array.from(document.fonts)');
	});

	it('measures residual adjusted-fallback width and wrapping changes in the browser', () => {
		const html = toTypographySpecimen(generate({ typography }), {
			fontFaceHref: './fonts.css',
			adjustedFallbackFamilies: { reading: '__tfs-editorial-adjusted-fallback' },
		});
		expect(html).toContain('force adjusted fallback');
		expect(html).toContain('body[data-fallback=true] [data-type-role="reading"]');
		expect(html).toContain('"__tfs-editorial-adjusted-fallback", "serif"');
		expect(html).toContain('document.body.dataset.fallback=String(fallbackToggle.checked)');
		expect(html).toContain('Measured fallback comparison');
		expect(html).toContain('residual reflow—not a pass/fail score or approval state');
		expect(html.match(/data-fallback-measure=/g)).toHaveLength(5);
		expect(html.match(/data-fallback-diagnostic=/g)).toHaveLength(5);
		expect(html).toContain('reading::recipe::legal');
		expect(html).toContain('reading::stress::narrow');
		expect(html).toContain('reading::stress::glyphs');
		expect(html).toContain('const primaryFamilyStacks={"reading":"\\"Editorial\\", \\"serif\\""}');
		expect(html).toContain(
			'const adjustedFamilyStacks={"reading":"\\"__tfs-editorial-adjusted-fallback\\", \\"serif\\""}'
		);
		expect(html).toContain('document.fonts.load(descriptor+stack');
		expect(html).toContain('function renderedLineCount(element)');
		expect(html).toContain("'inline width Δ '");
		expect(html).toContain('line count Δ');
		expect(html).toContain('.wrap-s{width:18rem;max-width:100%}');
		expect(html).toContain('.wrap-l{width:32rem;max-width:100%}');
		expect(html).not.toContain('.wrap-s{max-width:34ch}');
		expect(html).toContain("element.closest('[data-type-role]')");
		expect(html.match(/async function refreshFallbackDiagnostics/g)).toHaveLength(1);
		expect(html.match(/<script>/g)).toHaveLength(1);
		expect(html.match(/<\/script>/g)).toHaveLength(1);
		const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
		expect(script).toBeDefined();
		expect(() => new Function(script!)).not.toThrow();
	});

	it('ignores fallback entries for roles outside the typography contract', () => {
		const html = toTypographySpecimen(generate({ typography }), {
			adjustedFallbackFamilies: { missing: '__tfs-missing-adjusted-fallback' },
		});
		expect(html).not.toContain('force adjusted fallback');
		expect(html).not.toContain('Measured fallback comparison');
		expect(html).not.toContain('data-fallback-measure=');
	});

	it('can disable calibration controls for a static evidence artifact', () => {
		const html = toTypographySpecimen(generate({ typography }), { interactive: false });
		expect(html).not.toContain('data-control="lineHeight"');
		expect(html).not.toContain('Draft configuration patch');
	});

	it('uses configured atomic and semantic typography prefixes', () => {
		const ir = generate(
			{ typography },
			{ prefixes: { typography: 'font-size', typographyRole: 'copy' } }
		);
		const html = toTypographySpecimen(ir);
		expect(html).toContain('font-size: var(--copy-reading-font-size)');
		expect(html).toContain('font-style: var(--copy-reading-font-style)');
		expect(html).toContain('>--font-size-2</option>');
		expect(html).toContain('data-atomic-prefix="font-size"');
		expect(html).toContain("'var(--'+panel.dataset.atomicPrefix+'-'+value.fontSize+')'");
	});

	it('requires semantic roles', () => {
		const ir = generate({
			typography: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 12 },
					},
				],
			},
		});
		expect(() => toTypographySpecimen(ir)).toThrow('semantic roles is required');
	});
});
