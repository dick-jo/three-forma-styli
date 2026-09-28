/** Bounded review evidence: existing core functions, one explicitly resolved Size axis. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { chromium } from '@playwright/test';

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

const { fontSize } = load(path.join(root, 'font-size.ts'));
const { typography } = load(path.join(root, 'typography.ts'));
const { axes } = load(path.join(root, '../axes/separate-files/axes.ts'));
const { defineTypography } = load(path.join(core, 'typography/authoring.ts'));
const { validateTypographyPartial } = load(path.join(core, 'generator/validate-typography.ts'));
const { generateTypographyTokens, generateTypographyContract } = load(
	path.join(core, 'generator/typography.ts')
);
const { defaultGeneratorConfig } = load(path.join(core, 'generator/types.ts'));
const { toTypographyCss } = load(path.join(core, 'transformers/typography-css.ts'));
const { typographyClassKeys } = load(path.join(core, 'transformers/typography-class-names.ts'));
const { typographyContractData, typographyClassResolverJavascript } = load(
	path.join(core, 'transformers/typography-typescript.ts')
);

function resolve(size) {
	const { modes, ...ordinary } = fontSize;
	const { start, step, count, ...values } = { ...ordinary, ...modes.size[size] };
	// Adapt this fixture to existing core; legacy fields do not enter authored files.
	const adapted = defineTypography({
		...typography,
		modes: [
			{
				name: size,
				isDefault: true,
				tokens: { ...values, base: start, increment: step, range: count },
			},
		],
	});
	validateTypographyPartial(adapted);
	return {
		tokens: generateTypographyTokens(adapted, defaultGeneratorConfig).defaultTokens,
		contract: generateTypographyContract(adapted, defaultGeneratorConfig),
	};
}

const bySize = Object.fromEntries(
	['ordinary', ...axes.size.modes].map((size) => [size, resolve(size)])
);
assert.deepEqual(bySize.ordinary, bySize.regular);
const names = bySize.ordinary.tokens.map(({ name }) => name);
assert.equal(new Set(names).size, 37);
for (const { tokens, contract } of Object.values(bySize)) {
	assert.deepEqual(
		tokens.map(({ name }) => name),
		names
	);
	assert.equal(contract.fonts.sans.verified, false);
	assert.deepEqual(contract.roles.prose.displayOrder, ['min', 's', 'base', 'l', 'max']);
}
const value = (size, name) => bySize[size].tokens.find((token) => token.name === name).value;
assert.deepEqual(
	['regular', 's', 'l'].map((size) =>
		['fs-min', 'fs-1', 'fs-3', 'fs-12'].map((name) => value(size, name))
	),
	[
		['0.625rem', '0.75rem', '1rem', '2.125rem'],
		['0.625rem', '0.6875rem', '0.9375rem', '2.0625rem'],
		['0.6875rem', '0.8125rem', '1.0625rem', '2.1875rem'],
	]
);
assert.equal(value('ordinary', 'text-prose-font-size'), 'var(--fs-3)');
assert.equal(value('ordinary', 'text-prose-font-weight-base'), '400');
assert.equal(names.includes('text-prose-base-font-size'), false);

const snapshot = [
	'REVIEW EVIDENCE — proposed inputs adapted to current core; no generic-Axis compiler.',
	'37 stable names. Scalar font-weight-base is existing generator output, not a new authored position.',
	'',
	'Token\tOrdinary / regular\ts\tl',
	...names.map(
		(name) => `--${name}\t${value('ordinary', name)}\t${value('s', name)}\t${value('l', name)}`
	),
	'',
].join('\n');
const output = path.join(root, 'expected-tokens.txt');
if (process.argv.includes('--write')) fs.writeFileSync(output, snapshot);
assert.equal(fs.readFileSync(output, 'utf8'), snapshot, 'Typography review snapshot has drifted.');

const contract = bySize.ordinary.contract;
const data = typographyContractData(contract);
const classMap = Object.fromEntries(
	typographyClassKeys(contract).map((key) => [key, `text--${key}`])
);
const className = new Function(
	'typography',
	typographyClassResolverJavascript().replace('export function', 'function') +
		'\nreturn typographyClassName;'
)(data);
assert.equal(
	className({ role: 'prose' }, classMap),
	className({ role: 'prose', size: 'base' }, classMap)
);

// Supply full scope declarations for this fixture, including dependent aliases.
// Production selector planning remains later work.
const block = (selector, tokens) =>
	`${selector} {\n${tokens.map(({ name, value }) => `  --${name}: ${value};`).join('\n')}\n}`;
const attribute = axes.size.activation.attribute;
const css = [
	block(':root', bySize.ordinary.tokens),
	...axes.size.modes.map((mode) => block(`[${attribute}="${mode}"]`, bySize[mode].tokens)),
	toTypographyCss({ typography: contract }),
].join('\n');
const paragraph = (scope, size, classes = className({ role: 'prose', size }, classMap)) =>
	`<p data-scope="${scope}" data-size="${size}" class="${classes}">Prose</p>`;
const paragraphs = (scope) =>
	Object.keys(typography.roles.prose.sizes)
		.map((size) => paragraph(scope, size))
		.join('');
const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage();
	await page.setContent(`<style>html { font-size: 16px; }\n${css}</style>
		${paragraphs('ordinary')}
		${axes.size.modes.map((mode) => `<section ${attribute}="${mode}">${paragraphs(mode)}</section>`).join('')}
		<section ${attribute}="l"><section ${attribute}="regular">${paragraphs('restored')}</section></section>
		${paragraph('direct', 'base', 'text--prose')}
		${paragraph('direct', 'max', 'text--prose-max')}`);
	const computed = await page.locator('p').evaluateAll((elements) =>
		elements.map((element) => {
			const style = getComputedStyle(element);
			return {
				scope: element.dataset.scope,
				size: element.dataset.size,
				fontSize: parseFloat(style.fontSize),
				fontWeight: style.fontWeight,
				lineHeight: parseFloat(style.lineHeight),
			};
		})
	);
	assert.equal(computed.length, 27);
	const expected = { min: 12, s: 14, base: 16, l: 18, max: 20 };
	for (const row of computed) {
		const expectedSize = expected[row.size] + (row.scope === 's' ? -1 : row.scope === 'l' ? 1 : 0);
		assert.equal(row.fontSize, expectedSize, `${row.scope}/${row.size}`);
		assert.equal(row.fontWeight, '400');
		assert.ok(
			Math.abs(row.lineHeight - expectedSize * typography.roles.prose.sizes[row.size].lineHeight) <
				0.01
		);
	}
} finally {
	await browser.close();
}
console.log('PASS: 37 stable tokens, ordinary/regular/s/l, scalar weight, and five role sizes.');
console.log(
	'PASS: existing class resolver and browser consumption, including nested regular restoration (27 cases).'
);
console.log(
	'Review evidence only: adapted input and explicit scopes, no new compiler or physical-font certification.'
);
