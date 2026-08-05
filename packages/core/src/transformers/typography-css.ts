import type { IR, TypographyContract } from '../generator/types.js';
import { typographyClassKeys, typographyRoleClassKeys } from './typography-class-names.js';

export interface TypographyCssConfig {
	/** Module output uses local kebab-case classes; global output uses explicit helpers. */
	scope?: 'global' | 'module';
	/** Global helper namespace without punctuation. Defaults to the semantic token namespace. */
	classPrefix?: string;
	/** Global helper specificity. Ordinary classes are reliable defaults; zero uses :where(). */
	specificity?: 'class' | 'zero';
	/** Optional generated @font-face blocks to place before global helpers. */
	fontFaceCss?: string;
}

function variable(name: string): string {
	return `var(--${name})`;
}

function className(key: string, config: Required<TypographyCssConfig>): string {
	return config.scope === 'module' ? key : `${config.classPrefix}--${key}`;
}

function normalizeClassPrefix(value: string): string {
	// Accept the earlier separator-bearing form during migration, but own punctuation in output.
	return value.replace(/-+$/, '');
}

function selector(name: string, config: Required<TypographyCssConfig>): string {
	if (config.scope === 'module' || config.specificity === 'class') return `.${name}`;
	return `:where(.${name})`;
}

function declaration(
	selectorName: string,
	properties: string[],
	config: Required<TypographyCssConfig>
): string {
	return `${selector(selectorName, config)} {\n${properties.map((property) => `  ${property}`).join('\n')}\n}`;
}

function requireTypography(ir: IR): TypographyContract {
	if (!ir.typography || Object.keys(ir.typography.roles).length === 0) {
		throw new Error('A typography system with semantic roles is required for typography CSS.');
	}
	return ir.typography;
}

/**
 * Generate composable typography composites using longhand declarations.
 * Composite classes apply the role defaults. Selection helpers set a complete,
 * validated style/weight pair so CSS cannot advertise impossible combinations.
 */
export function toTypographyCss(ir: IR, options: TypographyCssConfig = {}): string {
	const contract = requireTypography(ir);
	const config: Required<TypographyCssConfig> = {
		scope: options.scope ?? 'global',
		classPrefix: normalizeClassPrefix(options.classPrefix ?? contract.namespace),
		specificity: options.specificity ?? 'class',
		fontFaceCss: options.fontFaceCss ?? '',
	};
	if (config.scope === 'global' && !/^[a-z_][a-z0-9_-]*$/i.test(config.classPrefix)) {
		throw new Error('Typography CSS classPrefix must be a CSS-safe namespace without punctuation.');
	}
	const roleClassKeys = typographyRoleClassKeys(contract);
	const rules = Object.entries(contract.roles).flatMap(([roleName, role]) => {
		const classes = roleClassKeys[roleName]!;
		const recipeProperties = (composite: (typeof role.sizes)[string]) => [
			`font-family: ${variable(role.fontFamilyToken)};`,
			`font-size: ${variable(composite.fontSizeToken)};`,
			`font-weight: ${variable(composite.fontWeightToken)};`,
			`font-style: ${variable(role.fontStyleToken)};`,
			`font-synthesis: none;`,
			`line-height: ${variable(composite.lineHeightToken)};`,
			`letter-spacing: ${variable(composite.letterSpacingToken)};`,
			...(composite.textTransformToken
				? [`text-transform: ${variable(composite.textTransformToken)};`]
				: []),
			...(composite.fontKerningToken
				? [`font-kerning: ${variable(composite.fontKerningToken)};`]
				: []),
			...(composite.fontOpticalSizingToken
				? [`font-optical-sizing: ${variable(composite.fontOpticalSizingToken)};`]
				: []),
			...(composite.fontFeatureSettingsToken
				? [`font-feature-settings: ${variable(composite.fontFeatureSettingsToken)};`]
				: []),
			...(composite.fontVariationSettingsToken
				? [`font-variation-settings: ${variable(composite.fontVariationSettingsToken)};`]
				: []),
		];
		const sizeRules = Object.entries(role.sizes).map(([sizeName, composite]) =>
			declaration(className(classes.sizes[sizeName]!, config), recipeProperties(composite), config)
		);
		const variantRules = Object.entries(role.variants).map(([variantName, variant]) =>
			declaration(
				className(classes.variants[variantName]!, config),
				[
					...(variant.fontWeightToken
						? [`font-weight: ${variable(variant.fontWeightToken)};`]
						: []),
					...(variant.fontStyleToken ? [`font-style: ${variable(variant.fontStyleToken)};`] : []),
					...(variant.lineHeightToken
						? [`line-height: ${variable(variant.lineHeightToken)};`]
						: []),
					...(variant.letterSpacingToken
						? [`letter-spacing: ${variable(variant.letterSpacingToken)};`]
						: []),
					...(variant.textTransformToken
						? [`text-transform: ${variable(variant.textTransformToken)};`]
						: []),
					...(variant.fontKerningToken
						? [`font-kerning: ${variable(variant.fontKerningToken)};`]
						: []),
					...(variant.fontOpticalSizingToken
						? [`font-optical-sizing: ${variable(variant.fontOpticalSizingToken)};`]
						: []),
					...(variant.fontFeatureSettingsToken
						? [`font-feature-settings: ${variable(variant.fontFeatureSettingsToken)};`]
						: []),
					...(variant.fontVariationSettingsToken
						? [`font-variation-settings: ${variable(variant.fontVariationSettingsToken)};`]
						: []),
				],
				config
			)
		);
		const selectionRules = Object.entries(role.styles).flatMap(([style, capability]) =>
			capability!.weights.map((weight) =>
				declaration(
					className(classes.styleWeights[style]![weight]!, config),
					[
						`font-style: ${capability!.value};`,
						`font-weight: ${variable(role.weightTokens[weight])};`,
					],
					config
				)
			)
		);
		return [...sizeRules, ...variantRules, ...selectionRules];
	});

	const fontFaces =
		config.scope === 'global' && config.fontFaceCss.trim()
			? `${config.fontFaceCss.trim()}\n\n`
			: '';
	return `/* Generated by three-forma-styli. Do not edit. */\n${fontFaces}${rules.join('\n\n')}\n`;
}

/** Generate the declaration consumed by TypeScript-aware CSS Module bundlers. */
export function toTypographyCssModuleTypes(ir: IR): string {
	const contract = requireTypography(ir);
	const names = typographyClassKeys(contract);
	return (
		`// Generated by three-forma-styli. Do not edit.\n` +
		`declare const classes: {\n` +
		names.map((name) => `  readonly ${JSON.stringify(name)}: string;`).join('\n') +
		`\n};\nexport default classes;\n`
	);
}
