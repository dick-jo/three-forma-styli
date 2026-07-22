/** Typography token generator. */

import type {
	DesignSystem,
	FontSizeReference,
	TypographyFeatureValue,
	TypographyMode,
	TypographyRecipe,
	TypographyRole,
	TypographySettings,
} from '../types.js';
import type {
	GeneratorConfig,
	GeneratorResult,
	TokenValue,
	TypographyContract,
	TypographyContractRecipe,
} from './types.js';
import { getDefaultMode } from './utils.js';

function formatNumber(value: number): string {
	return value.toFixed(4).replace(/\.?0+$/, '');
}

const genericFontFamilies = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
	'ui-serif',
	'ui-sans-serif',
	'ui-monospace',
	'ui-rounded',
	'math',
	'emoji',
	'fangsong',
]);

function formatFontFamily(name: string): string {
	return genericFontFamilies.has(name.toLowerCase()) ? name : JSON.stringify(name);
}

function typographyReference(reference: FontSizeReference, prefix: string): string {
	return `var(--${prefix}-${reference})`;
}

function featureSettings(features: Record<string, TypographyFeatureValue>): string {
	return Object.entries(features)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(
			([tag, value]) =>
				`${JSON.stringify(tag)} ${typeof value === 'boolean' ? (value ? 1 : 0) : value}`
		)
		.join(', ');
}

function variationSettings(variations: Record<string, number>): string {
	return Object.entries(variations)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([tag, value]) => `${JSON.stringify(tag)} ${formatNumber(value)}`)
		.join(', ');
}

function resolvedSettings(
	role: TypographyRole,
	base: TypographyRecipe,
	recipe: TypographyRecipe
): TypographySettings {
	const features = {
		...(role.features ?? {}),
		...(base.features ?? {}),
		...(recipe.features ?? {}),
	};
	const variations = {
		...(role.variations ?? {}),
		...(base.variations ?? {}),
		...(recipe.variations ?? {}),
	};
	return {
		features: Object.keys(features).length > 0 ? features : undefined,
		variations: Object.keys(variations).length > 0 ? variations : undefined,
		fontKerning: recipe.fontKerning ?? base.fontKerning ?? role.fontKerning,
		fontOpticalSizing: recipe.fontOpticalSizing ?? base.fontOpticalSizing ?? role.fontOpticalSizing,
	};
}

function recipeTokens(
	roleName: string,
	variantName: string | undefined,
	recipe: TypographyRecipe,
	role: TypographyRole,
	config: GeneratorConfig
): { tokens: TokenValue[]; contract: TypographyContractRecipe } {
	const rolePrefix = `${config.prefixes.typographyRole ?? 'typo'}-${roleName}`;
	const recipePrefix = variantName ? `${rolePrefix}-${variantName}` : rolePrefix;
	const settings = resolvedSettings(role, role.base, recipe);
	const tokens: TokenValue[] = [
		{
			family: 'typography',
			name: `${recipePrefix}-font-size`,
			value: typographyReference(recipe.fontSize, config.prefixes.typography),
			reference: `${config.prefixes.typography}-${recipe.fontSize}`,
		},
		{
			family: 'typography',
			name: `${recipePrefix}-font-weight`,
			value: `var(--${rolePrefix}-font-weight-${recipe.weight})`,
			reference: `${rolePrefix}-font-weight-${recipe.weight}`,
		},
		{
			family: 'typography',
			name: `${recipePrefix}-line-height`,
			value: formatNumber(recipe.lineHeight),
			rawValue: recipe.lineHeight,
		},
		{
			family: 'typography',
			name: `${recipePrefix}-letter-spacing`,
			value: recipe.letterSpacing === 0 ? '0' : `${formatNumber(recipe.letterSpacing)}em`,
			rawValue: recipe.letterSpacing,
			unit: recipe.letterSpacing === 0 ? undefined : 'em',
		},
	];

	const contract: TypographyContractRecipe = {
		fontSizeToken: `${recipePrefix}-font-size`,
		fontWeightToken: `${recipePrefix}-font-weight`,
		weight: recipe.weight,
		lineHeightToken: `${recipePrefix}-line-height`,
		letterSpacingToken: `${recipePrefix}-letter-spacing`,
		atomicFontSizeToken: `${config.prefixes.typography}-${recipe.fontSize}`,
		fontSizeReference: recipe.fontSize,
		lineHeight: recipe.lineHeight,
		letterSpacingEm: recipe.letterSpacing,
	};

	if (settings.fontKerning) {
		contract.fontKerningToken = `${recipePrefix}-font-kerning`;
		tokens.push({
			family: 'typography',
			name: contract.fontKerningToken,
			value: settings.fontKerning,
		});
	}
	if (settings.fontOpticalSizing) {
		contract.fontOpticalSizingToken = `${recipePrefix}-font-optical-sizing`;
		tokens.push({
			family: 'typography',
			name: contract.fontOpticalSizingToken,
			value: settings.fontOpticalSizing,
		});
	}
	if (settings.features && Object.keys(settings.features).length > 0) {
		contract.fontFeatureSettingsToken = `${recipePrefix}-font-feature-settings`;
		tokens.push({
			family: 'typography',
			name: contract.fontFeatureSettingsToken,
			value: featureSettings(settings.features),
		});
	}
	if (settings.variations && Object.keys(settings.variations).length > 0) {
		contract.fontVariationSettingsToken = `${recipePrefix}-font-variation-settings`;
		tokens.push({
			family: 'typography',
			name: contract.fontVariationSettingsToken,
			value: variationSettings(settings.variations),
		});
	}

	return { tokens, contract };
}

function normalizedStyles(role: TypographyRole) {
	return (
		role.styles ?? {
			normal: { weights: Object.keys(role.weights) },
		}
	);
}

export function generateTypographyContract(
	typography: DesignSystem['typography'],
	config: GeneratorConfig
): TypographyContract | undefined {
	if (!typography.fonts || !typography.roles) return undefined;
	const fonts = Object.fromEntries(
		Object.entries(typography.fonts).map(([name, font]) => [
			name,
			{
				family: font.family,
				fallbacks: [...(font.fallbacks ?? [])],
				verified: Boolean(font.capabilities),
				warnings: font.verification === 'prepared' ? [...(font.diagnostics?.warnings ?? [])] : [],
			},
		])
	);
	const roles = Object.fromEntries(
		Object.entries(typography.roles).map(([roleName, role]) => {
			const rolePrefix = `${config.prefixes.typographyRole ?? 'typo'}-${roleName}`;
			const styles = normalizedStyles(role);
			const base = recipeTokens(roleName, undefined, role.base, role, config).contract;
			const variants = Object.fromEntries(
				Object.entries(role.variants ?? {}).map(([name, recipe]) => [
					name,
					recipeTokens(roleName, name, recipe, role, config).contract,
				])
			);
			const displayOrder = role.displayOrder
				? [...role.displayOrder]
				: ['base', ...Object.keys(role.variants ?? {})];
			return [
				roleName,
				{
					font: role.font,
					fontFamilyToken: `${rolePrefix}-font-family`,
					fontStyleToken: `${rolePrefix}-font-style`,
					defaultStyle: role.defaultStyle ?? 'normal',
					weights: { ...role.weights },
					weightTokens: Object.fromEntries(
						Object.keys(role.weights).map((alias) => [alias, `${rolePrefix}-font-weight-${alias}`])
					),
					styles: Object.fromEntries(
						Object.entries(styles).map(([style, selection]) => [
							style,
							{
								value: style,
								weights: [...selection!.weights],
							},
						])
					),
					base,
					variants,
					displayOrder,
				},
			];
		})
	);
	return {
		namespace: config.prefixes.typographyRole ?? 'text',
		fonts,
		roles,
	};
}

function generateSemanticTokens(
	typography: DesignSystem['typography'],
	config: GeneratorConfig
): TokenValue[] {
	if (!typography.fonts || !typography.roles) return [];
	const tokens: TokenValue[] = [];
	for (const [roleName, role] of Object.entries(typography.roles)) {
		const rolePrefix = `${config.prefixes.typographyRole ?? 'typo'}-${roleName}`;
		const font = typography.fonts[role.font];
		tokens.push({
			family: 'typography',
			name: `${rolePrefix}-font-family`,
			value: [font.family, ...(font.fallbacks ?? [])].map(formatFontFamily).join(', '),
		});
		for (const [alias, weight] of Object.entries(role.weights)) {
			tokens.push({
				family: 'typography',
				name: `${rolePrefix}-font-weight-${alias}`,
				value: String(weight),
				rawValue: weight,
			});
		}
		const styles = normalizedStyles(role);
		for (const style of Object.keys(styles)) {
			tokens.push({
				family: 'typography',
				name: `${rolePrefix}-font-style-${style}`,
				value: style,
			});
		}
		tokens.push({
			family: 'typography',
			name: `${rolePrefix}-font-style`,
			value: `var(--${rolePrefix}-font-style-${role.defaultStyle ?? 'normal'})`,
			reference: `${rolePrefix}-font-style-${role.defaultStyle ?? 'normal'}`,
		});
		tokens.push(...recipeTokens(roleName, undefined, role.base, role, config).tokens);
		for (const [variantName, recipe] of Object.entries(role.variants ?? {})) {
			tokens.push(...recipeTokens(roleName, variantName, recipe, role, config).tokens);
		}
	}
	return tokens;
}

function generateTokensForMode(
	mode: TypographyMode & { name: string },
	config: GeneratorConfig
): TokenValue[] {
	const prefix = config.prefixes.typography;
	const { unit, base, min, increment, range } = mode.tokens;
	const tokens: TokenValue[] = [
		{
			family: 'typography',
			name: `${prefix}-min`,
			value: `${formatNumber(min)}${unit}`,
			rawValue: min,
			unit,
		},
	];
	for (let index = 1; index <= range; index++) {
		const value = index === 1 ? base : base + increment * (index - 1);
		tokens.push({
			family: 'typography',
			name: `${prefix}-${index}`,
			value: `${formatNumber(value)}${unit}`,
			rawValue: value,
			unit,
		});
	}
	return tokens;
}

export function generateTypographyTokens(
	typography: DesignSystem['typography'],
	config: GeneratorConfig
): GeneratorResult {
	const defaultMode = getDefaultMode(typography.modes);
	const overrideModes = typography.modes.filter((mode) => mode !== defaultMode);
	const defaultTokens = [
		...generateTokensForMode(defaultMode, config),
		...generateSemanticTokens(typography, config),
	];
	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		overrideTokens[mode.name] = generateTokensForMode(mode, config);
	}
	return {
		defaultTokens,
		overrideTokens,
		modeInfo: {
			default: defaultMode.name,
			overrides: overrideModes.map((mode) => mode.name),
		},
	};
}
