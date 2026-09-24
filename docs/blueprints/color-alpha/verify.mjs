/** Bounded review evidence: no new Axis compiler or production build. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('./', import.meta.url));
const core = path.resolve(root, '../../../packages/core/src');
const cache = new Map();

// Execute the actual small source functions, avoiding stale built package exports.
function load(file) {
	if (cache.has(file)) return cache.get(file).exports;
	const module = { exports: {} };
	cache.set(file, module);
	const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
	const require = (name) => {
		if (name === '@three-forma-styli/core') {
			return {
				oklch: load(path.join(core, 'utils.ts')).oklch,
				deriveAlphaScale: load(path.join(core, 'alpha/authoring.ts')).deriveAlphaScale,
			};
		}
		if (name.startsWith('.')) {
			const target = path.resolve(path.dirname(file), name);
			return load(fs.existsSync(target) ? target : target.replace(/\.js$/, '.ts'));
		}
		return createRequire(file)(name);
	};
	new Function('module', 'exports', 'require', js)(module, module.exports, require);
	return module.exports;
}

const { alpha } = load(path.join(root, 'alpha.ts'));
const { colors } = load(path.join(root, 'color.ts'));
const { axes } = load(path.join(root, '../axes/separate-files/axes.ts'));
const { generateAlphaTokens, resolvedAlphaValues } = load(path.join(core, 'generator/alpha.ts'));
const { generateColorTokens } = load(path.join(core, 'generator/colors.ts'));
const { resolveIdentityGroups } = load(path.join(core, 'groups.ts'));
const alphaTokens = generateAlphaTokens(alpha).defaultTokens;
const selectedScale = colors.alphaScale ?? alpha.defaultScale;
const schedule = resolvedAlphaValues(alpha.scales[selectedScale].values);
const expectedIdentities = ['bg', 'duo', 'ev', 'ink', 'neu', 'pen', 'pri', 'shd', 'tet', 'tri'];
const byTheme = {};

assert.equal(selectedScale, 'neu');
assert.equal(Object.hasOwn(axes.theme, 'default'), false);
assert.deepEqual(Object.keys(colors.tokens).sort(), expectedIdentities);
assert.deepEqual(Object.values(alpha.scales.pri.values), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
for (const scale of Object.values(alpha.scales)) {
	const values = Object.values(scale.values);
	assert.equal(values.length, 6);
	assert.ok(values.every((value, i) => value > (values[i - 1] ?? 0) && value < 1));
}

for (const theme of ['ordinary', ...axes.theme.modes]) {
	// Explicitly resolve only this two-palette example, then use the legacy generator
	// on a complete standalone palette. This does not implement generic Axis resolution.
	const palette = { ...colors.tokens, ...colors.modes.theme[theme]?.tokens };
	assert.deepEqual(Object.keys(palette).sort(), expectedIdentities);
	for (const group of Object.values(colors.groups)) {
		assert.ok(group.identities.every((identity) => identity in palette));
	}
	assert.deepEqual(resolveIdentityGroups(expectedIdentities, colors.groups), {
		accents: ['pri', 'duo', 'tri', 'tet', 'pen'],
		glow: ['neu', 'pri', 'duo'],
	});
	const generated = generateColorTokens(
		{ modes: [{ name: theme, isDefault: true, tokens: palette }] },
		{
			prefixes: { color: 'clr' },
			colorFormat: { base: 'oklch', alpha: 'oklch', alphaModifier: 'a' },
		},
		schedule
	).defaultTokens;
	const tokens = [...alphaTokens, ...generated];
	assert.equal(tokens.length, 94);
	byTheme[theme] = Object.fromEntries(tokens.map(({ name, value }) => [`--${name}`, value]));
	assert.equal(Object.keys(byTheme[theme]).length, 94);
}

assert.deepEqual(Object.keys(byTheme.light).sort(), Object.keys(byTheme.dark).sort());
assert.deepEqual(byTheme.ordinary, byTheme.dark);
assert.equal(byTheme.light['--clr-shd'], 'oklch(0.1200 0.0000 0.00)');
assert.equal(byTheme.dark['--clr-shd'], 'oklch(0.0600 0.0000 0.00)');
assert.equal(byTheme.light['--clr-pri-a-lo'], 'oklch(0.6000 0.1600 285.00 / 0.2500)');
assert.equal(byTheme.dark['--clr-pri-a-lo'], byTheme.light['--clr-pri-a-lo']);
assert.equal(byTheme.light['--a-lo'], '0.25');
assert.equal(byTheme.light['--a-pri-lo'], '0.3');
assert.equal(byTheme.light['--a-non'], '0');
assert.equal(byTheme.light['--a-pri-non'], '0');
assert.equal(byTheme.light['--a'], undefined);
assert.equal(byTheme.light['--a-neu-lo'], undefined);

const snapshot = [
	'REVIEW SNAPSHOT — explicitly resolved mock palettes; not generic-Axis compiler output.',
	'94 names in the ordinary set and each mode: 80 Color + 14 Alpha. Groups add no aliases.',
	'',
	'Token\tOrdinary\tLight\tDark',
	...Object.keys(byTheme.light).map(
		(name) => `${name}\t${byTheme.ordinary[name]}\t${byTheme.light[name]}\t${byTheme.dark[name]}`
	),
	'',
].join('\n');
const output = path.join(root, 'expected-tokens.txt');
if (process.argv.includes('--write')) fs.writeFileSync(output, snapshot);
assert.equal(fs.readFileSync(output, 'utf8'), snapshot, 'Review token snapshot has drifted.');
console.log(
	'PASS: complete ordinary palette, Light/Dark choices, both Groups, two Alpha scales, and 94 stable token names.'
);
console.log(
	'Review evidence only: no generic-Axis compiler, nested CSS, luminance enforcement, or runtime integration.'
);
