import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as fontkit from 'fontkit';
import type { Font } from 'fontkit';
import type { FontInput, RoleInput, SystemInput } from '../resolve/input.js';
import { Issues, TfsError } from '../resolve/issues.js';
import { compressToWoff2, decompressWoff2 } from './convert.js';
import { measureFallback, type FallbackFace } from './fallback.js';
import { inspectFontFile, type FontFace } from './inspect.js';

type FileFont = Extract<FontInput, { files: readonly string[] }>;

/** One file to place in the output: converted when the source is TTF/OTF. */
export type FontAsset = {
	readonly source: string;
	readonly output: string;
	readonly convert: boolean;
};

export type PreparedFonts = {
	/** @font-face rules for real and fallback faces. */
	readonly css: string;
	/** CSS font-family value for each declared font. */
	readonly stacks: Readonly<Record<string, string>>;
	/** What each file font offers, for display before roles exist. */
	readonly faces: Readonly<Record<string, readonly FontFace[]>>;
	readonly assets: readonly FontAsset[];
};

const GENERIC = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
	'ui-serif',
	'ui-sans-serif',
	'ui-monospace',
	'ui-rounded',
	'math',
	'emoji',
]);
const CATEGORY_STACK = {
	sans: ['system-ui', 'sans-serif'],
	serif: ['ui-serif', 'serif'],
	mono: ['ui-monospace', 'monospace'],
} as const;

function family(name: string): string {
	return GENERIC.has(name) ? name : JSON.stringify(name);
}

function weightRange(weight: FontFace['weight']): string {
	return weight.min === weight.max ? String(weight.min) : `${weight.min} ${weight.max}`;
}

function outputName(id: string, face: FontFace): string {
	const weight =
		face.weight.min === face.weight.max
			? `${face.weight.min}`
			: `${face.weight.min}-${face.weight.max}`;
	return `${id}-${face.style}-${weight}.${face.format === 'woff' ? 'woff' : 'woff2'}`;
}

/** Every style × weight a role offers. */
function offered(role: RoleInput): { style: 'normal' | 'italic'; weight: number }[] {
	const weights = typeof role.weights === 'number' ? [role.weights] : Object.values(role.weights);
	return (role.styles ?? ['normal']).flatMap((style) =>
		weights.map((weight) => ({ style: style as 'normal' | 'italic', weight }))
	);
}

function describe(faces: readonly FontFace[], style: string): string {
	const matching = faces.filter((face) => face.style === style);
	return matching.length === 0
		? `no ${style} face`
		: `${style} ${matching.map((face) => weightRange(face.weight).replace(' ', '–')).join(', ')}`;
}

/** Fontkit cannot instance variable WOFF2; measure a decompressed copy instead. */
async function measurable(face: FontFace, scratch: () => Promise<string>): Promise<Font> {
	if (face.format !== 'woff2' || face.axes.length === 0) return face.font;
	const output = join(await scratch(), 'face.ttf');
	await decompressWoff2(face.file, output);
	return fontkit.openSync(output) as Font;
}

/**
 * Reads every file font, checks each role against what the files really offer,
 * and plans the @font-face CSS, fallback faces and output files.
 * `projectDir` is where font paths in the config are resolved from.
 */
export async function prepareFonts(
	typography: NonNullable<SystemInput['typography']>,
	projectDir: string
): Promise<PreparedFonts> {
	const issues = new Issues();
	const faces: Record<string, FontFace[]> = {};
	const stacks: Record<string, string> = {};

	for (const [id, font] of Object.entries(typography.fonts)) {
		if (font.files === undefined) {
			stacks[id] = [font.name, ...font.fallbacks].map(family).join(', ');
			continue;
		}
		const path = `typography.fonts.${id}.files`;
		faces[id] = font.files.flatMap((file) => {
			try {
				return [inspectFontFile(resolve(projectDir, file))];
			} catch (error) {
				issues.add(path, error instanceof Error ? error.message : String(error));
				return [];
			}
		});
		for (const face of faces[id]) {
			issues.check(
				face.style !== 'oblique',
				path,
				`"${face.file}" is oblique; only normal and italic faces are supported`
			);
		}
		const families = new Set(faces[id].map((face) => face.family));
		issues.check(
			font.name !== undefined || families.size <= 1,
			path,
			`files belong to different families (${[...families].join(', ')}); set name to use them as one font`
		);
		faces[id].forEach((face, index) =>
			faces[id]!.slice(index + 1).forEach((other) => {
				const overlap =
					face.style === other.style &&
					face.weight.min <= other.weight.max &&
					other.weight.min <= face.weight.max;
				issues.check(
					!overlap,
					path,
					`"${face.file}" and "${other.file}" both provide ${face.style} weight ${Math.max(face.weight.min, other.weight.min)}`
				);
			})
		);
	}

	for (const [roleName, role] of Object.entries(typography.roles)) {
		const available = faces[role.font];
		if (!available) continue;
		for (const { style, weight } of offered(role)) {
			const covered = available.some(
				(face) => face.style === style && weight >= face.weight.min && weight <= face.weight.max
			);
			issues.check(
				covered,
				`typography.roles.${roleName}`,
				`${style} ${weight} is not in the font files (${describe(available, style)})`
			);
		}
	}
	if (issues.list.length > 0) throw new TfsError(issues.list);

	// Fallback faces: one per style × weight the roles use, for sans and mono file fonts.
	const scratchDirectories: string[] = [];
	const scratch = async () => {
		const directory = await mkdtemp(join(tmpdir(), 'tfs-font-'));
		scratchDirectories.push(directory);
		return directory;
	};
	const rules: string[] = [];
	const assets: FontAsset[] = [];
	try {
		for (const [id, font] of Object.entries(typography.fonts) as [string, FileFont][]) {
			if (font.files === undefined) continue;
			const name = font.name ?? faces[id]![0]!.family;
			const fallbackName = `${name} fallback`;
			for (const face of faces[id]!) {
				const output = outputName(id, face);
				assets.push({
					source: face.file,
					output,
					convert: face.format === 'truetype' || face.format === 'opentype',
				});
				rules.push(
					`@font-face {\n\tfont-family: ${family(name)};\n\tsrc: url("./fonts/${output}") format("${output.endsWith('.woff') ? 'woff' : 'woff2'}");\n\tfont-weight: ${weightRange(face.weight)};\n\tfont-style: ${face.style};\n\tfont-display: ${font.display ?? 'swap'};\n}`
				);
			}

			const category = font.category;
			const generic = CATEGORY_STACK[category as keyof typeof CATEGORY_STACK] ?? [];
			const fallbacks = new Map<string, FallbackFace>();
			if (category === 'sans' || category === 'mono') {
				const used = Object.values(typography.roles)
					.filter((role) => role.font === id)
					.flatMap(offered);
				for (const { style, weight } of used) {
					const key = `${style}-${weight}`;
					if (fallbacks.has(key)) continue;
					const face = faces[id]!.find(
						(f) => f.style === style && weight >= f.weight.min && weight <= f.weight.max
					)!;
					fallbacks.set(
						key,
						measureFallback(await measurable(face, scratch), category, style, weight)
					);
				}
			}
			for (const [, fallback] of [...fallbacks].sort(([a], [b]) => a.localeCompare(b))) {
				rules.push(
					`@font-face {\n\tfont-family: ${family(fallbackName)};\n\tsrc: local(${JSON.stringify(fallback.local)});\n\tfont-style: ${fallback.style};\n\tfont-weight: ${fallback.weight};\n\tsize-adjust: ${fallback.sizeAdjust};\n\tascent-override: ${fallback.ascentOverride};\n\tdescent-override: ${fallback.descentOverride};\n\tline-gap-override: ${fallback.lineGapOverride};\n}`
				);
			}
			stacks[id] = [name, ...(fallbacks.size > 0 ? [fallbackName] : []), ...generic]
				.map(family)
				.join(', ');
		}
	} finally {
		await Promise.all(
			scratchDirectories.map((directory) => rm(directory, { recursive: true, force: true }))
		);
	}
	return { css: rules.map((rule) => `${rule}\n`).join(''), stacks, faces, assets };
}

/** Copies or converts every planned font file into `<outDir>/fonts/`. */
export async function writeFontAssets(assets: readonly FontAsset[], outDir: string): Promise<void> {
	const directory = join(outDir, 'fonts');
	await mkdir(directory, { recursive: true });
	for (const asset of assets) {
		const destination = join(directory, asset.output);
		await (asset.convert
			? compressToWoff2(asset.source, destination)
			: copyFile(asset.source, destination));
	}
}
