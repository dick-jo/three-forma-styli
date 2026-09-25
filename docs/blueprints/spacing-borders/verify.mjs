/** Bounded source/output evidence for the workshop, not an Axis compiler. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('./', import.meta.url));
const core = path.resolve(root, '../../../packages/core/src');
const cache = new Map();

function load(file) {
	if (cache.has(file)) return cache.get(file).exports;
	const module = { exports: {} };
	cache.set(file, module);
	const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
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

const { designSystem } = load(path.join(root, 'system.ts'));
const { remSpacing, radiusWithSizeChanges, widthWithSizeChanges } = load(
	path.join(root, 'alternatives.ts')
);
const { generateSpacingTokens } = load(path.join(core, 'generator/spacing.ts'));
const { generateGapTokens } = load(path.join(core, 'generator/gap.ts'));
const { generateBorderRadiusTokens, generateBorderWidthTokens } = load(
	path.join(core, 'generator/border.ts')
);
const { defaultGeneratorConfig } = load(path.join(core, 'generator/types.ts'));
const { validatePartialDesignSystem } = load(path.join(core, 'generator/validate.ts'));

// Only these fixtures' flat Size differences. No generic merging or Axis selection.
function resolve(source, size) {
	const { modes, ...ordinary } = source;
	return { ...ordinary, ...modes?.size?.[size] };
}

function generate(source, size = 'regular') {
	const { step, count, ...spacing } = resolve(source.spacing, size);
	const entry = (tokens) => ({ modes: [{ name: size, isDefault: true, tokens }] });
	const adapted = {
		spacing: entry({ ...spacing, base: step, range: count }),
		gap: entry(resolve(source.gap, size)),
		border: {
			radius: entry(resolve(source.border.radius, size)),
			width: entry(resolve(source.border.width, size)),
		},
	};
	validatePartialDesignSystem(adapted);
	const config = defaultGeneratorConfig;
	return [
		...generateSpacingTokens(adapted.spacing, config).defaultTokens,
		...generateGapTokens(adapted.gap, adapted.spacing, config).defaultTokens,
		...generateBorderRadiusTokens(adapted.border.radius, adapted.spacing, config).defaultTokens,
		...generateBorderWidthTokens(adapted.border.width, config).defaultTokens,
	];
}

const bySize = Object.fromEntries(
	['ordinary', ...designSystem.axes.size.modes].map((size) => [size, generate(designSystem, size)])
);
assert.deepEqual(bySize.ordinary, bySize.regular);
const names = bySize.ordinary.map(({ name }) => name);
assert.equal(new Set(names).size, 22);
for (const tokens of Object.values(bySize)) {
	assert.deepEqual(
		tokens.map(({ name }) => name),
		names
	);
	for (const token of tokens.filter(({ reference }) => reference)) {
		assert.equal(token.value, tokens.find(({ name }) => name === token.reference).value);
	}
}
const value = (tokens, name) => tokens.find((token) => token.name === name).value;
assert.deepEqual(
	['regular', 's', 'l'].map((size) =>
		['sp-min', 'sp-1', 'sp-12', 'gap-l', 'gap-max', 'bdr-l', 'bdr-max', 'bdw'].map((name) =>
			value(bySize[size], name)
		)
	),
	[
		['4px', '8px', '96px', '24px', '48px', '16px', '24px', '1px'],
		['3px', '6px', '72px', '18px', '36px', '12px', '18px', '1px'],
		['5px', '10px', '120px', '30px', '60px', '20px', '30px', '1px'],
	]
);

const rem = generate({ ...designSystem, spacing: remSpacing });
assert.deepEqual(
	rem.map(({ name }) => name),
	names
);
assert.equal(value(rem, 'sp-12'), '6rem');
assert.equal(value(rem, 'gap-l'), '1.5rem');
assert.equal(value(rem, 'bdr-l'), '1rem');
assert.equal(value(rem, 'bdw'), '1px');

const changed = {
	...designSystem,
	border: { radius: radiusWithSizeChanges, width: widthWithSizeChanges },
};
assert.deepEqual(generate(changed, 'regular'), bySize.regular);
assert.deepEqual(generate(changed, 's'), bySize.s);
const largeChanges = generate(changed, 'l');
assert.deepEqual(
	largeChanges.map(({ name }) => name),
	names
);
assert.equal(value(largeChanges, 'bdr-max'), '40px');
assert.equal(largeChanges.find(({ name }) => name === 'bdr-max').reference, 'sp-4');
assert.equal(value(largeChanges, 'bdw'), '2px');
assert.equal(value(largeChanges, 'bdr-l'), '20px');

// Existing validation protects the examples' meaning, not just their field shape.
for (const [patch, message] of [
	[{ min: 8 }, /min must be lower than base/],
	[{ step: 0 }, /base must be a positive number/],
	[{ count: 2.5 }, /range must be a positive integer/],
]) {
	assert.throws(
		() => generate({ ...designSystem, spacing: { ...designSystem.spacing, ...patch } }),
		message
	);
}
for (const max of [13, 2.5, 3]) {
	assert.throws(
		() => generate({ ...designSystem, gap: { ...designSystem.gap, max } }),
		/integer from 1 to 12|strictly increasing/
	);
}
assert.throws(
	() =>
		generate({
			...designSystem,
			border: { ...designSystem.border, width: { unit: 'px', value: -1 } },
		}),
	/non-negative/
);
const zeroWidth = generate({
	...designSystem,
	border: { ...designSystem.border, width: { unit: 'px', value: 0 } },
});
assert.equal(value(zeroWidth, 'bdw'), '0px');

const snapshot = [
	'REVIEW EVIDENCE — these fixtures resolved explicitly; existing core validation/generators.',
	'22 stable names: 13 Spacing + 4 Gap + 4 Radius + 1 Width.',
	'',
	'Token\tOrdinary / regular\ts\tl\tSpacing reference',
	...bySize.ordinary.map(
		({ name, value: ordinary, reference }) =>
			`--${name}\t${ordinary}\t${value(bySize.s, name)}\t${value(bySize.l, name)}\t${reference ? `--${reference}` : '-'}`
	),
	'',
	'Rem alternative (same Gap/Radius mappings; Width remains independent)',
	'Token\tValue',
	...rem.map(({ name, value }) => `--${name}\t${value}`),
	'',
	'Genuine Large-mode changes: --bdr-max references --sp-4 = 40px; --bdw = 2px.',
	'Ordinary/regular and Small remain identical to the main example.',
	'Invalid scale numbers, out-of-range/fractional/duplicate references, and negative width are rejected.',
	'Zero width is valid. No generic-Axis compiler or nested CSS implementation is exercised.',
	'',
].join('\n');
const output = path.join(root, 'expected-tokens.txt');
if (process.argv.includes('--write')) fs.writeFileSync(output, snapshot);
assert.equal(
	fs.readFileSync(output, 'utf8'),
	snapshot,
	'Spacing/border review output has drifted.'
);
console.log('PASS: 22 stable tokens across ordinary/regular/s/l; references follow Spacing.');
console.log(
	'PASS: rem values, genuine mapping/width changes, seven rejected inputs, and zero width.'
);
console.log(
	'Review evidence only: no new production schema, Axis compiler, CSS emitter, or consumer integration.'
);
