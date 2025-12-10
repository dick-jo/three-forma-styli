import { describe, it, expect } from 'vitest';
import { toCss, defaultCssConfig } from './css.js';
import type { IR } from '../generator/types.js';

describe('toCss', () => {
	const minimalIR: IR = {
		tokens: {
			'sp-1': {
				family: 'spacing',
				name: 'sp-1',
				value: '8px',
				rawValue: 8,
				unit: 'px',
			},
			'clr-bg': {
				family: 'color',
				name: 'clr-bg',
				value: 'oklch(0.26 0 180)',
			},
		},
		modes: {
			color: { default: 'light', overrides: [] },
			size: { default: 'default', overrides: [] },
			time: { default: 'default', overrides: [] },
		},
		overrideTokens: {},
	};

	it('generates :root block with tokens', () => {
		const css = toCss(minimalIR);

		expect(css).toContain(':root {');
		expect(css).toContain('--sp-1: 8px;');
		expect(css).toContain('--clr-bg: oklch(0.26 0 180);');
	});

	it('uses custom root selector', () => {
		const css = toCss(minimalIR, {
			selectors: { root: 'html' },
		});

		expect(css).toContain('html {');
		expect(css).not.toContain(':root {');
	});

	describe('mode selectors', () => {
		const irWithModes: IR = {
			tokens: {
				'sp-1': { family: 'spacing', name: 'sp-1', value: '8px' },
				'clr-bg': { family: 'color', name: 'clr-bg', value: 'oklch(0.26 0 180)' },
				't-1': { family: 'time', name: 't-1', value: '100ms' },
			},
			modes: {
				color: { default: 'light', overrides: ['dark'] },
				size: { default: 'default', overrides: ['small', 'large'] },
				time: { default: 'default', overrides: ['reduced-motion'] },
			},
			overrideTokens: {
				dark: {
					'clr-bg': { family: 'color', name: 'clr-bg', value: 'oklch(0.15 0 180)' },
				},
				small: {
					'sp-1': { family: 'spacing', name: 'sp-1', value: '4px' },
				},
				large: {
					'sp-1': { family: 'spacing', name: 'sp-1', value: '16px' },
				},
				'reduced-motion': {
					't-1': { family: 'time', name: 't-1', value: '0ms' },
				},
			},
		};

		it('generates color mode overrides with data-color-mode selector', () => {
			const css = toCss(irWithModes);

			expect(css).toContain('[data-color-mode="dark"]');
			expect(css).toContain('--clr-bg: oklch(0.15 0 180);');
		});

		it('generates size mode overrides with data-size-mode selector', () => {
			const css = toCss(irWithModes);

			expect(css).toContain('[data-size-mode="small"]');
			expect(css).toContain('[data-size-mode="large"]');
		});

		it('generates time mode overrides with data-time-mode selector', () => {
			const css = toCss(irWithModes);

			expect(css).toContain('[data-time-mode="reduced-motion"]');
		});

		it('allows custom mode selectors', () => {
			const css = toCss(irWithModes, {
				selectors: {
					colorMode: '.theme-{mode}',
					sizeMode: '.size-{mode}',
					timeMode: '.motion-{mode}',
				},
			});

			expect(css).toContain('.theme-dark');
			expect(css).toContain('.size-small');
			expect(css).toContain('.motion-reduced-motion');
		});
	});

	describe('output format', () => {
		it('formats each token on its own line with proper indentation', () => {
			const css = toCss(minimalIR);
			const lines = css.split('\n');

			// Root block structure
			expect(lines[0]).toBe(':root {');
			expect(lines[1]).toMatch(/^  --/); // 2-space indent
			expect(lines.at(-1)).toBe('}');
		});

		it('separates blocks with blank lines', () => {
			const irWithOverride: IR = {
				tokens: {
					'sp-1': { family: 'spacing', name: 'sp-1', value: '8px' },
				},
				modes: {
					color: { default: 'default', overrides: [] },
					size: { default: 'default', overrides: ['small'] },
					time: { default: 'default', overrides: [] },
				},
				overrideTokens: {
					small: {
						'sp-1': { family: 'spacing', name: 'sp-1', value: '4px' },
					},
				},
			};

			const css = toCss(irWithOverride);

			// Blocks should be separated by blank line
			expect(css).toContain('}\n\n[data-size-mode="small"]');
		});
	});

	describe('edge cases', () => {
		it('handles empty override tokens', () => {
			const irWithEmptyOverride: IR = {
				tokens: { 'sp-1': { family: 'spacing', name: 'sp-1', value: '8px' } },
				modes: {
					color: { default: 'default', overrides: [] },
					size: { default: 'default', overrides: ['small'] },
					time: { default: 'default', overrides: [] },
				},
				overrideTokens: {
					small: {}, // Empty override
				},
			};

			const css = toCss(irWithEmptyOverride);

			// Should not include empty block
			expect(css).not.toContain('[data-size-mode="small"]');
		});

		it('handles modes not in any category gracefully', () => {
			const irWithUnknownMode: IR = {
				tokens: { 'sp-1': { family: 'spacing', name: 'sp-1', value: '8px' } },
				modes: {
					color: { default: 'default', overrides: [] },
					size: { default: 'default', overrides: [] },
					time: { default: 'default', overrides: [] },
				},
				overrideTokens: {
					'mystery-mode': {
						'sp-1': { family: 'spacing', name: 'sp-1', value: '4px' },
					},
				},
			};

			// Should not throw, just skip the unknown mode
			const css = toCss(irWithUnknownMode);
			expect(css).not.toContain('mystery-mode');
		});
	});
});
