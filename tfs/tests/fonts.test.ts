import { createServer, type Server } from 'node:http';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as fontkit from 'fontkit';
import type { Font } from 'fontkit';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	emitFontsJs,
	inspectFontFile,
	prepareFonts,
	TfsError,
	writeFontAssets,
	type PreparedFonts,
	type SystemInput,
} from 'three-forma-styli';
import { project, system } from './everything.js';

const regular = join(project, 'fonts/JetBrainsMono[wght].ttf');
/** The slices JetBrains Mono has characters for, in the order a browser tries them. */
const MONO_SLICES = [
	'latin',
	'latin-ext',
	'vietnamese',
	'greek',
	'cyrillic',
	'cyrillic-ext',
	'math',
	'symbols',
	'other',
];
const file = (slice: string) => `mono-normal-100-800-${slice}.woff2`;

/** The everything-project with its typography changed by `change`. */
function withTypography(change: (typography: any) => void): SystemInput {
	const copy = structuredClone(system) as any;
	change(copy.typography);
	return copy;
}

describe('inspection', () => {
	it('reads family, style and weight range from the file', () => {
		const face = inspectFontFile(regular);
		expect({
			family: face.family,
			style: face.style,
			weight: face.weight,
			format: face.format,
		}).toEqual({
			family: 'JetBrains Mono',
			style: 'normal',
			weight: { min: 100, max: 800 },
			format: 'truetype',
		});
		expect(inspectFontFile(join(project, 'fonts/JetBrainsMono-Italic[wght].ttf')).style).toBe(
			'italic'
		);
	});
});

describe('preparation', () => {
	let prepared: PreparedFonts;
	beforeAll(async () => {
		prepared = await prepareFonts(system, project);
	});

	it('gives every role a font-family stack', () => {
		expect(prepared.stacks).toEqual({
			prose: 'system-ui, sans-serif',
			heading: 'system-ui, sans-serif',
			label: '"JetBrains Mono", "JetBrains Mono fallback", ui-monospace, monospace',
		});
	});

	it('declares each real face as Unicode slices, latin last so it is tried first', () => {
		const sources = [...prepared.css.matchAll(/url\("\.\/fonts\/(mono-normal[^"]+)"\)/g)].map(
			(match) => match[1]
		);
		expect(sources).toEqual([...MONO_SLICES].reverse().map(file));
		expect(prepared.css).toContain(
			'src: url("./fonts/mono-normal-100-800-latin.woff2") format("woff2");\n\tfont-weight: 100 800;\n\tfont-style: normal;\n\tfont-display: swap;\n\tunicode-range: U+0-FF, U+131,'
		);
	});

	it('measures monospaced fallback faces exactly as 0.4.0 did, capitals or not', () => {
		const face = (local: string, style: string, weight: number) =>
			`src: local("${local}");\n\tfont-style: ${style};\n\tfont-weight: ${weight};\n\tsize-adjust: 99.98%;\n\tascent-override: 102.02%;\n\tdescent-override: 30%;\n\tline-gap-override: 0%;`;
		expect(prepared.css).toContain(face('Courier New', 'normal', 400));
		expect(prepared.css).toContain(face('Courier New Bold', 'normal', 700));
		expect(prepared.css).toContain(face('Courier New Italic', 'italic', 400));
		expect(prepared.css).toContain(face('Courier New Bold Italic', 'italic', 700));
		// label offers 400/500/600/700 in normal and italic.
		expect(prepared.css.match(/font-family: "JetBrains Mono fallback"/g)).toHaveLength(8);
	});
});

describe('roles are checked against the files', () => {
	it('rejects a weight the files do not have', async () => {
		const changed = withTypography((t) => (t.roles.label.weights.max = 900));
		const error = await prepareFonts(changed, project).catch((e) => e);
		expect(error).toBeInstanceOf(TfsError);
		expect(error.issues).toContainEqual({
			path: 'typography.roles.label',
			message: 'normal 900 is not in the font files (normal 100–800)',
		});
	});

	it('reports a missing file', async () => {
		const changed = withTypography((t) => (t.fonts.mono.files = ['./fonts/Missing.ttf']));
		const error = await prepareFonts(changed, project).catch((e) => e);
		expect(error.issues[0].path).toBe('typography.fonts.mono.files');
		expect(error.issues[0].message).toMatch(/cannot read .*Missing\.ttf/);
	});
});

// Inter (ASCII only, with its opsz axis) under four roles. With the everything-project's
// font size scale: fontSize 2 = 14px, 'min' = 10px, 12 = 34px.
const size = (fontSize: number | 'min') => ({
	base: { fontSize, lineHeight: 1.2, letterSpacing: 0 },
});
const interSystem = withTypography((t) => {
	t.fonts = { inter: { files: ['../inter/Inter[opsz,wght].ttf'], category: 'sans' } };
	t.roles = {
		body: { font: 'inter', textTransform: 'none', weights: 400, sizes: size(2) },
		small: { font: 'inter', textTransform: 'capitalize', weights: 400, sizes: size('min') },
		caps: { font: 'inter', textTransform: 'uppercase', weights: 400, sizes: size(2) },
		display: { font: 'inter', textTransform: 'none', weights: 400, sizes: size(12) },
	};
});

describe('fallback faces are calibrated per role', () => {
	let prepared: PreparedFonts;
	beforeAll(async () => {
		prepared = await prepareFonts(interSystem, project);
	});

	it('one fallback family per distinct calibration, shared by roles that measure alike', () => {
		const stack = (fallback: string) => `"Inter", "${fallback}", system-ui, sans-serif`;
		expect(prepared.stacks).toEqual({
			// 10px is below Inter's smallest optical size, so it measures as 14px does.
			body: stack('Inter fallback'),
			small: stack('Inter fallback'),
			caps: stack('Inter caps fallback'),
			// 34px is above the largest, 32.
			display: stack('Inter opsz 32 fallback'),
		});
		expect(prepared.css.match(/src: local\("Arial"\)/g)).toHaveLength(3);
	});

	describe('in Chromium, each role text is as wide in its fallback as in Inter', () => {
		let browser: Browser;
		let out: string;
		beforeAll(async () => {
			out = await mkdtemp(join(tmpdir(), 'tfs-calibration-'));
			await writeFontAssets(prepared.assets, out);
			await writeFile(join(out, 'index.html'), `<style>${prepared.css}</style>`);
			browser = await chromium.launch();
		});
		afterAll(async () => {
			await browser.close();
			await rm(out, { recursive: true, force: true });
		});

		/** Width of `text` in the real font ÷ its width in a fallback family, minus 1. */
		async function error(fallback: string, text: string, px: number): Promise<number | null> {
			const page = await browser.newPage();
			await page.goto(pathToFileURL(join(out, 'index.html')).href);
			const result = await page.evaluate(
				async ([fallback, text, px]) => {
					const local = await document.fonts.load(`${px}px "${fallback}"`, text);
					if (local.length === 0) return null; // Arial is not installed here.
					await document.fonts.load(`${px}px Inter`, text);
					const width = (family: string) => {
						const span = document.createElement('span');
						span.style.font = `400 ${px}px ${family}`;
						span.style.whiteSpace = 'pre';
						span.textContent = text;
						document.body.append(span);
						return span.getBoundingClientRect().width;
					};
					return width('Inter') / width(`"${fallback}"`) - 1;
				},
				[fallback, text, px] as const
			);
			await page.close();
			return result;
		}

		const CAPS = 'LIMITED EDITION PRINTS FROM INDEPENDENT ARTISTS';
		const LOWER = 'limited edition prints from independent artists every week';

		it('capitals: within 1.5% in the caps family, far off in the lowercase one', async (context) => {
			const caps = await error('Inter caps fallback', CAPS, 14);
			if (caps === null) return context.skip();
			expect(Math.abs(caps)).toBeLessThan(0.015);
			expect(Math.abs((await error('Inter fallback', CAPS, 14))!)).toBeGreaterThan(0.05);
		});

		it('optical size: within 1.5% at 32px in its own family', async (context) => {
			const display = await error('Inter opsz 32 fallback', LOWER, 32);
			if (display === null) return context.skip();
			expect(Math.abs(display)).toBeLessThan(0.015);
			expect(Math.abs((await error('Inter fallback', LOWER, 32))!)).toBeGreaterThan(0.015);
		});
	});
});

describe('output files', () => {
	let out: string;
	let prepared: PreparedFonts;
	let server: Server;
	let origin: string;
	beforeAll(async () => {
		// Inside the project, so the test runner may import the generated fonts.js.
		out = await mkdtemp(join(project, '..', '.tmp-fonts-'));
		prepared = await prepareFonts(system, project);
		await writeFontAssets(prepared.assets, out);
		await writeFile(join(out, 'fonts.css'), prepared.css);
		await writeFile(join(out, 'fonts.js'), emitFontsJs(prepared.files));
		server = createServer(async (request, response) => {
			const path = decodeURIComponent(request.url!);
			const body = await readFile(join(out, path)).catch(() => null);
			const type = { '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2' };
			const extension = Object.keys(type).find((e) => path.endsWith(e)) as keyof typeof type;
			response.writeHead(body ? 200 : 404, { 'content-type': type[extension] }).end(body);
		});
		await new Promise<void>((resolve) => server.listen(0, resolve));
		origin = `http://localhost:${(server.address() as { port: number }).port}`;
	});
	afterAll(async () => {
		server.close();
		await rm(out, { recursive: true, force: true });
	});

	const open = (file: string) => fontkit.openSync(join(out, 'fonts', file)) as Font;

	it('slices are WOFF2 that together cover every character of the source, axes and features kept', async () => {
		const source = fontkit.openSync(regular) as Font;
		const slices = (await readdir(join(out, 'fonts'))).filter((file) =>
			file.startsWith('mono-normal-')
		);
		expect(slices.sort()).toEqual(MONO_SLICES.map(file).sort());
		const covered = new Set(slices.flatMap((file) => open(file).characterSet));
		expect([...new Set(source.characterSet)].filter((c) => !covered.has(c))).toEqual([]);
		for (const file of slices) {
			const slice = open(file);
			expect((slice as unknown as { type: string }).type).toBe('WOFF2');
			expect(Object.keys(slice.variationAxes)).toEqual(Object.keys(source.variationAxes));
		}
		// Every layout feature survives in the slices it applies to.
		const features = new Set(slices.flatMap((file) => open(file).availableFeatures));
		expect(source.availableFeatures.filter((f) => !features.has(f))).toEqual([]);
	});

	it('fonts.js gives each slice the URL fonts.css uses', async () => {
		const { fontFiles } = await import(pathToFileURL(join(out, 'fonts.js')).href);
		const cssUrls = [...prepared.css.matchAll(/url\("([^"]+)"\)/g)].map(
			(match) => new URL(match[1]!, pathToFileURL(join(out, 'fonts.css'))).href
		);
		const manifestUrls = Object.values(fontFiles).flatMap((faces: any) =>
			Object.values(faces).flatMap((slices: any) => Object.values(slices))
		);
		expect(manifestUrls.sort()).toEqual(cssUrls.sort());
		expect(fontFiles.mono['normal-100-800'].latin).toBe(
			pathToFileURL(join(out, 'fonts/mono-normal-100-800-latin.woff2')).href
		);
	});

	it('Chromium downloads only the slices the page has characters for', async () => {
		const browser = await chromium.launch();
		const page = await browser.newPage();
		const requested: string[] = [];
		page.on('request', (request) => {
			if (request.url().endsWith('.woff2')) requested.push(request.url().split('/').pop()!);
		});
		await writeFile(
			join(out, 'index.html'),
			`<link rel="stylesheet" href="fonts.css"><p style="font-family: 'JetBrains Mono'">Latin text</p>`
		);
		await page.goto(`${origin}/index.html`);
		await page.evaluate(() => document.fonts.ready);
		expect(requested).toEqual(['mono-normal-100-800-latin.woff2']);

		const add = async (text: string) => {
			await page.evaluate((text) => {
				const p = document.createElement('p');
				p.style.fontFamily = "'JetBrains Mono'";
				p.textContent = text;
				document.body.append(p);
				return document.fonts.ready;
			}, text);
		};
		await add('Michał');
		expect(requested).toEqual([
			'mono-normal-100-800-latin.woff2',
			'mono-normal-100-800-latin-ext.woff2',
		]);
		// One character from each kind of slice downloads that slice alone.
		for (const [text, slice] of [
			['Привет', 'cyrillic'],
			['■', 'symbols'],
			['─', 'other'],
		] as const) {
			const before = requested.length;
			await add(text);
			expect(requested.slice(before)).toEqual([file(slice)]);
		}
		await browser.close();
	});
});
