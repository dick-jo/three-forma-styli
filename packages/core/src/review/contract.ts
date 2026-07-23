import type { IR, ShadowContractRecipe, TypographyContractRecipe } from '../generator/types.js';
import type { PartialDesignSystem, TypographyRole } from '../types.js';
import type {
	ReviewCapturePolicy,
	ColorReviewCase,
	MotionReviewCase,
	FoundationReviewCase,
	ReviewControl,
	ReviewModeGroup,
	ShadowReviewCase,
	TfsWorkbenchContract,
	TypographyReviewCase,
	TypographySizeOption,
	WorkbenchContractOptions,
} from './types.js';

const defaultCapture: ReviewCapturePolicy = {
	enabled: true,
	viewports: ['desktop'],
	colorModes: ['*'],
	sizeModes: ['*'],
};

/**
 * Encode an authored name as one unambiguous case-ID segment.
 *
 * Only ASCII alphanumerics pass through. Every other Unicode code point,
 * including `_` and `-`, is escaped between underscores, so authored `--`
 * sequences can never collide with the case ID's structural delimiter.
 */
function caseIdSegment(value: string): string {
	return Array.from(value)
		.map((character) =>
			/[A-Za-z0-9]/.test(character)
				? character
				: `_${character.codePointAt(0)!.toString(16).toUpperCase()}_`
		)
		.join('');
}

function colorCases(system: PartialDesignSystem, ir: IR): ColorReviewCase[] {
	if (!system.colors) return [];
	return system.colors.modes.flatMap((mode, modeIndex) => {
		const tokens = mode.isDefault ? ir.tokens : (ir.overrideTokens[mode.name] ?? {});
		const alphaSchedule = mode.alphaSchedule ?? system.colors!.alphaSchedule;
		return Object.entries(mode.tokens).flatMap(([colorName, value]) => {
			const base = Object.values(tokens).find(
				(token) =>
					token.family === 'color' &&
					token.metadata?.baseColor === colorName &&
					!token.metadata.isAlphaVariant
			);
			if (!base) return [];
			const sourcePath = `/colors/modes/${modeIndex}/tokens/${pointerSegment(colorName)}`;
			const alphaVariants = Object.values(tokens)
				.filter(
					(token) =>
						token.family === 'color' &&
						token.metadata?.baseColor === colorName &&
						token.metadata.isAlphaVariant
				)
				.map((token) => ({
					label: token.metadata?.alphaLevel ?? token.name,
					alpha: alphaSchedule[token.metadata?.alphaLevel ?? ''] ?? 0,
					token: token.name,
					css: token.value,
				}));
			return [
				{
					kind: 'color',
					id: `color--${caseIdSegment(mode.name)}--${caseIdSegment(colorName)}`,
					label: `${colorName} / ${mode.name}`,
					sourcePath,
					mode: mode.name,
					color: colorName,
					token: base.name,
					css: base.value,
					value: { l: value.l, c: value.c, h: value.h ?? 0 },
					alphaVariants,
					controls: [
						{
							kind: 'number',
							id: 'l',
							label: 'luminance',
							path: `${sourcePath}/l`,
							value: value.l,
							min: 0,
							max: 1,
							step: 0.001,
						},
						{
							kind: 'number',
							id: 'c',
							label: 'chroma',
							path: `${sourcePath}/c`,
							value: value.c,
							min: 0,
							max: 0.5,
							step: 0.001,
						},
						{
							kind: 'number',
							id: 'h',
							label: 'hue',
							path: `${sourcePath}/h`,
							value: value.h ?? 0,
							min: 0,
							max: 360,
							step: 0.1,
							unit: 'deg',
						},
					],
					capture: {
						...defaultCapture,
						colorModes: [mode.name],
					},
				},
			];
		});
	});
}

function pointerSegment(value: string): string {
	return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function modeGroups(ir: IR): ReviewModeGroup[] {
	const group = (category: 'color' | 'size'): ReviewModeGroup | undefined => {
		const info = ir.modes[category];
		if (!info.default) return undefined;
		const names = [info.default, ...info.overrides].filter(
			(name, index, values) => Boolean(name) && values.indexOf(name) === index
		);
		return {
			category,
			default: info.default,
			modes: names.map((name) => ({
				name,
				isDefault: name === info.default,
				tokens:
					name === info.default
						? {}
						: Object.fromEntries(
								Object.entries(ir.overrideTokens[name] ?? {})
									.filter(([, token]) =>
										category === 'color'
											? token.family === 'color'
											: ['spacing', 'gap', 'typography', 'borderRadius', 'borderWidth'].includes(
													token.family
												)
									)
									.map(([tokenName, token]) => [`--${tokenName}`, token.value])
							),
			})),
		};
	};
	return [group('color'), group('size')].filter(
		(value): value is ReviewModeGroup => value !== undefined
	);
}

function typographySizeOptions(system: PartialDesignSystem): TypographySizeOption[] {
	const defaultMode = system.typography?.modes.find((mode) => mode.isDefault);
	if (!defaultMode) return [];
	const options: TypographySizeOption[] = [{ label: 'min', value: 'min' }];
	for (let step = 1; step <= defaultMode.tokens.range; step += 1) {
		options.push({ label: String(step), value: step });
	}
	return options;
}

function recipeControls(
	roleName: string,
	variantName: string | null,
	role: TypographyRole,
	recipe: TypographyContractRecipe,
	sizeOptions: TypographySizeOption[]
): ReviewControl[] {
	const sourcePath = `/typography/roles/${pointerSegment(roleName)}/${
		variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
	}`;
	const weightAlias = recipe.weight;
	const currentSuffix =
		recipe.fontSizeReference === 'min' ? 'min' : String(recipe.fontSizeReference);
	const atomicPrefix = recipe.atomicFontSizeToken.slice(0, -(currentSuffix.length + 1));
	return [
		{
			kind: 'select',
			id: 'fontSize',
			label: 'size',
			path: `${sourcePath}/fontSize`,
			value: recipe.fontSizeReference,
			options: sizeOptions.map((option) => ({
				...option,
				css: `var(--${atomicPrefix}-${option.value})`,
			})),
		},
		{
			kind: 'number',
			id: 'lineHeight',
			label: 'line height',
			path: `${sourcePath}/lineHeight`,
			value: recipe.lineHeight,
			min: 0.5,
			max: 3,
			step: 0.005,
		},
		{
			kind: 'number',
			id: 'letterSpacing',
			label: 'letter spacing',
			path: `${sourcePath}/letterSpacing`,
			value: recipe.letterSpacingEm,
			min: -0.1,
			max: 0.1,
			step: 0.0005,
			unit: 'em',
		},
		{
			kind: 'select',
			id: 'weight',
			label: 'weight',
			path: `${sourcePath}/weight`,
			value: weightAlias,
			options: Object.entries(role.weights).map(([alias, value]) => ({
				label: `${alias} · ${value}`,
				value: alias,
			})),
		},
	];
}

function typographyCases(
	system: PartialDesignSystem,
	ir: IR,
	adjustedFallbackFamilies: Record<string, string>
): TypographyReviewCase[] {
	const sourceTypography = system.typography;
	const contractTypography = ir.typography;
	const sourceRoles = sourceTypography?.roles;
	if (!sourceTypography || !sourceRoles || !contractTypography) return [];
	const sizes = typographySizeOptions(system);
	return Object.entries(contractTypography.roles).flatMap(([roleName, contractRole]) => {
		const sourceRole = sourceRoles[roleName];
		if (!sourceRole) return [];
		const font = contractTypography.fonts[contractRole.font];
		if (!font) return [];
		const recipes = [
			[null, contractRole.base] as const,
			...contractRole.displayOrder
				.filter((name) => name !== 'base')
				.map((name) => [name, contractRole.variants[name]] as const),
		].filter((entry): entry is readonly [string | null, TypographyContractRecipe] =>
			Boolean(entry[1])
		);
		return recipes.map(([variantName, recipe]) => {
			const sourcePath = `/typography/roles/${pointerSegment(roleName)}/${
				variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
			}`;
			const weightAlias = recipe.weight;
			const adjustedFallback = adjustedFallbackFamilies[roleName];
			return {
				kind: 'typography',
				id: `typography--${caseIdSegment(roleName)}--${caseIdSegment(variantName ?? 'base')}`,
				label: `${roleName} / ${variantName ?? 'base'}`,
				sourcePath,
				role: roleName,
				variant: variantName,
				font: {
					id: contractRole.font,
					family: font.family,
					fallbacks: font.fallbacks.filter((family) => family !== adjustedFallback),
					...(adjustedFallback ? { adjustedFallback } : {}),
				},
				style: contractRole.defaultStyle,
				weight: { alias: weightAlias, value: sourceRole.weights[weightAlias]! },
				availableStyles: Object.keys(contractRole.styles),
				availableWeights: Object.entries(sourceRole.weights).map(([alias, value]) => ({
					alias,
					value,
				})),
				styleWeights: Object.fromEntries(
					Object.entries(contractRole.styles).map(([style, entry]) => [
						style,
						(entry?.weights ?? []).map((alias) => ({
							alias,
							value: sourceRole.weights[alias]!,
						})),
					])
				),
				recipe,
				controls: recipeControls(roleName, variantName, sourceRole, recipe, sizes),
				capture: defaultCapture,
			};
		});
	});
}

function shadowLayerControls(
	kind: 'box' | 'text',
	recipeName: string,
	variantName: string | null,
	layers: ShadowReviewCase['layers'],
	unit: string
): ReviewControl[] {
	const path = `/shadows/${kind}/${pointerSegment(recipeName)}/${
		variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
	}`;
	return layers.flatMap((layer, index) => {
		const base = `${path}/${index}`;
		const controls: ReviewControl[] = [
			{
				kind: 'number',
				id: `layer-${index}-x`,
				label: `layer ${index + 1} x`,
				path: `${base}/x`,
				value: layer.x,
				min: -128,
				max: 128,
				step: 0.5,
				unit,
			},
			{
				kind: 'number',
				id: `layer-${index}-y`,
				label: `layer ${index + 1} y`,
				path: `${base}/y`,
				value: layer.y,
				min: -128,
				max: 128,
				step: 0.5,
				unit,
			},
			{
				kind: 'number',
				id: `layer-${index}-blur`,
				label: `layer ${index + 1} blur`,
				path: `${base}/blur`,
				value: layer.blur,
				min: 0,
				max: 192,
				step: 0.5,
				unit,
			},
		];
		if (kind === 'box') {
			controls.push({
				kind: 'number',
				id: `layer-${index}-spread`,
				label: `layer ${index + 1} spread`,
				path: `${base}/spread`,
				value: layer.spread ?? 0,
				min: -64,
				max: 128,
				step: 0.5,
				unit,
			});
		}
		return controls;
	});
}

function shadowRecipeCases(
	kind: 'box' | 'text',
	name: string,
	recipe: ShadowContractRecipe,
	unit: string
): ShadowReviewCase[] {
	const values = [
		[null, recipe.base] as const,
		...recipe.displayOrder
			.filter((variant) => variant !== 'base')
			.map((variant) => [variant, recipe.variants[variant]] as const),
	].filter((entry): entry is readonly [string | null, NonNullable<(typeof entry)[1]>] =>
		Boolean(entry[1])
	);
	return values.map(([variantName, value]) => ({
		kind: 'shadow',
		id: `shadows--${kind}--${caseIdSegment(name)}--${caseIdSegment(variantName ?? 'base')}`,
		label: `${kind} / ${name} / ${variantName ?? 'base'}`,
		sourcePath: `/shadows/${kind}/${pointerSegment(name)}/${
			variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
		}`,
		shadowKind: kind,
		recipe: name,
		variant: variantName,
		token: value.token,
		css: value.css,
		unit,
		layers: value.layers,
		controls: shadowLayerControls(kind, name, variantName, value.layers, unit),
		capture: defaultCapture,
	}));
}

function shadowCases(ir: IR): ShadowReviewCase[] {
	if (!ir.shadows) return [];
	return [
		...Object.entries(ir.shadows.box).flatMap(([name, recipe]) =>
			shadowRecipeCases('box', name, recipe, ir.shadows!.unit)
		),
		...Object.entries(ir.shadows.text).flatMap(([name, recipe]) =>
			shadowRecipeCases('text', name, recipe, ir.shadows!.unit)
		),
	];
}

function motionCases(ir: IR): MotionReviewCase[] {
	if (!ir.motion) return [];
	return Object.entries(ir.motion.recipes).flatMap(([recipeName, recipe]) => {
		const values = [
			[null, recipe.base] as const,
			...recipe.displayOrder
				.filter((variant) => variant !== 'base')
				.map((variant) => [variant, recipe.variants[variant]] as const),
		].filter((entry): entry is readonly [string | null, NonNullable<(typeof entry)[1]>] =>
			Boolean(entry[1])
		);
		return values.map(([variantName, value]) => ({
			kind: 'motion',
			id: `motion--${caseIdSegment(recipeName)}--${caseIdSegment(variantName ?? 'base')}`,
			label: `${recipeName} / ${variantName ?? 'base'}`,
			sourcePath: `/motion/recipes/${pointerSegment(recipeName)}/${
				variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
			}`,
			recipe: recipeName,
			variant: variantName,
			token: value.token,
			duration: {
				token: value.duration.token,
				milliseconds: value.duration.milliseconds,
			},
			delay: {
				token: value.delay.token,
				milliseconds: value.delay.milliseconds,
			},
			easing: value.easing,
			controls: [],
			capture: defaultCapture,
		}));
	});
}

function foundationCases(ir: IR): FoundationReviewCase[] {
	const families = [
		['spacing', '/spacing'],
		['gap', '/gap'],
		['borderRadius', '/border/radius'],
		['borderWidth', '/border/width'],
		['time', '/time'],
	] as const;
	return families.flatMap(([family, sourcePath]) => {
		const tokens = Object.values(ir.tokens)
			.filter((token) => token.family === family)
			.map((token) => ({
				name: token.name,
				value: token.value,
				rawValue: token.rawValue,
				unit: token.unit,
			}));
		if (tokens.length === 0) return [];
		return [
			{
				kind: 'foundation',
				id: `foundations--${family}`,
				label: family.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`),
				sourcePath,
				family,
				tokens,
				controls: [],
				capture: defaultCapture,
			},
		];
	});
}

/** Build the stable, serializable boundary shared by the workbench and browser tests. */
export function createWorkbenchContract(
	system: PartialDesignSystem,
	ir: IR,
	options: WorkbenchContractOptions
): TfsWorkbenchContract {
	const typography = typographyCases(system, ir, options.adjustedFallbackFamilies ?? {});
	const colors = colorCases(system, ir);
	const shadows = shadowCases(ir);
	const motion = motionCases(ir);
	const foundations = foundationCases(ir);
	const modes = modeGroups(ir);
	return {
		kind: 'three-forma-styli/workbench',
		schemaVersion: 1,
		systemFingerprint: options.systemFingerprint,
		toolVersion: options.toolVersion,
		title: options.title ?? 'TFS workbench',
		assets: { stylesheets: options.stylesheets },
		globals: {
			modes,
			viewports: [
				{ id: 'compact', label: 'compact', width: 390, height: 844 },
				{ id: 'desktop', label: 'desktop', width: 1440, height: 900 },
				{ id: 'display', label: 'display', width: 1600, height: 900 },
			],
		},
		labs: [
			{
				kind: 'overview',
				id: 'overview',
				label: 'overview',
				summary: {
					tokenCount: Object.keys(ir.tokens).length,
					colorModes: modes.find((mode) => mode.category === 'color')?.modes.length ?? 0,
					colorCases: colors.length,
					sizeModes: modes.find((mode) => mode.category === 'size')?.modes.length ?? 0,
					typographyCases: typography.length,
					shadowCases: shadows.length,
					motionCases: motion.length,
					foundationCases: foundations.length,
				},
			},
			...(colors.length > 0
				? [{ kind: 'color' as const, id: 'color' as const, label: 'color', cases: colors }]
				: []),
			...(typography.length > 0
				? [
						{
							kind: 'typography' as const,
							id: 'typography' as const,
							label: 'typography',
							cases: typography,
						},
					]
				: []),
			...(shadows.length > 0
				? [{ kind: 'shadows' as const, id: 'shadows' as const, label: 'shadows', cases: shadows }]
				: []),
			...(motion.length > 0
				? [{ kind: 'motion' as const, id: 'motion' as const, label: 'motion', cases: motion }]
				: []),
			...(foundations.length > 0
				? [
						{
							kind: 'foundation' as const,
							id: 'foundations' as const,
							label: 'foundations',
							cases: foundations,
						},
					]
				: []),
		],
		diagnostics: [],
		agent: {
			verification: {
				generate: options.verification?.generate ?? 'tfs build .',
				check: options.verification?.check ?? 'tfs check .',
			},
		},
		motion: ir.motion,
	};
}
