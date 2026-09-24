/** Browser evidence for this one proposal; not a TFS compiler. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { oklch } from '@three-forma-styli/core';
import ts from 'typescript';

function readMock(name) {
	const source = fs.readFileSync(new URL(name, import.meta.url), 'utf8');
	const js = ts.transpileModule(source, {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
	const module = { exports: {} };
	new Function('module', 'exports', 'require', js)(module, module.exports, (specifier) => {
		assert.equal(specifier, '@three-forma-styli/core');
		return { oklch };
	});
	return module.exports;
}

const { axes } = readMock('axes.ts');
const { colors } = readMock('color.ts');
const attribute = axes.theme.activation.attribute;
assert.equal(Object.hasOwn(axes.theme, 'default'), false);
assert.equal(Object.hasOwn(colors.modes.theme, 'dark'), false);
assert.deepEqual(axes.theme.modes, ['dark', 'light']);
assert.deepEqual(Object.keys(colors.tokens).sort(), ['bg', 'ink', 'shd']);
for (const [mode, entry] of Object.entries(colors.modes.theme)) {
	assert.ok(axes.theme.modes.includes(mode));
	assert.ok(Object.keys(entry.tokens).every((name) => name in colors.tokens));
}

// Expected values come from the two concrete input palettes, not from the CSS.
function expected(mode) {
	const palette = { ...colors.tokens, ...colors.modes.theme[mode]?.tokens };
	return Object.fromEntries(
		Object.entries(palette).map(([name, color]) => [
			`--clr-${name}`,
			`oklch(${color.l} ${color.c} ${color.h})`,
		])
	);
}
const ordinary = expected();
const light = expected('light');
const css = fs.readFileSync(new URL('expected.css', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
let checked = 0;
try {
	const page = await browser.newPage();
	await page.setContent(`<!doctype html><html><body>
		<p id="plain"></p>
		<section id="light" ${attribute}="light">
			<p id="light-child"></p>
			<aside id="dark" ${attribute}="dark">
				<p id="dark-child"></p>
				<div id="light-again" ${attribute}="light"></div>
			</aside>
		</section>
	</body></html>`);
	await page.addStyleTag({ content: css });
	async function check(selector, values) {
		const actual = await page.locator(selector).evaluate((element, names) => {
			const styles = getComputedStyle(element);
			return Object.fromEntries(names.map((name) => [name, styles.getPropertyValue(name).trim()]));
		}, Object.keys(values));
		assert.deepEqual(actual, values, selector);
		checked++;
	}
	async function select(selector, mode) {
		await page.locator(selector).evaluate(
			(element, { attribute, mode }) => {
				if (mode === null) element.removeAttribute(attribute);
				else element.setAttribute(attribute, mode);
			},
			{ attribute, mode }
		);
	}
	for (const mode of [null, 'dark', 'light', null]) {
		await select('html', mode);
		await check('html', mode === 'light' ? light : ordinary);
		await check('#plain', mode === 'light' ? light : ordinary);
		await check('#light', light);
		await check('#light-child', light);
		await check('#dark', ordinary);
		await check('#dark-child', ordinary);
		await check('#light-again', light);
	}
	// Removing an inner selection inherits its parent; it does not mean a reset.
	await select('#dark', null);
	await check('#dark', light);
	await check('#dark-child', light);
	await select('#light', null);
	await check('#light-child', ordinary);
	await check('#dark-child', ordinary);
	await check('#light-again', light);
	assert.ok(
		await page.evaluate(
			(values) => values.every((value) => CSS.supports('color', value)),
			[...Object.values(ordinary), ...Object.values(light)]
		)
	);
} finally {
	await browser.close();
}
console.log(
	`PASS: ${checked} computed palettes (3 tokens each), including document selection, nested scopes, switching, and attribute removal.`
);
console.log(
	'Review fixture only: hand-authored expected CSS; no production compiler or new Axis API implemented.'
);
