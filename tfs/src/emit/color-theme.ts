import { ALPHA_POSITIONS, GENERATED_HEADER } from '../const.js';
import type { ResolvedSystem } from '../resolve/index.js';
import { Issues, TfsError } from '../resolve/issues.js';
import type { ColorThemeConfig } from '../runtime/theme.js';

/** `runtime.colorThemes` in tfs.config.ts: the colours customers may set at runtime. */
export type ColorThemesInput = { readonly colors: readonly string[] };

function contract(resolved: ResolvedSystem, colorThemes: ColorThemesInput) {
	const { input } = resolved;
	const issues = new Issues();
	const path = 'runtime.colorThemes.colors';
	const palette = Object.keys(input.colors?.tokens ?? {});
	const rule = input.colors?.constraints?.luminance ?? null;
	issues.check(colorThemes.colors.length > 0, path, 'needs at least one colour');
	issues.check(
		new Set(colorThemes.colors).size === colorThemes.colors.length,
		path,
		'lists a colour twice'
	);
	for (const name of colorThemes.colors)
		issues.check(palette.includes(name), path, `"${name}" is not a colour`);
	for (const name of [...(rule?.backgroundColors ?? []), ...(rule?.foregroundColors ?? [])]) {
		issues.check(
			colorThemes.colors.includes(name),
			path,
			`must include "${name}": the contrast rule checks it`
		);
	}
	if (issues.list.length > 0) throw new TfsError(issues.list);

	const theme = resolved.modes.filter((mode) => mode.axis === themeAxis(resolved));
	const palettes = Object.fromEntries(
		[
			['ordinary', resolved.ordinary] as const,
			...theme.map((mode) => [mode.mode, mode.values] as const),
		].map(([name, values]) => [
			name,
			{
				polarity: values.colors?.polarity ?? null,
				colors: Object.fromEntries(
					Object.entries(values.colors?.tokens ?? {}).map(([id, { l, c, h }]) => [id, { l, c, h }])
				),
			},
		])
	);
	const config: ColorThemeConfig = {
		colors: colorThemes.colors,
		alpha: {
			non: 0,
			...Object.fromEntries(ALPHA_POSITIONS.map((p) => [p, input.alpha!.values[p]!])),
		} as ColorThemeConfig['alpha'],
		luminance: rule,
	};
	return { ...config, palettes };
}

/** The axis whose modes change colours (at most one, by the one-axis rule), if any. */
function themeAxis(resolved: ResolvedSystem): string | undefined {
	return Object.keys(resolved.input.colors?.modes ?? {})[0];
}

/** ./color-theme: customer-settable colours, alpha steps, contrast rule and every built-in palette. */
export function emitColorThemeJs(resolved: ResolvedSystem, colorThemes: ColorThemesInput): string {
	return `${GENERATED_HEADER}export const colorTheme = ${JSON.stringify(contract(resolved, colorThemes))};\n`;
}

export function emitColorThemeTypes(
	resolved: ResolvedSystem,
	colorThemes: ColorThemesInput
): string {
	const value = contract(resolved, colorThemes);
	const tuple = (list: readonly string[]) =>
		`readonly [${list.map((item) => JSON.stringify(item)).join(', ')}]`;
	const channels = '{ readonly l: number; readonly c: number; readonly h: number }';
	const palette = (colors: Record<string, unknown>) =>
		`{ readonly polarity: ${'"negative" | "positive" | null'}; readonly colors: { ${Object.keys(
			colors
		)
			.map((id) => `readonly ${JSON.stringify(id)}: ${channels}`)
			.join('; ')} } }`;
	return `${GENERATED_HEADER}export declare const colorTheme: {
	readonly colors: ${tuple(value.colors)};
	readonly alpha: { ${['non', ...ALPHA_POSITIONS].map((p) => `readonly ${JSON.stringify(p)}: number`).join('; ')} };
	readonly luminance: ${
		value.luminance
			? `{ readonly minimumLuminanceDelta: number; readonly backgroundColors: ${tuple(value.luminance.backgroundColors)}; readonly foregroundColors: ${tuple(value.luminance.foregroundColors)} }`
			: 'null'
	};
	readonly palettes: {
${Object.entries(value.palettes)
	.map(([name, p]) => `\t\treadonly ${JSON.stringify(name)}: ${palette(p.colors)};`)
	.join('\n')}
	};
};
/** A colour customers may set. */
export type ThemeColor = (typeof colorTheme.colors)[number];
`;
}
