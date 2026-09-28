/** Read-only inspection + role validation; not a project-build implementation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import prettier from 'prettier';

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
const { project } = load(path.join(root, 'project.ts'));
const {
	fonts,
	system: { fontSize, typography },
} = project;
const { inspectFontFiles, classifyFontStyle } = load(
	path.join(repo, 'packages/compiler/src/fonts/inspect.ts')
);
const { fontFromManifest } = fromCore('typography/prepared-font.ts');
const { defineTypography } = fromCore('typography/authoring.ts');
const { validateTypographyPartial } = fromCore('generator/validate-typography.ts');
const inspections = inspectFontFiles(
	fonts.mono.sources.map((file) => path.resolve(sourceRoot, file))
);
assert.ok(inspections.every((font) => font.names.family === 'JetBrains Mono'));

// Feed measured facts to the existing core adapter. This is NOT a generated
// preparation manifest: no conversion, assets or fallback measurement occur here.
const facts = {
	schemaVersion: 2,
	families: {
		mono: {
			family: inspections[0].names.family,
			faces: inspections.map((font) => ({
				style: classifyFontStyle(font),
				weight: font.axes.wght
					? { min: font.axes.wght.min, max: font.axes.wght.max }
					: font.style.weight,
				axes: font.axes,
				features: font.features,
			})),
		},
	},
};
assert.deepEqual(
	facts.families.mono.faces.map(({ style, weight }) => ({ style, weight })),
	[
		{ style: 'normal', weight: { min: 100, max: 800 } },
		{ style: 'italic', weight: { min: 100, max: 800 } },
	]
);
const physicalFonts = {
	mono: fontFromManifest(facts, 'mono', { category: fonts.mono.category }),
};
function validate(authored) {
	// Adapt only the ordinary Font-size values to today's core input.
	const { unit, min, start, step, count } = fontSize;
	validateTypographyPartial(
		defineTypography({
			...authored,
			fonts: physicalFonts,
			modes: [
				{
					name: 'ordinary',
					isDefault: true,
					tokens: { unit, min, base: start, increment: step, range: count },
				},
			],
		})
	);
}
validate(typography);
const invalid = structuredClone(typography);
invalid.roles.code.weights.max = 900;
let rejection;
assert.throws(
	() => validate(invalid),
	(error) => {
		rejection = error.message;
		return /900.*unavailable.*100-800/.test(rejection);
	}
);
const evidence = {
	boundary:
		'Read-only source inspection and existing core role validation; no preparation, generated assets, browser or full project build.',
	fontIdentity: 'mono',
	family: facts.families.mono.family,
	faces: inspections.map((font, index) => ({
		source: path.basename(font.source.path),
		sha256: font.source.sha256,
		style: facts.families.mono.faces[index].style,
		weight: facts.families.mono.faces[index].weight,
	})),
	accepted: Object.entries(typography.roles.code.styles).flatMap(([style, choice]) =>
		choice.weights.map((alias) => ({ style, weight: typography.roles.code.weights[alias] }))
	),
	unsupportedWeight: rejection,
};
const formatting = await prettier.resolveConfig(path.join(root, 'fonts.ts'));
const report = await prettier.format(JSON.stringify(evidence), { ...formatting, parser: 'json' });
const snapshot = path.join(root, 'inspection-results.json');
if (process.argv.includes('--write')) fs.writeFileSync(snapshot, report);
else assert.equal(fs.readFileSync(snapshot, 'utf8'), report, 'Source facts or validation changed.');
console.log(
	'PASS: inspected both real files; normal/italic 100–800 measured, role 400/700 accepted, 900 rejected.'
);
console.log(
	'No preparation or production changes; this checks only the stated inspection/validation boundary.'
);
