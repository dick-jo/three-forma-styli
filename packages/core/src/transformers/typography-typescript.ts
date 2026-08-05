import type { IR, TypographyContract } from '../generator/types.js';
import { typographyClassKeys, typographyRoleClassKeys } from './typography-class-names.js';

function variable(name: string): string {
	return `var(--${name})`;
}

function recipeManifest(composite: TypographyContract['roles'][string]['sizes'][string]) {
	return {
		fontSize: variable(composite.fontSizeToken),
		fontWeight: variable(composite.fontWeightToken),
		weight: composite.weight,
		lineHeight: variable(composite.lineHeightToken),
		letterSpacing: variable(composite.letterSpacingToken),
		...(composite.textTransformToken
			? {
					textTransform: variable(composite.textTransformToken),
					textTransformValue: composite.textTransform,
				}
			: {}),
		...(composite.fontKerningToken ? { fontKerning: variable(composite.fontKerningToken) } : {}),
		...(composite.fontOpticalSizingToken
			? { fontOpticalSizing: variable(composite.fontOpticalSizingToken) }
			: {}),
		...(composite.fontFeatureSettingsToken
			? { fontFeatureSettings: variable(composite.fontFeatureSettingsToken) }
			: {}),
		...(composite.fontVariationSettingsToken
			? { fontVariationSettings: variable(composite.fontVariationSettingsToken) }
			: {}),
	};
}

function semanticVariantManifest(variant: TypographyContract['roles'][string]['variants'][string]) {
	return {
		...(variant.weight ? { weight: variant.weight } : {}),
		...(variant.fontStyle ? { fontStyle: variant.fontStyle } : {}),
		...(variant.fontWeightToken ? { fontWeight: variable(variant.fontWeightToken) } : {}),
		...(variant.fontStyleToken ? { fontStyleValue: variable(variant.fontStyleToken) } : {}),
		...(variant.lineHeightToken ? { lineHeight: variable(variant.lineHeightToken) } : {}),
		...(variant.letterSpacingToken ? { letterSpacing: variable(variant.letterSpacingToken) } : {}),
		...(variant.textTransformToken ? { textTransform: variable(variant.textTransformToken) } : {}),
		...(variant.fontKerningToken ? { fontKerning: variable(variant.fontKerningToken) } : {}),
		...(variant.fontOpticalSizingToken
			? { fontOpticalSizing: variable(variant.fontOpticalSizingToken) }
			: {}),
		...(variant.fontFeatureSettingsToken
			? { fontFeatureSettings: variable(variant.fontFeatureSettingsToken) }
			: {}),
		...(variant.fontVariationSettingsToken
			? { fontVariationSettings: variable(variant.fontVariationSettingsToken) }
			: {}),
	};
}

/** Serializable semantic typography contract shared by typed project targets. */
export function typographyContractData(contract: TypographyContract) {
	const roleClassKeys = typographyRoleClassKeys(contract);
	return {
		schemaVersion: 1,
		roles: Object.fromEntries(
			Object.entries(contract.roles).map(([roleName, role]) => [
				roleName,
				{
					fontFamily: variable(role.fontFamilyToken),
					defaultStyle: role.defaultStyle,
					classes: {
						sizes: roleClassKeys[roleName]!.sizes,
						variants: roleClassKeys[roleName]!.variants,
						styleWeights: roleClassKeys[roleName]!.styleWeights,
					},
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
					displayOrder: [...role.displayOrder],
					sizes: Object.fromEntries(
						Object.entries(role.sizes).map(([name, composite]) => [name, recipeManifest(composite)])
					),
					variants: Object.fromEntries(
						Object.entries(role.variants).map(([name, variant]) => [
							name,
							semanticVariantManifest(variant),
						])
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
			const defaultStyle = JSON.stringify(contractRole.defaultStyle);
			const branches = [
				`    | { role: ${role}; size?: TypographySize<${role}>; variant?: TypographyVariant<${role}>; fontStyle?: ${defaultStyle}; weight?: TypographyWeightForStyle<${role}, ${defaultStyle}> }`,
				...Object.keys(contractRole.styles)
					.filter((style) => style !== contractRole.defaultStyle)
					.map(
						(style) =>
							`    | { role: ${role}; size?: TypographySize<${role}>; variant?: TypographyVariant<${role}>; fontStyle: ${JSON.stringify(style)}; weight: TypographyWeightForStyle<${role}, ${JSON.stringify(style)}> }`
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
		`export type TypographySize<R extends TypographyRole> = keyof typeof typography.roles[R]["sizes"];\n` +
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
    readonly sizes: Readonly<Record<string, { readonly weight: string }>>;
    readonly variants: Readonly<Record<string, { readonly weight?: string; readonly fontStyle?: string }>>;
    readonly classes: {
      readonly sizes: Readonly<Record<string, string>>;
      readonly variants: Readonly<Record<string, string>>;
      readonly styleWeights: Readonly<Record<string, Readonly<Record<string, string>>>>;
    };
  }>>;`
		: '  const roles = typography.roles;';
	return `${roles}
  const role = roles[selection.role];
  if (!role) throw new Error(\`Unknown typography role "\${selection.role}".\`);
	const size = selection.size ?? "base";
  const composite = role.sizes[size];
  const recipeClass = role.classes.sizes[size];
  if (!composite || !recipeClass) {
    throw new Error(\`Unknown typography size "\${String(selection.size)}" for role "\${selection.role}".\`);
  }
  const variant = selection.variant === undefined ? undefined : role.variants[selection.variant];
  const variantClass = selection.variant === undefined ? undefined : role.classes.variants[selection.variant];
  if (selection.variant !== undefined && (!variant || !variantClass)) {
    throw new Error(\`Unknown typography variant "\${String(selection.variant)}" for role "\${selection.role}".\`);
  }
  const fontStyle = selection.fontStyle ?? variant?.fontStyle ?? role.defaultStyle;
  const weight = selection.weight ?? variant?.weight ?? composite.weight;
  const styleClass = role.classes.styleWeights[fontStyle]?.[weight];
  if (!styleClass) {
    throw new Error(
      \`Typography role "\${selection.role}" does not expose style "\${fontStyle}" at weight "\${weight}".\`
    );
  }
  const resolved = [recipeClass, variantClass, styleClass]
    .filter((key) => key !== undefined)
    .map((key) => classes[key]);
  if (resolved.some((className) => typeof className !== "string" || className.length === 0)) {
    throw new Error("Typography class map is missing a generated composite class.");
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
  selection: { role: string; size?: string; variant?: string; fontStyle?: string; weight?: string },
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
