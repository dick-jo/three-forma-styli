/** Review harness only: no generated files, library build, or production resolver. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const reviewRoot = fileURLToPath(new URL('../', import.meta.url));
const configPath = path.join(reviewRoot, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(configFile.error, undefined);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, reviewRoot);
assert.deepEqual(config.errors, []);
const buffers = new Map();
const versions = new Map();
const read = (file) => buffers.get(file) ?? ts.sys.readFile(file);
const edit = (file, text) => {
	buffers.set(file, text);
	versions.set(file, (versions.get(file) ?? 0) + 1);
};
const service = ts.createLanguageService({
	...ts.sys,
	getCompilationSettings: () => config.options,
	getScriptFileNames: () => config.fileNames,
	getScriptVersion: (file) => String(versions.get(file) ?? 0),
	getScriptSnapshot: (file) => {
		const text = read(file);
		return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
	},
	getCurrentDirectory: () => reviewRoot,
	getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
});
const diagnostics = ts.getPreEmitDiagnostics(service.getProgram());
assert.equal(
	diagnostics.length,
	0,
	diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')
);

function complete(fileName, marker) {
	const file = path.join(reviewRoot, fileName);
	const offset = read(file).indexOf(marker);
	assert.ok(offset >= 0, `Missing completion marker: ${marker}`);
	const position = offset + marker.length;
	const result = service.getCompletionsAtPosition(file, position, {});
	assert.ok(result, `No completions for ${fileName}: ${marker}`);
	return result.entries.map((entry) => entry.name).sort();
}
const probes = 'checks/completion-probes.ts';
assert.deepEqual(complete(probes, "keyof typeof axes = '"), ['size', 'theme']);
assert.deepEqual(complete(probes, "['size']['modes'][number] = '"), ['l', 'regular', 's']);
assert.deepEqual(complete(probes, "['theme']['modes'][number] = '"), ['dark', 'light']);
const colorNames = ['bg', 'ev', 'ink', 'neu', 'pri', 'shd'];
const alphaNames = ['hi', 'hi-x', 'lo', 'lo-x', 'max', 'min', 'non'];
assert.deepEqual(complete(probes, "ColorIdentity<typeof colors> = '"), colorNames);
assert.deepEqual(complete(probes, "AlphaIdentity<typeof alpha> = '"), alphaNames);
// Also ask at the real layer fields, not only isolated type probes.
assert.deepEqual(complete('shadow.ts', "color: '"), colorNames);
assert.deepEqual(complete('shadow.ts', "alpha: '"), alphaNames);

// Simulated editor buffers prove that the vocabulary is derived, not copied.
const colorFile = path.join(reviewRoot, 'color.ts');
const originalColor = read(colorFile);
edit(
	colorFile,
	originalColor.replace('tokens: { pri:', 'tokens: { duo: oklch(0.7, 0.1, 90), pri:')
);
assert.deepEqual(complete('shadow.ts', "color: '"), [...colorNames, 'duo'].sort());
edit(colorFile, originalColor.replace('tokens: { pri:', 'tokens: { accent:'));
assert.deepEqual(
	complete('shadow.ts', "color: '"),
	['accent', ...colorNames.filter((name) => name !== 'pri')].sort()
);
edit(colorFile, originalColor);
const axesFile = path.join(reviewRoot, 'axes.ts');
const originalAxes = read(axesFile);
edit(axesFile, originalAxes.replace("['regular', 's', 'l']", "['regular', 's', 'l', 'display']"));
assert.deepEqual(complete(probes, "['size']['modes'][number] = '"), [
	'display',
	'l',
	'regular',
	's',
]);
edit(axesFile, originalAxes);

const invalidFile = path.join(reviewRoot, 'checks/invalid-names.ts');
const invalidSource = read(invalidFile);
edit(invalidFile, invalidSource.replaceAll('@ts-expect-error', 'deliberate-error'));
const invalidDiagnostics = service.getSemanticDiagnostics(invalidFile);
assert.equal(invalidDiagnostics.length, 6);
const messages = invalidDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
for (const name of ['szie', 'small', "'s'", 'shaddow', 'low', 'maximum']) {
	assert.ok(
		messages.some((message) => message.includes(name)),
		`Missing diagnostic for ${name}`
	);
}
edit(invalidFile, invalidSource);
console.log(
	'PASS: real editor completions, source-edit propagation, and six deliberate name errors.'
);

// Check both type imports and value imports inside this example for cycles.
const sourceFiles = service
	.getProgram()
	.getSourceFiles()
	.filter((file) => file.fileName.startsWith(reviewRoot));
const graph = new Map();
for (const source of sourceFiles) {
	const dependencies = [];
	for (const statement of source.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const specifier = statement.moduleSpecifier.text;
		if (!specifier.startsWith('.')) continue;
		const resolved = ts.resolveModuleName(
			specifier,
			source.fileName,
			config.options,
			ts.sys
		).resolvedModule;
		assert.ok(resolved, `Unresolved import ${specifier}`);
		if (resolved.resolvedFileName.startsWith(reviewRoot))
			dependencies.push(resolved.resolvedFileName);
	}
	graph.set(source.fileName, dependencies);
}
function visit(file, chain = []) {
	assert.ok(!chain.includes(file), `Import cycle: ${[...chain, file].join(' -> ')}`);
	for (const dependency of graph.get(file) ?? []) visit(dependency, [...chain, file]);
}
for (const file of graph.keys()) visit(file);
for (const [file, dependencies] of graph) {
	assert.ok(
		!dependencies.includes(path.join(reviewRoot, 'system.ts')),
		`${file} imports the assembly file`
	);
}
const transpile = (source) =>
	ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	}).outputText;
assert.ok(!transpile(read(path.join(reviewRoot, 'shadow.ts'))).includes('require('));
assert.ok(!transpile(read(path.join(reviewRoot, 'border-radius.ts'))).includes('require('));
console.log('PASS: one-way project imports; Shadow and Radius have no emitted runtime imports.');

// Load only the review data. The sole external value constructor makes plain OKLCH data.
const modules = new Map();
function load(file) {
	if (modules.has(file)) return modules.get(file);
	const module = { exports: {} };
	const requireReview = (specifier) => {
		if (specifier === '@three-forma-styli/core')
			return { oklch: (l, c, h) => ({ mode: 'oklch', l, c, h }) };
		assert.ok(specifier.startsWith('.'), `Unexpected review dependency: ${specifier}`);
		return load(path.resolve(path.dirname(file), specifier.replace(/\.js$/, '.ts')));
	};
	new Function('require', 'module', 'exports', transpile(fs.readFileSync(file, 'utf8')))(
		requireReview,
		module,
		module.exports
	);
	modules.set(file, module.exports);
	return module.exports;
}
const { designSystem: system } = load(path.join(reviewRoot, 'system.ts'));
const palette = (colors, theme) => ({ ...colors.tokens, ...colors.modes.theme[theme]?.tokens });
const colorCss = (value, alpha) =>
	`oklch(${value.l} ${value.c} ${value.h}${alpha === undefined ? '' : ` / ${alpha}`})`;
const alphaValues = { non: 0, ...system.alpha.scales[system.alpha.defaultScale].values };
let stableNames;
for (const theme of system.axes.theme.modes) {
	for (const size of system.axes.size.modes) {
		const colors = palette(system.colors, theme);
		assert.deepEqual(Object.keys(colors).sort(), colorNames);
		const spacing = { ...system.spacing, ...system.spacing.modes.size[size] };
		const tokens = {};
		for (const [identity, value] of Object.entries(colors)) {
			tokens[`--clr-${identity}`] = colorCss(value);
			for (const [position, opacity] of Object.entries(alphaValues))
				tokens[`--clr-${identity}-a-${position}`] = colorCss(value, opacity);
		}
		for (const [position, opacity] of Object.entries(alphaValues))
			tokens[`--a-${position}`] = opacity;
		tokens['--sp-min'] = spacing.min + spacing.unit;
		for (let n = 1; n <= spacing.range; n++) tokens[`--sp-${n}`] = spacing.base * n + spacing.unit;
		for (const [prefix, range] of [
			['gap', system.gap],
			['bdr', system.border.radius],
		]) {
			for (const [position, ref] of Object.entries(range))
				tokens[`--${prefix}-${position}`] =
					(ref === 'min' ? spacing.min : spacing.base * ref) + spacing.unit;
		}
		tokens['--bdw'] = system.border.width.value + system.border.width.unit;
		const shadow = { ...system.shadows.ranges.neu, ...system.shadows.modes.size[size]?.ranges.neu };
		for (const [position, layers] of Object.entries(shadow)) {
			tokens[`--shd-${position}`] = layers
				.map((layer) => {
					assert.ok(colors[layer.color.color]);
					assert.ok(
						layer.color.alpha === undefined || Object.hasOwn(alphaValues, layer.color.alpha)
					);
					const lengths = [
						layer.x,
						layer.y,
						layer.blur,
						...(layer.spread === undefined ? [] : [layer.spread]),
					];
					return [
						...(layer.inset ? ['inset'] : []),
						...lengths.map((value) => value + system.shadows.unit),
						colorCss(colors[layer.color.color], alphaValues[layer.color.alpha]),
					].join(' ');
				})
				.join(', ');
		}
		const names = Object.keys(tokens).sort();
		if (stableNames) assert.deepEqual(names, stableNames);
		else stableNames = names;
		assert.equal(names.length, 81);
		assert.equal(tokens['--bdr-l'], { regular: '16px', s: '12px', l: '20px' }[size]);
		assert.equal(tokens['--gap-l'], tokens['--bdr-l']);
		assert.equal(tokens['--bdw'], '1px');
		assert.equal(tokens['--clr-bg'], theme === 'light' ? 'oklch(0.96 0 0)' : 'oklch(0.24 0 0)');
		const ink = `oklch(${theme === 'light' ? 0.2 : 0.06} 0 0 / 0.25)`;
		assert.equal(
			tokens['--shd-max'],
			size === 's'
				? `0px 2px 4px ${ink}, 0px 12px 32px -6px ${ink}`
				: `0px 3px 6px ${ink}, 0px 20px 48px -8px ${ink}`
		);
	}
}
console.log(
	'PASS: six example selections, derived Radius/Gap, changing Shadow, and 81 stable output names.'
);

const { incompleteColors, knownButUnavailable } = load(
	path.join(reviewRoot, 'checks/incomplete-palette.ts')
);
const missing = system.axes.theme.modes.filter(
	(theme) => !Object.hasOwn(palette(incompleteColors, theme), knownButUnavailable.color)
);
assert.deepEqual(missing, ['dark']);
console.log(
	'PASS: incomplete palette identifies shd as unavailable in theme=dark, despite its valid spelling.'
);
console.log(
	'Review evidence only: no TFS compiler support, general multi-axis resolver, or nested browser behavior is implemented here.'
);
service.dispose();
