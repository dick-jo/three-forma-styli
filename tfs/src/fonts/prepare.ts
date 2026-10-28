import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as fontkit from 'fontkit';
import type { Font } from 'fontkit';
import type { FontInput, RoleInput, SystemInput } from '../resolve/input.js';
import { Issues, TfsError } from '../resolve/issues.js';
import { decompressWoff2, subsetToWoff2 } from './convert.js';
import { measureFallback, type Calibration, type FallbackFace } from './fallback.js';
import { inspectFontFile, type FontFace } from './inspect.js';
import { slicesOf, type Slice } from './slices.js';

type FileFont = Extract<FontInput, { files: readonly string[] }>;

/** One WOFF2 file to write: the characters of one slice of a source font file. */
export type FontAsset = {
	readonly source: string;
	readonly output: string;
	readonly unicodes: string;
};

/** Output file of each slice, by font and face (`normal-100-900`). */
export type FontFiles = Readonly<
	Record<string, Readonly<Record<string, Readonly<Partial<Record<Slice, string>>>>>>
>;

export type PreparedFonts = {
	/** @font-face rules for real and fallback faces. */
	readonly css: string;
	/** CSS font-family value for each role. */
	readonly stacks: Readonly<Record<string, string>>;
	/** What each file font offers, for display before roles are finished. */
	readonly faces: Readonly<Record<string, readonly FontFace[]>>;
	readonly files: FontFiles;
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
/** CSS px per font size unit, where fixed (rem and em at the browser default 16px). */
const PX: Readonly<Record<string, number>> = { px: 1, rem: 16, em: 16 };
/** Parallel FontTools processes when writing slices; each holds a whole font in memory. */
const SUBSET_JOBS = 4;

function family(name: string): string {
	return GENERIC.has(name) ? name : JSON.stringify(name);
}

function weightRange(weight: FontFace['weight']): string {
	return weight.min === weight.max ? String(weight.min) : `${weight.min} ${weight.max}`;
}

/** `normal-100-900`: names a face in output files and in fonts.js. */
function faceKey(face: FontFace): string {
	return `${face.style}-${weightRange(face.weight).replace(' ', '-')}`;
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

/** A role's base size in CSS px on the ordinary font size scale, if its unit has a fixed size. */
function basePx(role: RoleInput, fontSize: SystemInput['fontSize']): number | undefined {
	const ref = role.sizes.base?.fontSize;
	const px = fontSize && PX[fontSize.unit];
	if (!fontSize || ref === undefined || px === undefined) return undefined;
	return px * (ref === 'min' ? fontSize.min : fontSize.start + fontSize.step * (ref - 1));
}

/** The text a role renders: capitals when it is uppercased, and its base optical size. */
function calibrationOf(
	role: RoleInput,
	faces: readonly FontFace[],
	fontSize: SystemInput['fontSize']
): Calibration {
	const axis = faces.find((face) => face.font.variationAxes.opsz)?.font.variationAxes.opsz;
	const px = basePx(role, fontSize);
	return {
		case: role.textTransform === 'uppercase' ? 'uppercase' : 'lowercase',
		...(axis && px !== undefined
			? { opsz: Number(Math.min(axis.max, Math.max(axis.min, px)).toFixed(2)) }
			: {}),
	};
}

/**
 * Reads every file font, checks each role against what the files really offer,
 * and plans the @font-face CSS, fallback faces, output files and each role's
 * font-family. `projectDir` is where font paths in the config are resolved from.
 */
export async function prepareFonts(
	system: SystemInput,
	projectDir: string
): Promise<PreparedFonts> {
	const typography = system.typography!;
	const issues = new Issues();
	const faces: Record<string, FontFace[]> = {};
	const fontStacks: Record<string, string> = {};

	for (const [id, font] of Object.entries(typography.fonts)) {
		if (font.files === undefined) {
			fontStacks[id] = [font.name, ...font.fallbacks].map(family).join(', ');
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

	// Fallback faces for sans and mono file fonts: one family per distinct calibration
	// of the roles using the font, with a face per style × weight those roles offer.
	const scratchDirectories: string[] = [];
	const scratch = async () => {
		const directory = await mkdtemp(join(tmpdir(), 'tfs-font-'));
		scratchDirectories.push(directory);
		return directory;
	};
	const rules: string[] = [];
	const assets: FontAsset[] = [];
	const files: Record<string, Record<string, Partial<Record<Slice, string>>>> = {};
	const stacks: Record<string, string> = {};
	try {
		for (const [id, font] of Object.entries(typography.fonts) as [string, FileFont][]) {
			if (font.files === undefined) continue;
			const name = font.name ?? faces[id]![0]!.family;
			files[id] = {};
			for (const face of faces[id]!) {
				const key = faceKey(face);
				files[id][key] = {};
				// Declared last-first: where ranges overlap, the last rule is tried first.
				for (const { slice, unicodeRange } of slicesOf(face.font).reverse()) {
					const output = `${id}-${key}-${slice}.woff2`;
					files[id][key][slice] = output;
					assets.push({ source: face.file, output, unicodes: unicodeRange });
					rules.push(
						`@font-face {\n\tfont-family: ${family(name)};\n\tsrc: url("./fonts/${output}") format("woff2");\n\tfont-weight: ${weightRange(face.weight)};\n\tfont-style: ${face.style};\n\tfont-display: ${font.display ?? 'swap'};\n\tunicode-range: ${unicodeRange};\n}`
					);
				}
			}

			const category = font.category;
			const generic = CATEGORY_STACK[category as keyof typeof CATEGORY_STACK] ?? [];
			const roles = Object.entries(typography.roles).filter(([, role]) => role.font === id);
			if (category !== 'sans' && category !== 'mono') {
				for (const [roleName] of roles)
					stacks[roleName] = [name, ...generic].map(family).join(', ');
				continue;
			}

			const sources = new Map<FontFace, Promise<Font>>();
			const measured = new Map<string, FallbackFace>();
			const measure = async (
				calibration: Calibration,
				style: 'normal' | 'italic',
				weight: number
			) => {
				const key = JSON.stringify([calibration, style, weight]);
				if (!measured.has(key)) {
					const face = faces[id]!.find(
						(f) => f.style === style && weight >= f.weight.min && weight <= f.weight.max
					)!;
					if (!sources.has(face)) sources.set(face, measurable(face, scratch));
					measured.set(
						key,
						measureFallback(await sources.get(face)!, category, style, weight, calibration)
					);
				}
				return measured.get(key)!;
			};
			/** Drops what makes no difference to these faces, e.g. capitals in a monospaced font. */
			const simplest = async (calibration: Calibration, offers: ReturnType<typeof offered>) => {
				const same = async (other: Calibration) => {
					for (const { style, weight } of offers) {
						const [a, b] = [
							await measure(calibration, style, weight),
							await measure(other, style, weight),
						];
						if (JSON.stringify(a) !== JSON.stringify(b)) return false;
					}
					return true;
				};
				if (calibration.case === 'uppercase' && (await same({ ...calibration, case: 'lowercase' })))
					calibration = { ...calibration, case: 'lowercase' };
				if (calibration.opsz !== undefined && (await same({ case: calibration.case })))
					calibration = { case: calibration.case };
				return calibration;
			};

			const families = new Map<
				string,
				{
					name: string;
					calibration: Calibration;
					offers: Map<string, { style: 'normal' | 'italic'; weight: number }>;
				}
			>();
			for (const [roleName, role] of roles) {
				const offers = offered(role);
				const calibration = await simplest(
					calibrationOf(role, faces[id]!, system.fontSize),
					offers
				);
				const key = JSON.stringify(calibration);
				if (!families.has(key)) {
					const qualifiers = [
						...(calibration.case === 'uppercase' ? ['caps'] : []),
						...(calibration.opsz !== undefined ? [`opsz ${calibration.opsz}`] : []),
					];
					families.set(key, {
						name: [name, ...qualifiers, 'fallback'].join(' '),
						calibration,
						offers: new Map(),
					});
				}
				const fallback = families.get(key)!;
				for (const offer of offers) fallback.offers.set(`${offer.style}-${offer.weight}`, offer);
				stacks[roleName] = [name, fallback.name, ...generic].map(family).join(', ');
			}
			for (const fallback of families.values()) {
				for (const [, { style, weight }] of [...fallback.offers].sort(([a], [b]) =>
					a.localeCompare(b)
				)) {
					const face = await measure(fallback.calibration, style, weight);
					rules.push(
						`@font-face {\n\tfont-family: ${family(fallback.name)};\n\tsrc: local(${JSON.stringify(face.local)});\n\tfont-style: ${face.style};\n\tfont-weight: ${face.weight};\n\tsize-adjust: ${face.sizeAdjust};\n\tascent-override: ${face.ascentOverride};\n\tdescent-override: ${face.descentOverride};\n\tline-gap-override: ${face.lineGapOverride};\n}`
					);
				}
			}
		}
	} finally {
		await Promise.all(
			scratchDirectories.map((directory) => rm(directory, { recursive: true, force: true }))
		);
	}
	for (const [roleName, role] of Object.entries(typography.roles))
		stacks[roleName] ??= fontStacks[role.font]!;
	return { css: rules.map((rule) => `${rule}\n`).join(''), stacks, faces, files, assets };
}

/** Writes every planned font slice into `<outDir>/fonts/`, a few FontTools processes at a time. */
export async function writeFontAssets(assets: readonly FontAsset[], outDir: string): Promise<void> {
	const directory = join(outDir, 'fonts');
	await mkdir(directory, { recursive: true });
	const queue = [...assets];
	await Promise.all(
		Array.from({ length: SUBSET_JOBS }, async () => {
			for (let asset = queue.shift(); asset; asset = queue.shift())
				await subsetToWoff2(asset.source, join(directory, asset.output), asset.unicodes);
		})
	);
}
