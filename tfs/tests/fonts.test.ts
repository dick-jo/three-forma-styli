import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	inspectFontFile,
	prepareFonts,
	TfsError,
	writeFontAssets,
	type PreparedFonts,
	type SystemInput,
} from 'three-forma-styli';
import config from './fixtures/everything/tfs.config.js';

const project = fileURLToPath(new URL('./fixtures/everything/', import.meta.url));
const typography = structuredClone((config.system as unknown as SystemInput).typography!);
const regular = join(project, 'fonts/JetBrainsMono[wght].ttf');

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
		prepared = await prepareFonts(typography, project);
	});

	it('builds family stacks for both kinds of font', () => {
		expect(prepared.stacks).toEqual({
			sans: 'system-ui, sans-serif',
			mono: '"JetBrains Mono", "JetBrains Mono fallback", ui-monospace, monospace',
		});
	});

	it('declares each real face once', () => {
		expect(prepared.css).toContain(
			'src: url("./fonts/mono-normal-100-800.woff2") format("woff2");\n\tfont-weight: 100 800;\n\tfont-style: normal;'
		);
		expect(prepared.css).toContain(
			'src: url("./fonts/mono-italic-100-800.woff2") format("woff2");\n\tfont-weight: 100 800;\n\tfont-style: italic;'
		);
	});

	it('measures fallback faces exactly as 0.4.0 did', () => {
		const face = (local: string, style: string, weight: number) =>
			`src: local("${local}");\n\tfont-style: ${style};\n\tfont-weight: ${weight};\n\tsize-adjust: 99.98%;\n\tascent-override: 102.02%;\n\tdescent-override: 30%;\n\tline-gap-override: 0%;`;
		expect(prepared.css).toContain(face('Courier New', 'normal', 400));
		expect(prepared.css).toContain(face('Courier New Bold', 'normal', 700));
		expect(prepared.css).toContain(face('Courier New Italic', 'italic', 400));
		expect(prepared.css).toContain(face('Courier New Bold Italic', 'italic', 700));
		// label offers 400/500/600/700 in normal and italic.
		expect(prepared.css.match(/JetBrains Mono fallback/g)).toHaveLength(8);
	});
});

describe('roles are checked against the files', () => {
	it('rejects a weight the files do not have', async () => {
		const changed = structuredClone(typography) as any;
		changed.roles.label.weights.max = 900;
		const error = await prepareFonts(changed, project).catch((e) => e);
		expect(error).toBeInstanceOf(TfsError);
		expect(error.issues).toContainEqual({
			path: 'typography.roles.label',
			message: 'normal 900 is not in the font files (normal 100–800)',
		});
	});

	it('reports a missing file', async () => {
		const changed = structuredClone(typography) as any;
		changed.fonts.mono.files = ['./fonts/Missing.ttf'];
		const error = await prepareFonts(changed, project).catch((e) => e);
		expect(error.issues[0].path).toBe('typography.fonts.mono.files');
		expect(error.issues[0].message).toMatch(/cannot read .*Missing\.ttf/);
	});
});

describe('output files load in a browser', () => {
	let out: string;
	beforeAll(async () => {
		out = await mkdtemp(join(tmpdir(), 'tfs-fonts-test-'));
		const prepared = await prepareFonts(typography, project);
		await writeFontAssets(prepared.assets, out);
		await writeFile(join(out, 'index.html'), `<style>${prepared.css}</style><p>text</p>`);
	});
	afterAll(() => rm(out, { recursive: true, force: true }));

	it('converted TTF to real WOFF2', () => {
		const face = inspectFontFile(join(out, 'fonts/mono-italic-100-800.woff2'));
		expect({ format: face.format, family: face.family, style: face.style }).toEqual({
			format: 'woff2',
			family: 'JetBrains Mono',
			style: 'italic',
		});
	});

	it('Chromium loads normal and italic JetBrains Mono', async () => {
		const browser = await chromium.launch();
		const page = await browser.newPage();
		await page.goto(`file://${join(out, 'index.html')}`);
		const loaded = await page.evaluate(async () => {
			await document.fonts.load('500 16px "JetBrains Mono"');
			await document.fonts.load('italic 700 16px "JetBrains Mono"');
			return [...document.fonts]
				.filter((f) => f.status === 'loaded')
				.map((f) => `${f.family} ${f.style} ${f.weight}`);
		});
		await browser.close();
		expect(loaded).toEqual(['JetBrains Mono normal 100 800', 'JetBrains Mono italic 100 800']);
	});
});
