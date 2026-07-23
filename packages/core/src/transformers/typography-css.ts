import type { IR, TypographyContract } from '../generator/types.js';

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

function className(
	role: string,
	suffix: string | undefined,
	config: Required<TypographyCssConfig>
): string {
	const localName = suffix ? `${role}-${suffix}` : role;
	return config.scope === 'module' ? localName : `${config.classPrefix}--${localName}`;
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

function classNames(contract: TypographyContract, config: Required<TypographyCssConfig>): string[] {
	return Object.entries(contract.roles).flatMap(([roleName, role]) => [
		className(roleName, undefined, config),
		...Object.keys(role.variants).map((variant) => className(roleName, variant, config)),
		...Object.entries(role.styles).flatMap(([style, capability]) =>
			capability!.weights.map((weight) =>
				className(roleName, `style-${style}-weight-${weight}`, config)
			)
		),
	]);
}

function requireTypography(ir: IR): TypographyContract {
	if (!ir.typography || Object.keys(ir.typography.roles).length === 0) {
		throw new Error('A typography system with semantic roles is required for typography CSS.');
	}
	return ir.typography;
}

/**
 * Generate composable typography recipes using longhand declarations.
 * Recipe classes apply the role defaults. Selection helpers set a complete,
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
	const rules = Object.entries(contract.roles).flatMap(([roleName, role]) => {
		const recipeProperties = (recipe: typeof role.base) => [
			`font-family: ${variable(role.fontFamilyToken)};`,
			`font-size: ${variable(recipe.fontSizeToken)};`,
			`font-weight: ${variable(recipe.fontWeightToken)};`,
			`font-style: ${variable(role.fontStyleToken)};`,
			`font-synthesis: none;`,
			`line-height: ${variable(recipe.lineHeightToken)};`,
			`letter-spacing: ${variable(recipe.letterSpacingToken)};`,
			...(recipe.textTransformToken
				? [`text-transform: ${variable(recipe.textTransformToken)};`]
				: []),
			...(recipe.fontKerningToken ? [`font-kerning: ${variable(recipe.fontKerningToken)};`] : []),
			...(recipe.fontOpticalSizingToken
				? [`font-optical-sizing: ${variable(recipe.fontOpticalSizingToken)};`]
				: []),
			...(recipe.fontFeatureSettingsToken
				? [`font-feature-settings: ${variable(recipe.fontFeatureSettingsToken)};`]
				: []),
			...(recipe.fontVariationSettingsToken
				? [`font-variation-settings: ${variable(recipe.fontVariationSettingsToken)};`]
				: []),
		];
		const baseRule = declaration(
			className(roleName, undefined, config),
			recipeProperties(role.base),
			config
		);
		const variantRules = Object.entries(role.variants).map(([variantName, recipe]) =>
			declaration(className(roleName, variantName, config), recipeProperties(recipe), config)
		);
		const selectionRules = Object.entries(role.styles).flatMap(([style, capability]) =>
			capability!.weights.map((weight) =>
				declaration(
					className(roleName, `style-${style}-weight-${weight}`, config),
					[
						`font-style: ${capability!.value};`,
						`font-weight: ${variable(role.weightTokens[weight])};`,
					],
					config
				)
			)
		);
		return [baseRule, ...variantRules, ...selectionRules];
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
	const names = classNames(contract, {
		scope: 'module',
		classPrefix: '',
		specificity: 'class',
		fontFaceCss: '',
	});
	return (
		`// Generated by three-forma-styli. Do not edit.\n` +
		`declare const classes: {\n` +
		names.map((name) => `  readonly ${JSON.stringify(name)}: string;`).join('\n') +
		`\n};\nexport default classes;\n`
	);
}
