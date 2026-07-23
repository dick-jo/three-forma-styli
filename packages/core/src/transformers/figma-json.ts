/**
 * JSON transformers for standards-based design-token interchange and Figma's
 * Variables REST API. Figma variables are currently limited to colors. DTCG
 * carries every TFS value that has a lossless 2025.10 representation, with
 * namespaced extensions for TFS mode and CSS-specific metadata.
 */

import type { IR, TokenValue } from '../generator/types.js';
import type { FileHeaderInfo } from '../header.js';
import { getHeaderLines } from '../header.js';

const DTCG_SCHEMA = 'https://www.designtokens.org/schemas/2025.10/format.json';
const EXTENSION_KEY = 'com.three-forma-styli';

export interface FigmaJsonTransformerConfig {
	/** Collection name in Figma (default: "Color"). */
	collectionName?: string;

	/** Must match the target Figma file profile (default: "srgb"). */
	colorSpace?: 'srgb' | 'display-p3';

	/** Generated-file metadata. Set to false to omit it. */
	fileHeader?: FigmaJsonHeaderConfig | false;
}

export interface FigmaJsonHeaderConfig {
	toolName: string;
	toolVersion: string;
	includeTimestamp?: boolean;
	customLines?: string[];
}

interface ResolvedFigmaJsonConfig {
	collectionName: string;
	colorSpace: 'srgb' | 'display-p3';
}

export interface FigmaColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

interface DtcgColor {
	colorSpace: 'srgb' | 'display-p3';
	components: [number, number, number];
	alpha?: number;
	hex?: string;
}

export interface FigmaVariable {
	name: string;
	type: 'COLOR';
	values: Record<string, { hex: string; rgba: FigmaColor }>;
}

export interface FigmaCollection {
	name: string;
	defaultMode: string;
	modes: string[];
	variables: FigmaVariable[];
}

export type FigmaJsonFormat = 'dtcg' | 'figma-variables';

function mergeConfig(userConfig?: Partial<FigmaJsonTransformerConfig>): ResolvedFigmaJsonConfig {
	const collectionName = userConfig?.collectionName?.trim() || 'Color';
	const colorSpace = userConfig?.colorSpace ?? 'srgb';
	if (colorSpace !== 'srgb' && colorSpace !== 'display-p3') {
		throw new Error(`Unsupported JSON color space "${colorSpace}"`);
	}
	return { collectionName, colorSpace };
}

function parseHexColor(hex: string): { rgba: FigmaColor; hex: string } {
	if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
		throw new Error(`Figma JSON requires 6- or 8-digit hex colors; received "${hex}"`);
	}

	const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
	const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
	const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
	const a = hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1;
	const round = (value: number) => Number(value.toFixed(6));

	return {
		rgba: { r: round(r), g: round(g), b: round(b), a: round(a) },
		hex: hex.slice(0, 7).toLowerCase(),
	};
}

function toDtcgColor(hex: string, colorSpace: 'srgb' | 'display-p3'): DtcgColor {
	const { rgba, hex: fallbackHex } = parseHexColor(hex);
	return {
		colorSpace,
		components: [rgba.r, rgba.g, rgba.b],
		...(rgba.a < 1 ? { alpha: rgba.a } : {}),
		// DTCG's optional hex member is specifically an sRGB fallback. P3 component
		// bytes are not a valid CSS hex fallback, so omit it for Display P3.
		...(colorSpace === 'srgb' ? { hex: fallbackHex } : {}),
	};
}

function getColorTokens(tokens: Record<string, TokenValue>): Record<string, TokenValue> {
	return Object.fromEntries(Object.entries(tokens).filter(([, token]) => token.family === 'color'));
}

function getColorModes(ir: IR): { defaultMode: string; allModes: string[] } {
	const defaultMode = ir.modes.color.default;
	if (!defaultMode) {
		throw new Error(
			'Design JSON requires a color token family (Figma Variables are color-only; DTCG shadows reference color tokens)'
		);
	}

	return {
		defaultMode,
		allModes: [defaultMode, ...ir.modes.color.overrides],
	};
}

type DtcgDimension = { value: number; unit: 'px' | 'rem' };
type DtcgDuration = { value: number; unit: 'ms' | 's' };

function dtcgDimension(value: number, unit: string, context: string): DtcgDimension {
	if (unit !== 'px' && unit !== 'rem') {
		throw new Error(
			`${context} uses CSS unit "${unit}", but DTCG 2025.10 dimensions support only px and rem`
		);
	}
	return { value, unit };
}

function dtcgDuration(value: number, unit: string, context: string): DtcgDuration {
	if (unit !== 'ms' && unit !== 's') {
		throw new Error(
			`${context} uses time unit "${unit}", but DTCG 2025.10 durations support only ms and s`
		);
	}
	return { value, unit };
}

function tokenModeValues(
	ir: IR,
	token: TokenValue,
	map: (candidate: TokenValue) => unknown
): Record<string, unknown> | undefined {
	const values = Object.entries(ir.overrideTokens)
		.filter(([, tokens]) => tokens[token.name])
		.map(([modeName, tokens]) => [modeName, map(tokens[token.name]!)]);
	if (values.length === 0) return undefined;
	return Object.fromEntries([[ir.modes.size.default || 'default', map(token)], ...values]);
}

function tokenExtension(
	ir: IR,
	token: TokenValue,
	map: (candidate: TokenValue) => unknown,
	extra?: Record<string, unknown>
): Record<string, unknown> | undefined {
	const modes = tokenModeValues(ir, token, map);
	if (!modes && !extra) return undefined;
	return { [EXTENSION_KEY]: { ...(modes ? { modes } : {}), ...extra } };
}

function rawToken(ir: IR, name: string, mode?: string): TokenValue {
	const token = (mode ? ir.overrideTokens[mode]?.[name] : undefined) ?? ir.tokens[name];
	if (!token) throw new Error(`DTCG export could not resolve generated token "--${name}"`);
	return token;
}

function referencedToken(ir: IR, token: TokenValue, mode?: string): TokenValue {
	if (!token.reference) return token;
	return rawToken(ir, token.reference, mode);
}

function typographyComposite(
	ir: IR,
	roleName: string,
	variantName: string,
	mode?: string
): {
	value: Record<string, unknown>;
	extension: Record<string, unknown>;
} {
	const typography = ir.typography!;
	const role = typography.roles[roleName]!;
	const recipe = variantName === 'base' ? role.base : role.variants[variantName]!;
	const fontSizeAlias = rawToken(ir, recipe.fontSizeToken, mode);
	const fontSize = referencedToken(ir, fontSizeAlias, mode);
	if (fontSize.rawValue === undefined || !fontSize.unit) {
		throw new Error(
			`DTCG typography export could not resolve a numeric font size for ${roleName}/${variantName}`
		);
	}
	const weightAlias = rawToken(ir, recipe.fontWeightToken, mode);
	const weight = referencedToken(ir, weightAlias, mode);
	if (weight.rawValue === undefined) {
		throw new Error(
			`DTCG typography export could not resolve a numeric font weight for ${roleName}/${variantName}`
		);
	}
	const lineHeight = rawToken(ir, recipe.lineHeightToken, mode);
	const letterSpacing = rawToken(ir, recipe.letterSpacingToken, mode);
	const letterSpacingEm = letterSpacing.rawValue ?? recipe.letterSpacingEm;
	const fontStyle = referencedToken(ir, rawToken(ir, role.fontStyleToken, mode), mode).value;
	const font = typography.fonts[role.font]!;
	const optionalTokenValue = (name?: string): string | undefined =>
		name ? rawToken(ir, name, mode).value : undefined;

	return {
		value: {
			fontFamily: [font.family, ...font.fallbacks],
			fontSize: dtcgDimension(fontSize.rawValue, fontSize.unit, `${roleName}/${variantName}`),
			fontWeight: weight.rawValue,
			letterSpacing: dtcgDimension(
				fontSize.rawValue * letterSpacingEm,
				fontSize.unit,
				`${roleName}/${variantName} letter spacing`
			),
			lineHeight: lineHeight.rawValue ?? recipe.lineHeight,
		},
		extension: {
			role: roleName,
			variant: variantName,
			fontStyle,
			letterSpacingEm,
			...(optionalTokenValue(recipe.textTransformToken)
				? { textTransform: optionalTokenValue(recipe.textTransformToken) }
				: {}),
			...(optionalTokenValue(recipe.fontKerningToken)
				? { fontKerning: optionalTokenValue(recipe.fontKerningToken) }
				: {}),
			...(optionalTokenValue(recipe.fontOpticalSizingToken)
				? { fontOpticalSizing: optionalTokenValue(recipe.fontOpticalSizingToken) }
				: {}),
			...(optionalTokenValue(recipe.fontFeatureSettingsToken)
				? { fontFeatureSettings: optionalTokenValue(recipe.fontFeatureSettingsToken) }
				: {}),
			...(optionalTokenValue(recipe.fontVariationSettingsToken)
				? { fontVariationSettings: optionalTokenValue(recipe.fontVariationSettingsToken) }
				: {}),
		},
	};
}

function getModeValue(ir: IR, token: TokenValue, modeName: string, defaultMode: string): string {
	if (modeName === defaultMode) {
		return token.value;
	}
	return ir.overrideTokens[modeName]?.[token.name]?.value ?? token.value;
}

function buildMetadata(
	config: FigmaJsonHeaderConfig | false | undefined
): Record<string, string> | undefined {
	if (!config) {
		return undefined;
	}

	const info: FileHeaderInfo = {
		toolName: config.toolName,
		toolVersion: config.toolVersion,
		timestamp: config.includeTimestamp ? new Date() : undefined,
		customLines: config.customLines,
	};
	return { generator: getHeaderLines(info).join(' | ') };
}

function generateDtcg(
	ir: IR,
	config: ResolvedFigmaJsonConfig,
	metadata?: Record<string, string>
): Record<string, unknown> {
	const directlyRepresentedDimensionFamilies = new Set([
		'spacing',
		'gap',
		'borderRadius',
		'borderWidth',
	]);
	for (const token of Object.values(ir.tokens)) {
		if (
			directlyRepresentedDimensionFamilies.has(token.family) &&
			token.rawValue !== undefined &&
			token.unit &&
			token.unit !== 'px' &&
			token.unit !== 'rem'
		) {
			throw new Error(
				`Token --${token.name} uses CSS unit "${token.unit}", but DTCG 2025.10 dimensions support only px and rem`
			);
		}
	}
	const colorTokens = getColorTokens(ir.tokens);
	const hasColors = Object.keys(colorTokens).length > 0;
	const colorModes = hasColors ? getColorModes(ir) : undefined;
	const colorGroup: Record<string, unknown> | undefined = hasColors
		? { $type: 'color' }
		: undefined;
	const dimensionTokens = Object.values(ir.tokens).filter(
		(token) =>
			token.rawValue !== undefined &&
			(token.unit === 'px' || token.unit === 'rem') &&
			['spacing', 'gap', 'typography', 'borderRadius', 'borderWidth'].includes(token.family)
	);
	const durationTokens = Object.values(ir.tokens).filter(
		(token) =>
			token.family === 'time' &&
			token.rawValue !== undefined &&
			(token.unit === 'ms' || token.unit === 's')
	);
	const dimensionGroup: Record<string, unknown> | undefined =
		dimensionTokens.length > 0 ? { $type: 'dimension' } : undefined;
	const durationGroup: Record<string, unknown> | undefined =
		durationTokens.length > 0 ? { $type: 'duration' } : undefined;
	const shadowGroup: Record<string, unknown> | undefined = ir.shadows
		? { $type: 'shadow' }
		: undefined;
	const easingGroup: Record<string, unknown> | undefined = ir.motion
		? { $type: 'cubicBezier' }
		: undefined;
	const transitionGroup: Record<string, unknown> | undefined = ir.motion
		? { $type: 'transition' }
		: undefined;
	const typographyGroup: Record<string, unknown> | undefined = ir.typography
		? { $type: 'typography' }
		: undefined;

	for (const [name, token] of Object.entries(colorTokens)) {
		const entry: Record<string, unknown> = {
			$value: toDtcgColor(token.value, config.colorSpace),
		};

		if (token.metadata?.isAlphaVariant && token.metadata.alphaLevel) {
			entry.$description = `${token.metadata.baseColor} (alpha: ${token.metadata.alphaLevel})`;
		}

		if (colorModes && colorModes.allModes.length > 1) {
			entry.$extensions = {
				[EXTENSION_KEY]: {
					collection: config.collectionName,
					modes: Object.fromEntries(
						colorModes.allModes.map((modeName) => [
							modeName,
							toDtcgColor(
								getModeValue(ir, token, modeName, colorModes.defaultMode),
								config.colorSpace
							),
						])
					),
				},
			};
		}

		colorGroup![name] = entry;
	}
	for (const token of dimensionTokens) {
		const map = (candidate: TokenValue) =>
			dtcgDimension(candidate.rawValue!, candidate.unit!, `Token --${candidate.name}`);
		const extension = tokenExtension(ir, token, map);
		dimensionGroup![token.name] = {
			$value: map(token),
			...(extension ? { $extensions: extension } : {}),
		};
	}
	for (const token of durationTokens) {
		const map = (candidate: TokenValue) =>
			dtcgDuration(candidate.rawValue!, candidate.unit!, `Token --${candidate.name}`);
		durationGroup![token.name] = { $value: map(token) };
	}
	if (shadowGroup && ir.shadows) {
		const dimension = (value: number) => dtcgDimension(value, ir.shadows!.unit, 'Shadow system');
		for (const [kind, recipes] of [
			['box', ir.shadows.box] as const,
			['text', ir.shadows.text] as const,
		]) {
			for (const [recipeName, recipe] of Object.entries(recipes)) {
				for (const [variantName, value] of [
					['base', recipe.base] as const,
					...Object.entries(recipe.variants),
				]) {
					const name =
						variantName === 'base'
							? `${kind}-${recipeName}`
							: `${kind}-${recipeName}-${variantName}`;
					const layers = value.layers.map((layer) => ({
						color: `{color.${layer.color.token}}`,
						offsetX: dimension(layer.x),
						offsetY: dimension(layer.y),
						blur: dimension(layer.blur),
						spread: dimension(layer.spread ?? 0),
					}));
					shadowGroup[name] = {
						$value: layers.length === 1 ? layers[0] : layers,
						$extensions: {
							[EXTENSION_KEY]: {
								kind,
								...(value.layers.some((layer) => layer.inset)
									? { insetLayers: value.layers.map((layer) => Boolean(layer.inset)) }
									: {}),
							},
						},
					};
				}
			}
		}
	}
	if (ir.motion && easingGroup && transitionGroup) {
		for (const [name, easing] of Object.entries(ir.motion.easings)) {
			easingGroup[name] = { $value: [...easing.value] };
		}
		for (const [recipeName, recipe] of Object.entries(ir.motion.recipes)) {
			for (const [variantName, value] of [
				['base', recipe.base] as const,
				...Object.entries(recipe.variants),
			]) {
				const name = variantName === 'base' ? recipeName : `${recipeName}-${variantName}`;
				const reduced =
					variantName === 'base'
						? recipe.reducedMotion.base
						: recipe.reducedMotion.variants[variantName];
				transitionGroup[name] = {
					$value: {
						duration: { value: value.duration.milliseconds, unit: 'ms' },
						delay: { value: value.delay.milliseconds, unit: 'ms' },
						timingFunction: [...value.easing.value],
					},
					$extensions: {
						[EXTENSION_KEY]: {
							recipe: recipeName,
							variant: variantName,
							reducedMotion: {
								behavior: reduced.behavior,
								value: {
									duration: { value: reduced.duration.milliseconds, unit: 'ms' },
									delay: { value: reduced.delay.milliseconds, unit: 'ms' },
									timingFunction: [...reduced.easing.value],
								},
							},
						},
					},
				};
			}
		}
	}
	if (ir.typography && typographyGroup) {
		for (const [roleName, role] of Object.entries(ir.typography.roles)) {
			for (const variantName of role.displayOrder) {
				const composite = typographyComposite(ir, roleName, variantName);
				const name = variantName === 'base' ? roleName : `${roleName}-${variantName}`;
				const modes = Object.fromEntries(
					ir.modes.size.overrides.map((modeName) => [
						modeName,
						typographyComposite(ir, roleName, variantName, modeName).value,
					])
				);
				typographyGroup[name] = {
					$value: composite.value,
					$extensions: {
						[EXTENSION_KEY]: {
							...composite.extension,
							...(Object.keys(modes).length > 0
								? {
										modes: {
											[ir.modes.size.default]: composite.value,
											...modes,
										},
									}
								: {}),
						},
					},
				};
			}
		}
	}

	const groups = {
		...(colorGroup ? { color: colorGroup } : {}),
		...(dimensionGroup ? { dimension: dimensionGroup } : {}),
		...(durationGroup ? { duration: durationGroup } : {}),
		...(easingGroup ? { easing: easingGroup } : {}),
		...(transitionGroup ? { transition: transitionGroup } : {}),
		...(typographyGroup ? { typography: typographyGroup } : {}),
		...(shadowGroup ? { shadow: shadowGroup } : {}),
	};
	if (Object.keys(groups).length === 0) {
		throw new Error('DTCG export requires at least one representable design-token family');
	}

	return {
		$schema: DTCG_SCHEMA,
		...(metadata ? { $extensions: { [EXTENSION_KEY]: metadata } } : {}),
		...groups,
	};
}

function generateFigmaVariables(
	ir: IR,
	config: ResolvedFigmaJsonConfig,
	metadata?: Record<string, string>
): Record<string, unknown> {
	const tokens = getColorTokens(ir.tokens);
	const { defaultMode, allModes } = getColorModes(ir);
	const variables: FigmaVariable[] = [];

	for (const [name, token] of Object.entries(tokens)) {
		const values = Object.fromEntries(
			allModes.map((modeName) => {
				const value = getModeValue(ir, token, modeName, defaultMode);
				const parsed = parseHexColor(value);
				return [modeName, { hex: value.toLowerCase(), rgba: parsed.rgba }];
			})
		);
		variables.push({ name, type: 'COLOR', values });
	}

	const collection: FigmaCollection = {
		name: config.collectionName,
		defaultMode,
		modes: allModes,
		variables,
	};

	return {
		_meta: {
			...(metadata ?? {}),
			colorSpace: config.colorSpace,
		},
		collections: [collection],
	};
}

/** Transform a generated IR into DTCG JSON or a Figma Variables API model. */
export function toFigmaJson(
	ir: IR,
	userConfig?: Partial<FigmaJsonTransformerConfig>,
	format: FigmaJsonFormat = 'dtcg'
): string {
	const config = mergeConfig(userConfig);
	const metadata = buildMetadata(userConfig?.fileHeader);
	const output =
		format === 'figma-variables'
			? generateFigmaVariables(ir, config, metadata)
			: generateDtcg(ir, config, metadata);

	return JSON.stringify(output, null, 2);
}
