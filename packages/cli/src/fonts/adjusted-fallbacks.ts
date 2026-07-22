import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type {
	TypographyFontStyle,
	TypographyRole,
	TypographySystem,
} from '@three-forma-styli/core';
import fs from 'fs-extra';
import * as fontkit from 'fontkit';
import type { Font } from 'fontkit';
import type { ProjectFont } from '../project.js';
import {
	calculateAdjustedFallback,
	type AdjustedFallbackMeasurement,
	type BuiltInFallbackProfileId,
} from './fallback-metrics.js';
import type { PreparedFontFace, PreparedFontsManifest } from './prepare.js';

const execFileAsync = promisify(execFile);

export interface AdjustedFallbackManifest {
	schemaVersion: 2;
	calibration: {
		id: 'tfs-project-adjusted-fallbacks-v1';
		profileSelection: 'fontpie style match; regular through 500; bold above 500';
		supportedStyles: readonly ['normal', 'italic'];
	};
	roles: Record<
		string,
		{
			font: string;
			primaryFamily: string;
			fallbackFamily: string;
			category: 'sans' | 'mono';
			instances: AdjustedFallbackMeasurement[];
		}
	>;
}

export interface AdjustedFallbackBuildResult {
	typography: TypographySystem;
	css: string;
	manifest: AdjustedFallbackManifest;
	measurementCount: number;
	privateFamilies: string[];
}

export interface BuildAdjustedFallbacksOptions {
	preparedDirectory: string;
	/** Test seam for font parsing only; project builds use fontkit.openSync. */
	openFont?: (file: string) => Font;
}

function stylesForRole(
	role: TypographyRole
): Partial<Record<TypographyFontStyle, { weights: string[] }>> {
	return role.styles ?? { normal: { weights: Object.keys(role.weights) } };
}

function supportsWeight(face: PreparedFontFace, weight: number): boolean {
	return typeof face.weight === 'number'
		? face.weight === weight
		: weight >= face.weight.min && weight <= face.weight.max;
}

function selectFace(
	manifest: PreparedFontsManifest,
	fontId: string,
	role: string,
	style: TypographyFontStyle,
	weight: number
): PreparedFontFace {
	const family = manifest.families[fontId];
	if (!family)
		throw new Error(`Adjusted fallback role "${role}" references unprepared font "${fontId}".`);
	const matches = family.faces.filter(
		(face) => face.style === style && supportsWeight(face, weight)
	);
	if (matches.length !== 1) {
		throw new Error(
			`Adjusted fallback role "${role}" requires exactly one ${style} weight ${weight} face in font "${fontId}"; found ${matches.length}.`
		);
	}
	return matches[0];
}

function profileFor(
	category: 'sans' | 'mono',
	style: TypographyFontStyle,
	weight: number
): BuiltInFallbackProfileId {
	if (style === 'oblique') {
		throw new Error(
			'Automatic adjusted fallbacks support physical normal and italic faces; oblique roles require an explicit fallback stack.'
		);
	}
	const weightClass = weight > 500 ? 'bold' : 'regular';
	const styleSuffix = style === 'italic' ? '-italic' : '';
	return category === 'sans'
		? `fontpie-arial-${weightClass}${styleSuffix}-v1`
		: `fontpie-courier-new-${weightClass}${styleSuffix}-v1`;
}

function privateFamily(fontId: string): string {
	return `__tfs-${fontId}-adjusted-fallback`;
}

function assertRoleHasStableVariationInstance(roleName: string, role: TypographyRole): void {
	const recipes = [role.base, ...Object.values(role.variants ?? {})];
	if (
		Object.keys(role.variations ?? {}).length > 0 ||
		recipes.some((recipe) => Object.keys(recipe.variations ?? {}).length > 0)
	) {
		throw new Error(
			`Adjusted fallback role "${roleName}" uses custom variation coordinates; recipe-specific axis calibration is not supported yet.`
		);
	}
}

async function openExactFont(
	file: string,
	face: PreparedFontFace,
	options: BuildAdjustedFallbacksOptions,
	temporaryDirectories: string[]
): Promise<Font> {
	const openFont =
		options.openFont ??
		((fontFile: string): Font => {
			const value = fontkit.openSync(fontFile);
			if (value.type === 'TTC' || value.type === 'DFont') {
				throw new Error(
					`Adjusted fallback calibration does not support font collections: ${fontFile}`
				);
			}
			return value as Font;
		});
	const opened = openFont(file);
	if (!face.axes.wght || opened.type !== 'WOFF2' || options.openFont) return opened;

	// Fontkit 2 cannot instantiate WOFF2 variable fonts correctly. Decompress to
	// an sfnt wrapper, then perform all variation sampling with fontkit.
	const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-font-instance-'));
	temporaryDirectories.push(temporaryDirectory);
	const decompressed = path.join(temporaryDirectory, 'font.ttf');
	try {
		await execFileAsync('fonttools', ['ttLib.woff2', 'decompress', file, '-o', decompressed]);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Cannot instantiate prepared variable WOFF2 face "${face.file}". Install FontTools with Brotli support. ${detail}`
		);
	}
	return openFont(decompressed);
}

function renderAdjustedFace(family: string, measurement: AdjustedFallbackMeasurement): string {
	const css = measurement.calibration.css;
	return `@font-face {
  font-family: ${JSON.stringify(family)};
  src: local(${JSON.stringify(measurement.fallback.family)});
  font-style: ${measurement.role.style};
  font-weight: ${measurement.role.weight};
  ascent-override: ${css.ascentOverride};
  descent-override: ${css.descentOverride};
  line-gap-override: ${css.lineGapOverride};
  size-adjust: ${css.sizeAdjust};
}`;
}

/** Build private metric-adjusted faces from already validated project typography. */
export async function buildAdjustedFallbacks(
	typography: TypographySystem,
	prepared: PreparedFontsManifest,
	projectFonts: Record<string, ProjectFont>,
	options: BuildAdjustedFallbacksOptions
): Promise<AdjustedFallbackBuildResult | undefined> {
	if (!typography.fonts || !typography.roles) return undefined;
	const eligible = new Set(
		Object.entries(projectFonts)
			.filter(
				([, font]) =>
					!font.fallbacks?.length && (font.category === 'sans' || font.category === 'mono')
			)
			.map(([id]) => id)
	);
	if (eligible.size === 0) return undefined;

	const temporaryDirectories: string[] = [];
	const parsedFaces = new Map<string, Font>();
	const cssFaces = new Map<string, { family: string; measurement: AdjustedFallbackMeasurement }>();
	const manifestRoles: AdjustedFallbackManifest['roles'] = {};
	const usedFonts = new Set<string>();
	try {
		for (const roleName of Object.keys(typography.roles).sort()) {
			const role = typography.roles[roleName];
			if (!eligible.has(role.font)) continue;
			assertRoleHasStableVariationInstance(roleName, role);
			const configured = projectFonts[role.font];
			const category = configured.category as 'sans' | 'mono';
			const family = prepared.families[role.font];
			const adjustedFamily = privateFamily(role.font);
			const instances: AdjustedFallbackMeasurement[] = [];

			for (const style of Object.keys(stylesForRole(role)).sort() as TypographyFontStyle[]) {
				const selection = stylesForRole(role)[style]!;
				for (const alias of [...selection.weights].sort()) {
					const weight = role.weights[alias];
					const face = selectFace(prepared, role.font, roleName, style, weight);
					if (face.axes.opsz) {
						throw new Error(
							`Adjusted fallback role "${roleName}" uses face "${face.file}" with an opsz axis; size-dependent optical metrics are not supported yet.`
						);
					}
					const facePath = path.join(options.preparedDirectory, face.file);
					let font = parsedFaces.get(facePath);
					if (!font) {
						font = await openExactFont(facePath, face, options, temporaryDirectories);
						parsedFaces.set(facePath, font);
					}
					const measurement = calculateAdjustedFallback({
						role: roleName,
						style,
						weight,
						profile: profileFor(category, style, weight),
						primary: {
							font,
							source: { file: face.file, sha256: face.sha256 },
						},
					});
					instances.push(measurement);
					const cssKey = `${role.font}:${style}:${weight}`;
					const previous = cssFaces.get(cssKey);
					if (
						previous &&
						JSON.stringify(previous.measurement.calibration.css) !==
							JSON.stringify(measurement.calibration.css)
					) {
						throw new Error(
							`Adjusted fallback roles disagree for font "${role.font}" ${style} weight ${weight}.`
						);
					}
					cssFaces.set(cssKey, { family: adjustedFamily, measurement });
				}
			}
			usedFonts.add(role.font);
			manifestRoles[roleName] = {
				font: role.font,
				primaryFamily: family.family,
				fallbackFamily: adjustedFamily,
				category,
				instances,
			};
		}

		if (Object.keys(manifestRoles).length === 0) return undefined;
		const fonts = Object.fromEntries(
			Object.entries(typography.fonts).map(([id, font]) => [
				id,
				usedFonts.has(id)
					? { ...font, fallbacks: [privateFamily(id), ...(font.fallbacks ?? [])] }
					: font,
			])
		) as TypographySystem['fonts'];
		const css = [
			'/* Measured metric-adjusted fallback faces generated by three-forma-styli. */',
			...[...cssFaces.entries()]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([, value]) => renderAdjustedFace(value.family, value.measurement)),
		].join('\n\n');
		return {
			typography: { ...typography, fonts },
			css: `${css}\n`,
			manifest: {
				schemaVersion: 2,
				calibration: {
					id: 'tfs-project-adjusted-fallbacks-v1',
					profileSelection: 'fontpie style match; regular through 500; bold above 500',
					supportedStyles: ['normal', 'italic'],
				},
				roles: manifestRoles,
			},
			measurementCount: Object.values(manifestRoles).reduce(
				(total, role) => total + role.instances.length,
				0
			),
			privateFamilies: [...usedFonts].sort().map(privateFamily),
		};
	} finally {
		await Promise.all(temporaryDirectories.map((directory) => fs.remove(directory)));
	}
}
