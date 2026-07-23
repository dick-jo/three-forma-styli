import {
	generateRuntimeColorTheme,
	parseRuntimeColorTheme,
	type RuntimeColorThemeConfig,
	RuntimeColorThemeValidationError,
} from '../src/runtime/index.js';

const config = {
	colorNames: ['canvas', 'ink'],
	luminance: {
		minDelta: 0.5,
		backgroundColors: ['canvas'],
		foregroundColors: ['ink'],
	},
} as const satisfies RuntimeColorThemeConfig;

const unknownTheme: unknown = JSON.parse('{}');
const parsed = parseRuntimeColorTheme(unknownTheme, config);
const result = generateRuntimeColorTheme(unknownTheme, config);

parsed.polarity satisfies 'negative' | 'positive';
result.luminance.metric satisfies 'oklch-l';
result.customProperties satisfies Readonly<Record<string, string>>;
result.theme.colors.canvas.l satisfies number;
new RuntimeColorThemeValidationError('theme.colors', 'is invalid');

generateRuntimeColorTheme(unknownTheme, {
	colorNames: ['canvas', 'ink'] as const,
	luminance: {
		minDelta: 0.5,
		backgroundColors: ['canvas'],
		// @ts-expect-error luminance groups must reference a declared color name
		foregroundColors: ['accent'],
	},
});

// @ts-expect-error current metric is explicitly discriminated
result.luminance.metric satisfies 'wcag-relative-luminance';

// @ts-expect-error luminance configuration is required
const invalidConfig: RuntimeColorThemeConfig = { colorNames: ['canvas', 'ink'] };
void invalidConfig;
