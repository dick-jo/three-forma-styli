import type { IR, TypographyContract } from '../generator/types.js';
import { typographyClassKeys, typographyRoleClassKeys } from './typography-class-names.js';

function variable(name: string): string {
	return `var(--${name})`;
}

function recipeManifest(recipe: TypographyContract['roles'][string]['base']) {
	return {
		fontSize: variable(recipe.fontSizeToken),
		fontWeight: variable(recipe.fontWeightToken),
		weight: recipe.weight,
		lineHeight: variable(recipe.lineHeightToken),
		letterSpacing: variable(recipe.letterSpacingToken),
		...(recipe.textTransformToken
			? {
					textTransform: variable(recipe.textTransformToken),
					textTransformValue: recipe.textTransform,
				}
			: {}),
		...(recipe.fontKerningToken ? { fontKerning: variable(recipe.fontKerningToken) } : {}),
		...(recipe.fontOpticalSizingToken
			? { fontOpticalSizing: variable(recipe.fontOpticalSizingToken) }
			: {}),
		...(recipe.fontFeatureSettingsToken
			? { fontFeatureSettings: variable(recipe.fontFeatureSettingsToken) }
			: {}),
		...(recipe.fontVariationSettingsToken
			? { fontVariationSettings: variable(recipe.fontVariationSettingsToken) }
			: {}),
	};
}

/** Serializable semantic typography contract shared by typed project targets. */
export function typographyContractData(contract: TypographyContract) {
	const roleClassKeys = typographyRoleClassKeys(contract);
	return {
		roles: Object.fromEntries(
			Object.entries(contract.roles).map(([roleName, role]) => [
				roleName,
				{
					fontFamily: variable(role.fontFamilyToken),
					defaultStyle: role.defaultStyle,
					classes: roleClassKeys[roleName]!,
					weights: Object.fromEntries(
						Object.keys(role.weights).map((weight) => [weight, variable(role.weightTokens[weight])])
					),
					styles: Object.fromEntries(
						Object.entries(role.styles).map(([style, capability]) => [
							style,
							{
								fontStyle: capability!.value,
								weights: Object.fromEntries(
									capability!.weights.map((weight) => [weight, variable(role.weightTokens[weight])])
								),
							},
						])
					),
					base: recipeManifest(role.base),
					displayOrder: [...role.displayOrder],
					variants: Object.fromEntries(
						Object.entries(role.variants).map(([name, recipe]) => [name, recipeManifest(recipe)])
					),
				},
			])
		),
	};
}

function selectionTypes(contract: TypographyContract): string {
	const roles = Object.entries(contract.roles)
		.map(([roleName, contractRole]) => {
			const role = JSON.stringify(roleName);
			const branches = [
				`    | { role: ${role}; variant?: TypographyVariant<${role}>; fontStyle?: undefined; weight?: TypographyWeightForStyle<${role}, ${JSON.stringify(contractRole.defaultStyle)}> }`,
				...Object.keys(contractRole.styles).map(
					(style) =>
						`    | { role: ${role}; variant?: TypographyVariant<${role}>; fontStyle: ${JSON.stringify(style)}; weight: TypographyWeightForStyle<${role}, ${JSON.stringify(style)}> }`
				),
			];
			return `  ${role}:\n${branches.join('\n')};`;
		})
		.join('\n');
	return `type TypographySelectionByRole = {\n${roles}\n};\n`;
}

/** Shared declaration surface for flat and workspace-package typography contracts. */
export function typographyContractTypes(contract: TypographyContract): string {
	const classKeys = typographyClassKeys(contract);
	const classKeyType = classKeys.map((key) => JSON.stringify(key)).join(' | ');
	return (
		`export type TypographyRole = keyof typeof typography.roles;\n` +
		`export type TypographyVariant<R extends TypographyRole> = keyof typeof typography.roles[R]["variants"];\n` +
		`export type TypographyWeight<R extends TypographyRole> = keyof typeof typography.roles[R]["weights"];\n` +
		`export type TypographyStyle<R extends TypographyRole> = keyof typeof typography.roles[R]["styles"];\n` +
		`export type TypographyWeightForStyle<R extends TypographyRole, S extends TypographyStyle<R>> = typeof typography.roles[R]["styles"][S] extends { readonly weights: infer W } ? keyof W : never;\n` +
		selectionTypes(contract) +
		`export type TypographySelectionFor<R extends TypographyRole> = TypographySelectionByRole[R];\n` +
		`export type TypographySelection = {\n` +
		`  [R in TypographyRole]: TypographySelectionFor<R>;\n` +
		`}[TypographyRole];\n` +
		`export type TypographyClassKey = ${classKeyType};\n` +
		`export type TypographyClassMap = Readonly<Record<TypographyClassKey, string>>;\n`
	);
}

function resolverBody(typescript = false): string {
	const roles = typescript
		? `  const roles = typography.roles as Readonly<Record<string, {
    readonly defaultStyle: string;
    readonly base: { readonly weight: string };
    readonly variants: Readonly<Record<string, { readonly weight: string }>>;
    readonly classes: {
      readonly base: string;
      readonly variants: Readonly<Record<string, string>>;
      readonly styleWeights: Readonly<Record<string, Readonly<Record<string, string>>>>;
    };
  }>>;`
		: '  const roles = typography.roles;';
	return `${roles}
  const role = roles[selection.role];
  if (!role) throw new Error(\`Unknown typography role "\${selection.role}".\`);
  const recipe = selection.variant === undefined ? role.base : role.variants[selection.variant];
  const recipeClass =
    selection.variant === undefined ? role.classes.base : role.classes.variants[selection.variant];
  if (!recipe || !recipeClass) {
    throw new Error(\`Unknown typography variant "\${String(selection.variant)}" for role "\${selection.role}".\`);
  }
  const fontStyle = selection.fontStyle ?? role.defaultStyle;
  const weight = selection.weight ?? recipe.weight;
  const styleClass = role.classes.styleWeights[fontStyle]?.[weight];
  if (!styleClass) {
    throw new Error(
      \`Typography role "\${selection.role}" does not expose style "\${fontStyle}" at weight "\${weight}".\`
    );
  }
  const resolved = [recipeClass, styleClass].map((key) => classes[key]);
  if (resolved.some((className) => typeof className !== "string" || className.length === 0)) {
    throw new Error("Typography class map is missing a generated recipe class.");
  }
  return resolved.join(" ");`;
}

export function typographyClassResolverJavascript(): string {
	return `export function typographyClassName(selection, classes) {\n${resolverBody()}\n}\n`;
}

export function typographyClassResolverDeclaration(): string {
	return 'export declare function typographyClassName(selection: TypographySelection, classes: TypographyClassMap): string;';
}

function typographyClassResolverTypescript(): string {
	return `export function typographyClassName(
  selection: TypographySelection,
  classes: TypographyClassMap
): string;
export function typographyClassName(
  selection: { role: string; variant?: string; fontStyle?: string; weight?: string },
  classes: Readonly<Record<string, string>>
): string {
${resolverBody(true)}
}\n`;
}

/** Emit a framework-neutral literal contract for consuming typography safely. */
export function toTypographyTypescript(ir: IR): string {
	if (!ir.typography || Object.keys(ir.typography.roles).length === 0) {
		throw new Error('A typography system with semantic roles is required for TypeScript output.');
	}

	const manifest = JSON.stringify(typographyContractData(ir.typography), null, 2);
	return (
		`// Generated by three-forma-styli. Do not edit.\n` +
		`export const typography = ${manifest} as const;\n\n` +
		typographyContractTypes(ir.typography) +
		`\n` +
		typographyClassResolverTypescript()
	);
}
