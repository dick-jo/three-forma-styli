import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	enforceRuntimeColorTheme,
	generateRuntimeColorTheme,
	parseRuntimeColorTheme,
	RuntimeColorThemeValidationError,
	RuntimeLuminanceConstraintError,
	type ColorThemeConfig,
} from 'three-forma-styli/runtime';
import { emitColorThemeJs, emitTokensCss, TfsError } from 'three-forma-styli';
import { config, fonts, resolved, system } from './everything.js';
import { colorTheme } from './fixtures/everything/expected/color-theme.js';

const themeable = (palette: 'ordinary' | 'light') => {
	const { polarity, colors } = colorTheme.palettes[palette];
	return {
		polarity,
		colors: Object.fromEntries(colorTheme.colors.map((name) => [name, colors[name]])),
	};
};

describe('runtime themes', () => {
	it('produce exactly the custom properties tokens.css has for the same colours', () => {
		const css = emitTokensCss(resolved, fonts.stacks);
		const { customProperties } = generateRuntimeColorTheme(themeable('ordinary'), colorTheme);
		expect(Object.keys(customProperties)).toHaveLength(6 * 8);
		for (const [name, value] of Object.entries(customProperties))
			expect(css).toContain(`\t${name}: ${value};`);
	});

	it('measure the contrast rule for dark and light palettes', () => {
		const dark = generateRuntimeColorTheme(themeable('ordinary'), colorTheme).luminance!;
		expect(dark).toMatchObject({
			deltaValid: true,
			actualDelta: 0.42,
			requiredDelta: 0.33,
			backgroundConstraintType: 'max',
		});
		expect(dark.colors.ev).toEqual({ group: 'background', luminance: 0.28, headroom: 0.09 });
		const light = generateRuntimeColorTheme(themeable('light'), colorTheme).luminance!;
		expect(light).toMatchObject({ deltaValid: true, backgroundConstraintType: 'min' });
	});

	it('report a failing palette, and enforce refuses it', () => {
		const failing = themeable('ordinary') as any;
		failing.colors.pri = { l: 0.5, c: 0.16, h: 285 };
		expect(generateRuntimeColorTheme(failing, colorTheme).luminance!.deltaValid).toBe(false);
		expect(() => enforceRuntimeColorTheme(failing, colorTheme)).toThrow(
			RuntimeLuminanceConstraintError
		);
	});

	it('without a rule: luminance is null, and enforcing is a configuration error', () => {
		const noRule: ColorThemeConfig = { ...colorTheme, luminance: null };
		expect(generateRuntimeColorTheme(themeable('ordinary'), noRule).luminance).toBeNull();
		expect(() => enforceRuntimeColorTheme(themeable('ordinary'), noRule)).toThrow(
			'has no colors.constraints.luminance'
		);
	});

	it.each([
		['extra key', (t: any) => (t.extra = 1), 'theme.extra is not allowed'],
		['missing colour', (t: any) => delete t.colors.duo, 'theme.colors.duo is required'],
		[
			'colour not customer-settable',
			(t: any) => (t.colors.shd = { l: 0, c: 0, h: 0 }),
			'theme.colors.shd is not allowed',
		],
		[
			'lightness out of range',
			(t: any) => (t.colors.bg.l = 1.5),
			'theme.colors.bg.l must be between 0 and 1',
		],
		[
			'polarity',
			(t: any) => (t.polarity = 'dark'),
			'theme.polarity must be "negative" or "positive"',
		],
	])('reject malformed input: %s', (_name, change, message) => {
		const input = structuredClone(themeable('ordinary'));
		change(input);
		expect(() => parseRuntimeColorTheme(input, colorTheme)).toThrow(
			RuntimeColorThemeValidationError
		);
		expect(() => parseRuntimeColorTheme(input, colorTheme)).toThrow(message);
	});
});

describe('./color-theme', () => {
	it('carries every built-in palette per theme mode', () => {
		expect(Object.keys(colorTheme.palettes)).toEqual(['ordinary', 'dark', 'light']);
		expect(colorTheme.palettes.light.polarity).toBe('positive');
		expect(Object.keys(colorTheme.palettes.light.colors)).toContain('shd');
	});

	it('requires every colour the contrast rule checks to be customer-settable', () => {
		expect(() => emitColorThemeJs(resolved, { colors: ['bg', 'ev', 'ink', 'neu', 'pri'] })).toThrow(
			TfsError
		);
		expect(() => emitColorThemeJs(resolved, { colors: ['bg', 'ev', 'ink', 'neu', 'pri'] })).toThrow(
			'must include "duo": the contrast rule checks it'
		);
		expect(system.colors).toBeDefined();
		expect(config.runtime.colorThemes.colors).toContain('duo');
	});
});

describe('the runtime entry stays small', () => {
	it('imports nothing outside src/runtime and const.ts', () => {
		const directory = new URL('../src/runtime/', import.meta.url);
		for (const file of readdirSync(directory)) {
			const imports = [
				...readFileSync(new URL(file, directory), 'utf8').matchAll(/from '([^']+)'/g),
			].map((m) => m[1]);
			for (const target of imports)
				expect(target === '../const.js' || target!.startsWith('./')).toBe(true);
		}
	});
});
