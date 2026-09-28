/** Real-font review: existing source functions, temporary outputs, no production changes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import prettier from 'prettier';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('./', import.meta.url));
const repo = path.resolve(root, '../../../..');
const sourceIndex = process.argv.indexOf('--source-root');
assert.ok(
	sourceIndex >= 0 && process.argv[sourceIndex + 1],
	'Supply --source-root <directory containing jetbrains-mono>.'
);
const sourceRoot = path.resolve(process.argv[sourceIndex + 1]);
const cache = new Map();
function load(file) {
	if (cache.has(file)) return cache.get(file).exports;
	const module = { exports: {} };
	cache.set(file, module);
	const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
			esModuleInterop: true,
		},
	}).outputText;
	const require = (name) => {
		if (name.startsWith('.')) {
			const target = path.resolve(path.dirname(file), name);
			return load(fs.existsSync(target) ? target : target.replace(/\.js$/, '.ts'));
		}
		return createRequire(file)(name);
	};
	new Function('module', 'exports', 'require', js)(module, module.exports, require);
	return module.exports;
}
const fromCore = (file) => load(path.join(repo, 'packages/core/src', file));
const fromCompiler = (file) => load(path.join(repo, 'packages/compiler/src', file));
const { project } = load(path.join(root, 'project.ts'));
const {
	fonts,
	system: { fontSize, typography },
} = project;
const { fontFromManifest } = fromCore('typography/prepared-font.ts');
const { defineTypography } = fromCore('typography/authoring.ts');
const { validateTypographyPartial } = fromCore('generator/validate-typography.ts');
const { generateTypographyTokens, generateTypographyContract } =
	fromCore('generator/typography.ts');
const { defaultGeneratorConfig } = fromCore('generator/types.ts');
const { toTypographyCss } = fromCore('transformers/typography-css.ts');
const { typographyClassKeys } = fromCore('transformers/typography-class-names.ts');
const { typographyContractData, typographyClassResolverJavascript } = fromCore(
	'transformers/typography-typescript.ts'
);
const { prepareFonts } = fromCompiler('fonts/prepare.ts');
const { buildAdjustedFallbacks } = fromCompiler('fonts/adjusted-fallbacks.ts');

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-font-review-'));
const preparedDirectory = path.join(workspace, 'fonts');
let browser;
let server;
try {
	const prepared = await prepareFonts(
		{ output: { directory: preparedDirectory }, fonts },
		sourceRoot
	);
	const family = prepared.manifest.families.mono;
	assert.equal(family.family, 'JetBrains Mono');
	assert.deepEqual(
		family.faces.map(({ style, weight }) => ({ style, weight })),
		[
			{ style: 'normal', weight: { min: 100, max: 800 } },
			{ style: 'italic', weight: { min: 100, max: 800 } },
		]
	);
	assert.ok(prepared.manifest.conversion.woff2.fontToolsVersion);
	for (const face of family.faces) {
		assert.equal(face.strategy, 'woff2');
		assert.equal(
			createHash('sha256')
				.update(fs.readFileSync(path.join(preparedDirectory, face.file)))
				.digest('hex'),
			face.sha256
		);
		assert.equal(
			createHash('sha256')
				.update(fs.readFileSync(path.join(sourceRoot, 'jetbrains-mono', face.source.file)))
				.digest('hex'),
			face.source.sha256
		);
	}

	const physicalFonts = {
		mono: fontFromManifest(prepared.manifest, 'mono', { category: fonts.mono.category }),
	};
	function resolve(authored) {
		// Only the ordinary scale is adapted; Axis behaviour has its own preceding probe.
		const { unit, min, start, step, count } = fontSize;
		const result = defineTypography({
			...authored,
			fonts: physicalFonts,
			modes: [
				{
					name: 'ordinary',
					isDefault: true,
					tokens: { unit, min, base: start, increment: step, range: count },
				},
			],
		});
		validateTypographyPartial(result);
		return result;
	}
	const resolved = resolve(typography);
	const invalid = structuredClone(typography);
	invalid.roles.code.weights.max = 900;
	let rejection;
	assert.throws(
		() => resolve(invalid),
		(error) => {
			rejection = error.message;
			return /900.*unavailable/.test(rejection);
		}
	);
	const adjusted = await buildAdjustedFallbacks(resolved, prepared.manifest, fonts, {
		preparedDirectory,
	});
	assert.ok(adjusted);
	assert.equal(adjusted.measurementCount, 4);
	const measurements = adjusted.manifest.roles.code.instances;
	assert.deepEqual(measurements.map(({ role }) => [role.style, role.weight]).sort(), [
		['italic', 400],
		['italic', 700],
		['normal', 400],
		['normal', 700],
	]);
	for (const measured of measurements)
		assert.equal(measured.primary.coordinates.wght, measured.role.weight);

	// Web-ready inputs take the existing copy path. No second public authoring form.
	const copyInput = structuredClone(fonts);
	copyInput.mono.sources = family.faces.map(({ file }) => path.join(preparedDirectory, file));
	const copied = await prepareFonts(
		{ output: { directory: path.join(workspace, 'copied') }, fonts: copyInput },
		sourceRoot
	);
	assert.equal(copied.manifest.conversion, undefined);
	for (const [i, face] of copied.manifest.families.mono.faces.entries()) {
		assert.equal(face.strategy, 'copy');
		assert.equal(face.sha256, family.faces[i].sha256);
	}
	// Explicit fallback stacks opt out of automatic adjustment in the current API.
	const manual = { mono: { ...fonts.mono, fallbacks: ['ui-monospace', 'monospace'] } };
	assert.equal(
		await buildAdjustedFallbacks(resolved, prepared.manifest, manual, { preparedDirectory }),
		undefined
	);

	const contract = generateTypographyContract(adjusted.typography, defaultGeneratorConfig);
	const tokens = generateTypographyTokens(
		adjusted.typography,
		defaultGeneratorConfig
	).defaultTokens;
	const tokenMap = Object.fromEntries(tokens.map(({ name, value }) => [name, value]));
	assert.equal(contract.fonts.mono.verified, true);
	assert.equal(
		tokenMap['text-code-font-family'],
		'"JetBrains Mono", "__tfs-mono-adjusted-fallback", ui-monospace, monospace'
	);
	const fontCss = prepared.css + '\n' + adjusted.css;
	const css =
		fontCss +
		'\n:root {\n' +
		tokens.map(({ name, value }) => `  --${name}: ${value};`).join('\n') +
		'\n}\n' +
		toTypographyCss({ typography: contract });
	const classMap = Object.fromEntries(
		typographyClassKeys(contract).map((key) => [key, `text--${key}`])
	);
	const className = new Function(
		'typography',
		typographyClassResolverJavascript().replace('export function', 'function') +
			'\nreturn typographyClassName;'
	)(typographyContractData(contract));
	const cases = ['normal', 'italic'].flatMap((fontStyle) =>
		['min', 'max'].map((weight) => ({ fontStyle, weight }))
	);
	const html =
		`<style>html { font-size: 16px; }\n${css}</style>` +
		cases
			.map(
				(selection) =>
					`<p data-style="${selection.fontStyle}" data-weight="${selection.weight}" class="${className({ role: 'code', ...selection }, classMap)}">TFS font review 0123456789</p>`
			)
			.join('');
	const files = new Map(
		family.faces.map((face) => [
			'/' + face.file,
			fs.readFileSync(path.join(preparedDirectory, face.file)),
		])
	);
	server = createServer((request, response) => {
		const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
		if (pathname === '/') {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
			response.end(html);
		} else if (files.has(pathname)) {
			response.writeHead(200, { 'content-type': 'font/woff2' });
			response.end(files.get(pathname));
		} else {
			response.writeHead(404);
			response.end();
		}
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(`http://127.0.0.1:${server.address().port}/`);
	const browserResults = await page.evaluate(async (choices) => {
		const loads = [];
		for (const { fontStyle, weight } of choices) {
			const numeric = weight === 'min' ? 400 : 700;
			const loaded = await document.fonts.load(
				`${fontStyle} ${numeric} 16px "JetBrains Mono"`,
				'TFS 0123'
			);
			loads.push({
				fontStyle,
				weight: numeric,
				primaryLoaded: loaded.some(
					(face) => face.status === 'loaded' && face.family.replaceAll('"', '') === 'JetBrains Mono'
				),
			});
		}
		await document.fonts.ready;
		return {
			loads,
			computed: [...document.querySelectorAll('p')].map((element) => {
				const style = getComputedStyle(element);
				return {
					fontStyle: style.fontStyle,
					fontWeight: style.fontWeight,
					fontSize: style.fontSize,
					lineHeight: style.lineHeight,
					family: style.fontFamily,
				};
			}),
		};
	}, cases);
	assert.ok(browserResults.loads.every(({ primaryLoaded }) => primaryLoaded));
	assert.deepEqual(
		browserResults.computed.map(({ fontStyle, fontWeight, fontSize, lineHeight }) => ({
			fontStyle,
			fontWeight,
			fontSize,
			lineHeight,
		})),
		cases.map(({ fontStyle, weight }) => ({
			fontStyle,
			fontWeight: weight === 'min' ? '400' : '700',
			fontSize: '16px',
			lineHeight: '24px',
		}))
	);
	assert.ok(browserResults.computed.every(({ family }) => family.includes('JetBrains Mono')));

	const evidence = {
		boundary:
			'Existing core/compiler source, actual local font files, temporary preparation and browser loading; no overhaul compiler implementation.',
		fontIdentity: 'mono',
		family: family.family,
		conversion: prepared.manifest.conversion,
		fallbackTools: adjusted.manifest.tools,
		faces: family.faces.map(({ source, file, style, weight, sha256, strategy, version }) => ({
			source,
			file,
			style,
			weight,
			sha256,
			strategy,
			version,
		})),
		roleFamilyToken: tokenMap['text-code-font-family'],
		adjustments: measurements.map(({ role, primary, fallback, calibration }) => ({
			role,
			primaryCoordinates: primary.coordinates,
			fallback: fallback.family,
			css: calibration.css,
		})),
		unsupportedWeight: rejection,
		webReadyCopyPreservedBytes: true,
		explicitFallbackStackSkipsAutomaticAdjustment: true,
		browser: browserResults,
	};
	const formatting = await prettier.resolveConfig(path.join(root, 'fonts.ts'));
	const fontCssSnapshot = await prettier.format(fontCss, { ...formatting, parser: 'css' });
	const report = await prettier.format(JSON.stringify(evidence), { ...formatting, parser: 'json' });
	if (process.argv.includes('--write')) {
		fs.writeFileSync(path.join(root, 'expected-fonts.css'), fontCssSnapshot);
		fs.writeFileSync(path.join(root, 'expected-results.json'), report);
	} else {
		assert.equal(
			fs.readFileSync(path.join(root, 'expected-fonts.css'), 'utf8'),
			fontCssSnapshot,
			'Font CSS differs from the reviewed output.'
		);
		assert.equal(
			fs.readFileSync(path.join(root, 'expected-results.json'), 'utf8'),
			report,
			'Font evidence differs; inspect source/toolchain changes.'
		);
	}
	console.log(
		'PASS: real normal/italic sources inspected, converted, validated and loaded at 400/700 in Chromium.'
	);
	console.log(
		'PASS: four exact-instance fallback calculations, unsupported 900 rejected, and web-ready copy preserves bytes.'
	);
	console.log(
		'Review output only; local fallback rendering, font swaps and cross-platform layout shifts are not certified.'
	);
} finally {
	if (browser) await browser.close();
	if (server?.listening)
		await new Promise((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve()))
		);
	fs.rmSync(workspace, { recursive: true, force: true });
}
