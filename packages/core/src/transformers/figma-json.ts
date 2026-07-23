/**
 * JSON transformers for standards-based design-token interchange and Figma's
 * Variables REST API. Figma variables are currently limited to colors; DTCG
 * additionally carries standards-compliant box/text shadow composites.
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
	const tokens = getColorTokens(ir.tokens);
	const { defaultMode, allModes } = getColorModes(ir);
	const colorGroup: Record<string, unknown> = { $type: 'color' };
	const shadowGroup: Record<string, unknown> | undefined = ir.shadows
		? { $type: 'shadow' }
		: undefined;

	for (const [name, token] of Object.entries(tokens)) {
		const entry: Record<string, unknown> = {
			$value: toDtcgColor(token.value, config.colorSpace),
		};

		if (token.metadata?.isAlphaVariant && token.metadata.alphaLevel) {
			entry.$description = `${token.metadata.baseColor} (alpha: ${token.metadata.alphaLevel})`;
		}

		if (allModes.length > 1) {
			entry.$extensions = {
				[EXTENSION_KEY]: {
					collection: config.collectionName,
					modes: Object.fromEntries(
						allModes.map((modeName) => [
							modeName,
							toDtcgColor(getModeValue(ir, token, modeName, defaultMode), config.colorSpace),
						])
					),
				},
			};
		}

		colorGroup[name] = entry;
	}
	if (shadowGroup && ir.shadows) {
		const dimension = (value: number) => ({ value, unit: ir.shadows!.unit });
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
						...(layer.inset ? { inset: true } : {}),
					}));
					shadowGroup[name] = {
						$value: layers.length === 1 ? layers[0] : layers,
						$extensions: { [EXTENSION_KEY]: { kind } },
					};
				}
			}
		}
	}

	return {
		$schema: DTCG_SCHEMA,
		...(metadata ? { $extensions: { [EXTENSION_KEY]: metadata } } : {}),
		color: colorGroup,
		...(shadowGroup ? { shadow: shadowGroup } : {}),
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
