/** Typography token generator. */

import type {
	DesignSystem,
	FontSizeReference,
	TypographyFeatureValue,
	TypographyMode,
	TypographyModeSizeOverride,
	TypographyComposite,
	TypographyRole,
	TypographySemanticVariant,
	TypographySettings,
} from '../types.js';
import type {
	GeneratorConfig,
	GeneratorResult,
	TokenValue,
	TypographyContract,
	TypographyContractComposite,
} from './types.js';
import { getDefaultEntry } from './utils.js';

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

function recipeFontSizeToken(
	roleName: string,
	variantName: string | undefined,
	composite: TypographyComposite,
	config: GeneratorConfig
): TokenValue {
	const rolePrefix = `${config.prefixes.typographyRole}-${roleName}`;
	const recipePrefix = variantName ? `${rolePrefix}-${variantName}` : rolePrefix;
	return {
		family: 'typography',
		name: `${recipePrefix}-font-size`,
		value: typographyReference(composite.fontSize, config.prefixes.typography),
		reference: `${config.prefixes.typography}-${composite.fontSize}`,
	};
}

function applyModeOverride(
	composite: TypographyComposite,
	override: TypographyModeSizeOverride
): TypographyComposite {
	return { ...composite, ...override };
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
	base: TypographyComposite,
	composite: TypographyComposite
): TypographySettings {
	const features = {
		...(role.features ?? {}),
		...(base.features ?? {}),
		...(composite.features ?? {}),
	};
	const variations = {
		...(role.variations ?? {}),
		...(base.variations ?? {}),
		...(composite.variations ?? {}),
	};
	return {
		features: Object.keys(features).length > 0 ? features : undefined,
		variations: Object.keys(variations).length > 0 ? variations : undefined,
		fontKerning: composite.fontKerning ?? base.fontKerning ?? role.fontKerning,
		fontOpticalSizing:
			composite.fontOpticalSizing ?? base.fontOpticalSizing ?? role.fontOpticalSizing,
		textTransform: composite.textTransform ?? base.textTransform ?? role.textTransform,
	};
}

function recipeTokens(
	roleName: string,
	variantName: string | undefined,
	composite: TypographyComposite,
	role: TypographyRole,
	config: GeneratorConfig
): { tokens: TokenValue[]; contract: TypographyContractComposite } {
	const rolePrefix = `${config.prefixes.typographyRole}-${roleName}`;
	const recipePrefix = variantName ? `${rolePrefix}-${variantName}` : rolePrefix;
	const settings = resolvedSettings(role, role.sizes.base, composite);
	const tokens: TokenValue[] = [
		recipeFontSizeToken(roleName, variantName, composite, config),
		{
			family: 'typography',
			name: `${recipePrefix}-font-weight`,
			value: `var(--${rolePrefix}-font-weight-${composite.weight})`,
			reference: `${rolePrefix}-font-weight-${composite.weight}`,
		},
		{
			family: 'typography',
			name: `${recipePrefix}-line-height`,
			value: formatNumber(composite.lineHeight),
			rawValue: composite.lineHeight,
		},
		{
			family: 'typography',
			name: `${recipePrefix}-letter-spacing`,
			value: composite.letterSpacing === 0 ? '0' : `${formatNumber(composite.letterSpacing)}em`,
			rawValue: composite.letterSpacing,
			unit: composite.letterSpacing === 0 ? undefined : 'em',
		},
	];

	const contract: TypographyContractComposite = {
		fontSizeToken: `${recipePrefix}-font-size`,
		fontWeightToken: `${recipePrefix}-font-weight`,
		weight: composite.weight,
		lineHeightToken: `${recipePrefix}-line-height`,
		letterSpacingToken: `${recipePrefix}-letter-spacing`,
		atomicFontSizeToken: `${config.prefixes.typography}-${composite.fontSize}`,
		fontSizeReference: composite.fontSize,
		lineHeight: composite.lineHeight,
		letterSpacingEm: composite.letterSpacing,
	};

	if (settings.fontKerning) {
		contract.fontKerningToken = `${recipePrefix}-font-kerning`;
		tokens.push({
			family: 'typography',
			name: contract.fontKerningToken,
			value: settings.fontKerning,
		});
	}
	if (settings.textTransform) {
		contract.textTransformToken = `${recipePrefix}-text-transform`;
		contract.textTransform = settings.textTransform;
		tokens.push({
			family: 'typography',
			name: contract.textTransformToken,
			value: settings.textTransform,
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

function semanticVariantTokens(
	roleName: string,
	variantName: string,
	variant: TypographySemanticVariant,
	role: TypographyRole,
	config: GeneratorConfig
): { tokens: TokenValue[]; contract: import('./types.js').TypographyContractSemanticVariant } {
	const rolePrefix = `${config.prefixes.typographyRole}-${roleName}`;
	const prefix = `${rolePrefix}-variant-${variantName}`;
	const tokens: TokenValue[] = [];
	const contract: import('./types.js').TypographyContractSemanticVariant = {};
	if (variant.weight) {
		contract.weight = variant.weight;
		contract.fontWeightToken = `${prefix}-font-weight`;
		tokens.push({
			family: 'typography',
			name: contract.fontWeightToken,
			value: `var(--${rolePrefix}-font-weight-${variant.weight})`,
			reference: `${rolePrefix}-font-weight-${variant.weight}`,
		});
	}
	if (variant.fontStyle) {
		contract.fontStyle = variant.fontStyle;
		contract.fontStyleToken = `${prefix}-font-style`;
		tokens.push({
			family: 'typography',
			name: contract.fontStyleToken,
			value: `var(--${rolePrefix}-font-style-${variant.fontStyle})`,
			reference: `${rolePrefix}-font-style-${variant.fontStyle}`,
		});
	}
	if (variant.lineHeight !== undefined) {
		contract.lineHeightToken = `${prefix}-line-height`;
		tokens.push({
			family: 'typography',
			name: contract.lineHeightToken,
			value: formatNumber(variant.lineHeight),
			rawValue: variant.lineHeight,
		});
	}
	if (variant.letterSpacing !== undefined) {
		contract.letterSpacingToken = `${prefix}-letter-spacing`;
		tokens.push({
			family: 'typography',
			name: contract.letterSpacingToken,
			value: variant.letterSpacing === 0 ? '0' : `${formatNumber(variant.letterSpacing)}em`,
			rawValue: variant.letterSpacing,
			unit: variant.letterSpacing === 0 ? undefined : 'em',
		});
	}
	if (variant.textTransform) {
		contract.textTransformToken = `${prefix}-text-transform`;
		tokens.push({
			family: 'typography',
			name: contract.textTransformToken,
			value: variant.textTransform,
		});
	}
	if (variant.fontKerning) {
		contract.fontKerningToken = `${prefix}-font-kerning`;
		tokens.push({
			family: 'typography',
			name: contract.fontKerningToken,
			value: variant.fontKerning,
		});
	}
	if (variant.fontOpticalSizing) {
		contract.fontOpticalSizingToken = `${prefix}-font-optical-sizing`;
		tokens.push({
			family: 'typography',
			name: contract.fontOpticalSizingToken,
			value: variant.fontOpticalSizing,
		});
	}
	if (variant.features) {
		contract.fontFeatureSettingsToken = `${prefix}-font-feature-settings`;
		tokens.push({
			family: 'typography',
			name: contract.fontFeatureSettingsToken,
			value: featureSettings({ ...(role.features ?? {}), ...variant.features }),
		});
	}
	if (variant.variations) {
		contract.fontVariationSettingsToken = `${prefix}-font-variation-settings`;
		tokens.push({
			family: 'typography',
			name: contract.fontVariationSettingsToken,
			value: variationSettings({ ...(role.variations ?? {}), ...variant.variations }),
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
			const rolePrefix = `${config.prefixes.typographyRole}-${roleName}`;
			const styles = normalizedStyles(role);
			const sizes = Object.fromEntries(
				Object.entries(role.sizes).map(([name, composite]) => [
					name,
					recipeTokens(roleName, name === 'base' ? undefined : name, composite, role, config)
						.contract,
				])
			);
			const variants = Object.fromEntries(
				Object.entries(role.variants ?? {}).map(([name, variant]) => [
					name,
					semanticVariantTokens(roleName, name, variant, role, config).contract,
				])
			);
			const displayOrder = ['min', 's', 'base', 'l', 'max'].filter((size) => sizes[size]);
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
					sizes,
					variants,
					displayOrder,
				},
			];
		})
	);
	return {
		namespace: config.prefixes.typographyRole,
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
		const rolePrefix = `${config.prefixes.typographyRole}-${roleName}`;
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
		for (const [sizeName, composite] of Object.entries(role.sizes)) {
			tokens.push(
				...recipeTokens(
					roleName,
					sizeName === 'base' ? undefined : sizeName,
					composite,
					role,
					config
				).tokens
			);
		}
		for (const [variantName, variant] of Object.entries(role.variants ?? {})) {
			tokens.push(...semanticVariantTokens(roleName, variantName, variant, role, config).tokens);
		}
	}
	return tokens;
}

/**
 * Re-declare semantic size aliases inside every atomic typography mode.
 *
 * A custom property inherited from :root resolves references in :root's
 * context. Replacing only --fs-* on a descendant would therefore leave
 * --text-*-font-size pinned to the default scale. Rebinding the aliases in
 * the mode selector preserves the public semantic token contract and makes
 * descendant-scoped size modes work in real CSS.
 */
function generateSemanticModeTokens(
	typography: DesignSystem['typography'],
	modeName: string,
	config: GeneratorConfig
): TokenValue[] {
	if (!typography.roles) return [];
	const tokens: TokenValue[] = [];
	for (const [roleName, role] of Object.entries(typography.roles)) {
		const modeOverride = role.modeOverrides?.[modeName];
		for (const [sizeName, composite] of Object.entries(role.sizes)) {
			const sizeOverride = modeOverride?.sizes[sizeName as keyof typeof modeOverride.sizes];
			const suffix = sizeName === 'base' ? undefined : sizeName;
			tokens.push(
				...(sizeOverride
					? recipeTokens(roleName, suffix, applyModeOverride(composite, sizeOverride), role, config)
							.tokens
					: [recipeFontSizeToken(roleName, suffix, composite, config)])
			);
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
	const defaultMode = getDefaultEntry(typography.modes);
	const overrideModes = typography.modes.filter((mode) => mode !== defaultMode);
	const defaultTokens = [
		...generateTokensForMode(defaultMode, config),
		...generateSemanticTokens(typography, config),
	];
	const overrideTokens: Record<string, TokenValue[]> = {};
	for (const mode of overrideModes) {
		overrideTokens[mode.name] = [
			...generateTokensForMode(mode, config),
			...generateSemanticModeTokens(typography, mode.name, config),
		];
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
