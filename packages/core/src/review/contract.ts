import type {
	IR,
	ShadowContractComposite,
	TypographyContractComposite,
	TypographyContractSemanticVariant,
} from '../generator/types.js';
import type {
	FontSizeReference,
	PartialDesignSystem,
	TypographyMode,
	TypographyRole,
} from '../types.js';
import type {
	AlphaReviewCase,
	ReviewCapturePolicy,
	ColorReviewCase,
	MotionReviewCase,
	FoundationReviewCase,
	ReviewControl,
	ReviewDiagnostic,
	ReviewModeGroup,
	ShadowReviewCase,
	TfsWorkbenchContract,
	TypographyReviewCase,
	TypographySizeOption,
	WorkbenchContractOptions,
} from './types.js';

function alphaCases(ir: IR): AlphaReviewCase[] {
	if (!ir.alpha) return [];
	return Object.entries(ir.alpha.scales).map(([scaleName, scale]) => {
		const sourcePath = `/alpha/scales/${pointerSegment(scaleName)}/values`;
		const values = Object.entries(scale.values).map(([position, value]) => ({
			position: position as AlphaReviewCase['values'][number]['position'],
			value: value.value,
			token: value.token,
			css: value.css,
		}));
		return {
			kind: 'alpha',
			id: `alpha--${caseIdSegment(scaleName)}`,
			label: `${scaleName}${scaleName === ir.alpha!.defaultScale ? ' / default' : ''}`,
			sourcePath,
			scale: scaleName,
			isDefault: scaleName === ir.alpha!.defaultScale,
			values,
			controls: values
				.filter((value) => value.position !== 'non')
				.map((value) => ({
					kind: 'number' as const,
					id: value.position,
					label: value.position,
					path: `${sourcePath}/${pointerSegment(value.position)}`,
					value: value.value,
					min: 0.001,
					max: 0.999,
					step: 0.001,
				})),
			capture: capturePolicy(),
		};
	});
}

function capturePolicy(
	overrides: Partial<
		Pick<ReviewCapturePolicy, 'colorModes' | 'sizeModes' | 'viewports' | 'motionPreferences'>
	> = {}
): ReviewCapturePolicy {
	return {
		enabled: true,
		viewports: [...(overrides.viewports ?? ['desktop'])],
		colorModes: [...(overrides.colorModes ?? ['$default'])],
		sizeModes: [...(overrides.sizeModes ?? ['$default'])],
		motionPreferences: [...(overrides.motionPreferences ?? [])],
	};
}

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
	const selectedAlphaScale = ir.alpha?.scales[system.colors.alphaScale ?? ir.alpha.defaultScale];
	const resolvedAlphaSchedule = selectedAlphaScale
		? Object.fromEntries(
				Object.entries(selectedAlphaScale.values).map(([position, value]) => [
					position,
					value.value,
				])
			)
		: undefined;
	return system.colors.modes.flatMap((mode, modeIndex) => {
		const tokens = mode.isDefault ? ir.tokens : (ir.overrideTokens[mode.name] ?? {});
		const alphaSchedule = resolvedAlphaSchedule ?? {};
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
					capture: capturePolicy({ colorModes: [mode.name] }),
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

function typographySizeOptions(mode: TypographyMode & { name: string }): TypographySizeOption[] {
	const options: TypographySizeOption[] = [{ label: 'min', value: 'min' }];
	for (let step = 1; step <= mode.tokens.range; step += 1) {
		options.push({ label: String(step), value: step });
	}
	return options;
}

function recipeControls(
	sourcePath: string,
	role: TypographyRole,
	composite: TypographyContractComposite,
	sizeOptions: TypographySizeOption[]
): ReviewControl[] {
	const weightAlias = composite.weight;
	const currentSuffix =
		composite.fontSizeReference === 'min' ? 'min' : String(composite.fontSizeReference);
	const atomicPrefix = composite.atomicFontSizeToken.slice(0, -(currentSuffix.length + 1));
	return [
		{
			kind: 'select',
			id: 'fontSize',
			label: 'size',
			path: `${sourcePath}/fontSize`,
			value: composite.fontSizeReference,
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
			value: composite.lineHeight,
			min: 0.5,
			max: 3,
			step: 0.005,
		},
		{
			kind: 'number',
			id: 'letterSpacing',
			label: 'letter spacing',
			path: `${sourcePath}/letterSpacing`,
			value: composite.letterSpacingEm,
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

function semanticVariantControls(
	sourcePath: string,
	role: TypographyRole,
	composite: TypographyContractComposite,
	style: string,
	availableStyles: string[]
): ReviewControl[] {
	return [
		{
			kind: 'number',
			id: 'lineHeight',
			label: 'line height',
			path: `${sourcePath}/lineHeight`,
			value: composite.lineHeight,
			min: 0.5,
			max: 3,
			step: 0.005,
		},
		{
			kind: 'number',
			id: 'letterSpacing',
			label: 'letter spacing',
			path: `${sourcePath}/letterSpacing`,
			value: composite.letterSpacingEm,
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
			value: composite.weight,
			options: Object.entries(role.weights).map(([alias, value]) => ({
				label: `${alias} · ${value}`,
				value: alias,
			})),
		},
		{
			kind: 'select',
			id: 'fontStyle',
			label: 'style',
			path: `${sourcePath}/fontStyle`,
			value: style,
			options: availableStyles.map((value) => ({ label: value, value })),
		},
	];
}

function atomicFontSizePrefix(composite: TypographyContractComposite): string {
	const suffix =
		composite.fontSizeReference === 'min' ? 'min' : String(composite.fontSizeReference);
	return composite.atomicFontSizeToken.slice(0, -(suffix.length + 1));
}

function fontSizeReference(
	reference: string | undefined,
	fallback: FontSizeReference,
	atomicPrefix: string
): FontSizeReference {
	if (!reference?.startsWith(`${atomicPrefix}-`)) return fallback;
	const suffix = reference.slice(atomicPrefix.length + 1);
	if (suffix === 'min') return 'min';
	const numeric = Number(suffix);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

/**
 * Resolve the exact composite visible in one typography mode from the generated IR.
 *
 * Non-default mode token sets intentionally contain only declarations that must
 * be rebound inside that selector. Missing declarations therefore inherit the
 * default contract rather than becoming empty values.
 */
function modeComposite(
	ir: IR,
	modeName: string,
	defaultModeName: string,
	role: TypographyContractComposite,
	weightTokens: Record<string, string>
): TypographyContractComposite {
	const tokens = modeName === defaultModeName ? ir.tokens : (ir.overrideTokens[modeName] ?? {});
	const atomicPrefix = atomicFontSizePrefix(role);
	const resolvedFontSize = fontSizeReference(
		tokens[role.fontSizeToken]?.reference,
		role.fontSizeReference,
		atomicPrefix
	);
	const weightReference = tokens[role.fontWeightToken]?.reference;
	const resolvedWeight =
		Object.entries(weightTokens).find(([, token]) => token === weightReference)?.[0] ?? role.weight;
	const recipePrefix = role.fontSizeToken.slice(0, -'-font-size'.length);
	const textTransformTokenName = `${recipePrefix}-text-transform`;
	const textTransformValue = tokens[textTransformTokenName]?.value;

	return {
		...role,
		fontSizeReference: resolvedFontSize,
		atomicFontSizeToken: `${atomicPrefix}-${resolvedFontSize}`,
		weight: resolvedWeight,
		lineHeight: tokens[role.lineHeightToken]?.rawValue ?? role.lineHeight,
		letterSpacingEm: tokens[role.letterSpacingToken]?.rawValue ?? role.letterSpacingEm,
		...(textTransformValue
			? {
					textTransformToken: textTransformTokenName,
					textTransform: textTransformValue as TypographyContractComposite['textTransform'],
				}
			: {}),
	};
}

function semanticVariantComposite(
	ir: IR,
	composite: TypographyContractComposite,
	variant: TypographyContractSemanticVariant
): TypographyContractComposite {
	const token = (name: string | undefined) => (name ? ir.tokens[name] : undefined);
	const textTransform = token(variant.textTransformToken)?.value as
		TypographyContractComposite['textTransform'] | undefined;
	return {
		...composite,
		...(variant.weight ? { weight: variant.weight } : {}),
		...(variant.fontWeightToken ? { fontWeightToken: variant.fontWeightToken } : {}),
		...(variant.lineHeightToken
			? {
					lineHeightToken: variant.lineHeightToken,
					lineHeight: token(variant.lineHeightToken)?.rawValue ?? composite.lineHeight,
				}
			: {}),
		...(variant.letterSpacingToken
			? {
					letterSpacingToken: variant.letterSpacingToken,
					letterSpacingEm: token(variant.letterSpacingToken)?.rawValue ?? composite.letterSpacingEm,
				}
			: {}),
		...(variant.textTransformToken
			? { textTransformToken: variant.textTransformToken, textTransform }
			: {}),
		...(variant.fontKerningToken ? { fontKerningToken: variant.fontKerningToken } : {}),
		...(variant.fontOpticalSizingToken
			? { fontOpticalSizingToken: variant.fontOpticalSizingToken }
			: {}),
		...(variant.fontFeatureSettingsToken
			? { fontFeatureSettingsToken: variant.fontFeatureSettingsToken }
			: {}),
		...(variant.fontVariationSettingsToken
			? { fontVariationSettingsToken: variant.fontVariationSettingsToken }
			: {}),
	};
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
	const defaultMode =
		sourceTypography.modes.find((mode) => mode.isDefault) ?? sourceTypography.modes[0];
	if (!defaultMode) return [];
	const orderedModes = [
		defaultMode,
		...sourceTypography.modes.filter((mode) => mode !== defaultMode),
	];
	return Object.entries(contractTypography.roles).flatMap(([roleName, contractRole]) => {
		const sourceRole = sourceRoles[roleName];
		if (!sourceRole) return [];
		const font = contractTypography.fonts[contractRole.font];
		if (!font) return [];
		const adjustedFallback = adjustedFallbackFamilies[roleName];
		return orderedModes.flatMap((mode) => {
			const composites = contractRole.displayOrder
				.map((name) => [name === 'base' ? null : name, contractRole.sizes[name]] as const)
				.filter((entry): entry is readonly [string | null, TypographyContractComposite] =>
					Boolean(entry[1])
				);
			const sizes = typographySizeOptions(mode);
			return composites.flatMap(([sizeName, defaultComposite]) => {
				const composite = modeComposite(
					ir,
					mode.name,
					defaultMode.name,
					defaultComposite,
					contractRole.weightTokens
				);
				const recipePath = `sizes/${pointerSegment(sizeName ?? 'base')}`;
				const sourcePath =
					mode.name === defaultMode.name
						? `/typography/roles/${pointerSegment(roleName)}/${recipePath}`
						: `/typography/roles/${pointerSegment(roleName)}/modeOverrides/${pointerSegment(
								mode.name
							)}/${recipePath}`;
				const defaultId = `typography--${caseIdSegment(roleName)}--${caseIdSegment(
					sizeName ?? 'base'
				)}`;
				const id =
					mode.name === defaultMode.name
						? defaultId
						: `typography--${caseIdSegment(mode.name)}--${caseIdSegment(
								roleName
							)}--${caseIdSegment(sizeName ?? 'base')}`;
				const availableStyles = Object.keys(contractRole.styles);
				const availableWeights = Object.entries(sourceRole.weights).map(([alias, value]) => ({
					alias,
					value,
				}));
				const styleWeights = Object.fromEntries(
					Object.entries(contractRole.styles).map(([style, entry]) => [
						style,
						(entry?.weights ?? []).map((alias) => ({
							alias,
							value: sourceRole.weights[alias]!,
						})),
					])
				);
				const baseCase: TypographyReviewCase = {
					kind: 'typography',
					id,
					label: `${roleName} / ${sizeName ?? 'base'}`,
					sourcePath,
					mode: mode.name,
					role: roleName,
					size: sizeName,
					variant: null,
					font: {
						id: contractRole.font,
						family: font.family,
						fallbacks: font.fallbacks.filter((family) => family !== adjustedFallback),
						...(adjustedFallback ? { adjustedFallback } : {}),
					},
					style: contractRole.defaultStyle,
					weight: { alias: composite.weight, value: sourceRole.weights[composite.weight]! },
					availableStyles,
					availableWeights,
					styleWeights,
					composite,
					controls: recipeControls(sourcePath, sourceRole, composite, sizes),
					capture: capturePolicy({ sizeModes: [mode.name] }),
				};
				const variants = Object.entries(contractRole.variants).map(
					([variantName, semanticVariant]): TypographyReviewCase => {
						const variantComposite = semanticVariantComposite(ir, composite, semanticVariant);
						const variantStyle = semanticVariant.fontStyle ?? contractRole.defaultStyle;
						const variantPath = `/typography/roles/${pointerSegment(
							roleName
						)}/variants/${pointerSegment(variantName)}`;
						return {
							...baseCase,
							id: `${id}--variant--${caseIdSegment(variantName)}`,
							label: `${roleName} / ${sizeName ?? 'base'} / ${variantName}`,
							sourcePath: variantPath,
							variant: variantName,
							style: variantStyle,
							weight: {
								alias: variantComposite.weight,
								value: sourceRole.weights[variantComposite.weight]!,
							},
							composite: variantComposite,
							controls: semanticVariantControls(
								variantPath,
								sourceRole,
								variantComposite,
								variantStyle,
								availableStyles
							),
						};
					}
				);
				return [baseCase, ...variants];
			});
		});
	});
}

function shadowLayerControls(
	kind: 'box' | 'text',
	compositeName: string,
	variantName: string | null,
	layers: ShadowReviewCase['layers'],
	unit: string
): ReviewControl[] {
	const path = `/shadows/${kind}/${pointerSegment(compositeName)}/${
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

function shadowCompositeCases(
	kind: 'box' | 'text',
	name: string,
	composite: ShadowContractComposite,
	unit: string
): ShadowReviewCase[] {
	const values = [
		[null, composite.base] as const,
		...composite.displayOrder
			.filter((variant) => variant !== 'base')
			.map((variant) => [variant, composite.variants[variant]] as const),
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
		composite: name,
		variant: variantName,
		token: value.token,
		css: value.css,
		unit,
		layers: value.layers,
		controls: shadowLayerControls(kind, name, variantName, value.layers, unit),
		capture: capturePolicy({ colorModes: ['*'] }),
	}));
}

function shadowCases(ir: IR): ShadowReviewCase[] {
	if (!ir.shadows) return [];
	return [
		...Object.entries(ir.shadows.box).flatMap(([name, composite]) =>
			shadowCompositeCases('box', name, composite, ir.shadows!.unit)
		),
		...Object.entries(ir.shadows.text).flatMap(([name, composite]) =>
			shadowCompositeCases('text', name, composite, ir.shadows!.unit)
		),
	];
}

function motionCases(ir: IR): MotionReviewCase[] {
	if (!ir.motion) return [];
	return Object.entries(ir.motion.composites).flatMap(([compositeName, composite]) => {
		const values = [
			[null, composite.base] as const,
			...composite.displayOrder
				.filter((variant) => variant !== 'base')
				.map((variant) => [variant, composite.variants[variant]] as const),
		].filter((entry): entry is readonly [string | null, NonNullable<(typeof entry)[1]>] =>
			Boolean(entry[1])
		);
		return values.map(([variantName, value]) => {
			const reduced =
				variantName === null
					? composite.reducedMotion.base
					: composite.reducedMotion.variants[variantName];
			return {
				kind: 'motion',
				id: `motion--${caseIdSegment(compositeName)}--${caseIdSegment(variantName ?? 'base')}`,
				label: `${compositeName} / ${variantName ?? 'base'}`,
				sourcePath: `/motion/composites/${pointerSegment(compositeName)}/${
					variantName === null ? 'base' : `variants/${pointerSegment(variantName)}`
				}`,
				composite: compositeName,
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
				reducedMotion: {
					behavior: reduced.behavior,
					duration: {
						token: reduced.duration.token,
						milliseconds: reduced.duration.milliseconds,
					},
					delay: {
						token: reduced.delay.token,
						milliseconds: reduced.delay.milliseconds,
					},
					easing: reduced.easing,
				},
				controls: [],
				capture: capturePolicy({ motionPreferences: ['no-preference', 'reduce'] }),
			};
		});
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
				capture: capturePolicy({ sizeModes: ['*'] }),
			},
		];
	});
}

function reviewDiagnostics(ir: IR): ReviewDiagnostic[] {
	if (!ir.typography) return [];
	return Object.entries(ir.typography.fonts).flatMap(([fontId, font]) => {
		const path = `/typography/fonts/${pointerSegment(fontId)}`;
		const warnings: ReviewDiagnostic[] = font.verified
			? []
			: [
					{
						id: `typography-font-${caseIdSegment(fontId)}-unverified`,
						severity: 'info',
						message: `Font "${fontId}" is externally managed; TFS did not verify a prepared font manifest.`,
						path,
					},
				];
		return [
			...warnings,
			...font.warnings.map((message, index) => ({
				id: `typography-font-${caseIdSegment(fontId)}-warning-${index + 1}`,
				severity: 'warning' as const,
				message,
				path,
			})),
		];
	});
}

/** Build the stable, serializable boundary shared by the workbench and browser tests. */
export function createWorkbenchContract(
	system: PartialDesignSystem,
	ir: IR,
	options: WorkbenchContractOptions
): TfsWorkbenchContract {
	const alpha = alphaCases(ir);
	const typography = typographyCases(system, ir, options.adjustedFallbackFamilies ?? {});
	const colors = colorCases(system, ir);
	const shadows = shadowCases(ir);
	const motion = motionCases(ir);
	const foundations = foundationCases(ir);
	const modes = modeGroups(ir);
	return {
		kind: 'three-forma-styli/workbench',
		schemaVersion: 2,
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
					alphaScales: alpha.length,
					colorModes: modes.find((mode) => mode.category === 'color')?.modes.length ?? 0,
					colorCases: colors.length,
					sizeModes: modes.find((mode) => mode.category === 'size')?.modes.length ?? 0,
					typographyCases: typography.length,
					shadowCases: shadows.length,
					motionCases: motion.length,
					foundationCases: foundations.length,
				},
			},
			...(alpha.length > 0
				? [{ kind: 'alpha' as const, id: 'alpha' as const, label: 'alpha', cases: alpha }]
				: []),
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
		diagnostics: reviewDiagnostics(ir),
		agent: {
			verification: {
				generate: options.verification?.generate ?? 'tfs build .',
				check: options.verification?.check ?? 'tfs check .',
			},
		},
		motion: ir.motion,
	};
}
