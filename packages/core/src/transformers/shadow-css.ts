import type { IR, ShadowContractRecipe } from '../generator/types.js';

export interface ShadowCssConfig {
	/** Global helper prefix. Defaults to shadow; TFS adds `--`. */
	classPrefix?: string;
	/** Ordinary global classes by default; `zero` wraps them in :where(). */
	specificity?: 'class' | 'zero';
	/** Module output omits the global namespace but retains kebab-case names. */
	scope?: 'global' | 'module';
}

const cssNamespacePattern = /^[a-z][a-z0-9-]*$/i;

function selector(
	kind: 'box' | 'text',
	recipe: string,
	variant: string,
	config: Required<ShadowCssConfig>
): string {
	const local = variant === 'base' ? `${kind}-${recipe}` : `${kind}-${recipe}-${variant}`;
	const className = config.scope === 'module' ? local : `${config.classPrefix}--${local}`;
	const ordinary = `.${className}`;
	return config.scope === 'global' && config.specificity === 'zero'
		? `:where(${ordinary})`
		: ordinary;
}

function recipeBlocks(
	kind: 'box' | 'text',
	name: string,
	recipe: ShadowContractRecipe,
	config: Required<ShadowCssConfig>
): string[] {
	const property = kind === 'box' ? 'box-shadow' : 'text-shadow';
	return [
		[selector(kind, name, 'base', config), recipe.base.token],
		...Object.entries(recipe.variants).map(([variant, value]) => [
			selector(kind, name, variant, config),
			value.token,
		]),
	].map(([currentSelector, token]) => `${currentSelector} {\n  ${property}: var(--${token});\n}`);
}

/** Emit optional low-complexity helper classes for generated shadow recipes. */
export function toShadowCss(ir: IR, options: ShadowCssConfig = {}): string {
	if (!ir.shadows) return '';
	const config: Required<ShadowCssConfig> = {
		classPrefix: options.classPrefix ?? 'shadow',
		specificity: options.specificity ?? 'class',
		scope: options.scope ?? 'global',
	};
	if (!cssNamespacePattern.test(config.classPrefix)) {
		throw new Error('Shadow classPrefix must be a CSS-safe namespace beginning with a letter');
	}
	const blocks = [
		...Object.entries(ir.shadows.box).flatMap(([name, recipe]) =>
			recipeBlocks('box', name, recipe, config)
		),
		...Object.entries(ir.shadows.text).flatMap(([name, recipe]) =>
			recipeBlocks('text', name, recipe, config)
		),
	];
	return blocks.length ? `${blocks.join('\n\n')}\n` : '';
}

/** Declaration file for the kebab-case CSS Module helper surface. */
export function toShadowCssModuleTypes(ir: IR): string {
	if (!ir.shadows) return '';
	const names = [
		...Object.entries(ir.shadows.box).flatMap(([name, recipe]) => [
			`box-${name}`,
			...Object.keys(recipe.variants).map((variant) => `box-${name}-${variant}`),
		]),
		...Object.entries(ir.shadows.text).flatMap(([name, recipe]) => [
			`text-${name}`,
			...Object.keys(recipe.variants).map((variant) => `text-${name}-${variant}`),
		]),
	];
	return [
		'declare const styles: {',
		...names.map((name) => `  readonly ${JSON.stringify(name)}: string;`),
		'};',
		'export default styles;',
		'',
	].join('\n');
}
