/** Fixture evidence only: helpers are data-packing stubs, not production implementations. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('./', import.meta.url));
const helpers = {
	cubicBezier: (...value) => ({ type: 'cubicBezier', value }),
	linear: (
		value = [
			[0, 0],
			[1, 1],
		]
	) => ({ type: 'linear', value }),
};
function load(name) {
	const module = { exports: {} };
	const js = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
	new Function('require', 'module', 'exports', js)(
		(specifier) => {
			assert.equal(specifier, './review-helpers.js');
			return helpers;
		},
		module,
		module.exports
	);
	return module.exports;
}

const { time } = load('time.ts');
const { easings } = load('easing.ts');
const { timeInSeconds, directEasing } = load('alternatives.ts');
const expected = {};
assert.ok(time.scales[time.defaultScale]);
for (const [name, scale] of Object.entries(time.scales)) {
	const positions = Object.keys(scale.values);
	assert.deepEqual(positions, ['min', 'lo', 'hi', 'max']);
	const values = Object.values(scale.values);
	assert.ok(values.every((n, i) => Number.isFinite(n) && n >= 0 && (i === 0 || n > values[i - 1])));
	const prefix = name === time.defaultScale ? '--t' : `--t-${name}`;
	for (const [position, value] of Object.entries(scale.values)) {
		expected[`${prefix}-${position}`] = `${value}${scale.unit}`;
	}
}
for (const [name, easing] of Object.entries(easings)) {
	if (easing.type === 'cubicBezier') {
		expected[`--ease-${name}`] = `cubic-bezier(${easing.value.join(', ')})`;
	} else {
		assert.equal(easing.type, 'linear');
		const identity = JSON.stringify(easing.value) === '[[0,0],[1,1]]';
		expected[`--ease-${name}`] = identity
			? 'linear'
			: `linear(${easing.value.map(([input, output]) => `${output} ${input * 100}%`).join(', ')})`;
	}
}
const css = fs.readFileSync(path.join(root, 'expected-tokens.css'), 'utf8');
const actual = Object.fromEntries(
	[...css.matchAll(/^\s*(--[\w-]+):\s*(.+);$/gm)].map(([, name, value]) => [name, value])
);
assert.deepEqual(actual, expected);
assert.equal(Object.keys(actual).length, 12);
assert.deepEqual(directEasing, easings.neu);
for (const [position, seconds] of Object.entries(timeInSeconds.scales.neu.values)) {
	assert.equal(seconds * 1000, time.scales.neu.values[position]);
}

const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage();
	const consumer = fs.readFileSync(path.join(root, 'consumer.css'), 'utf8');
	await page.setContent(`<style>${css}\n${consumer}</style>
		<div class="host motion-example"></div><div class="host ambient-example"></div>`);
	const result = await page.evaluate((tokens) => {
		const motion = getComputedStyle(document.querySelector('.motion-example'));
		const ambient = getComputedStyle(document.querySelector('.ambient-example'));
		return {
			easingsAccepted: Object.entries(tokens)
				.filter(([name]) => name.startsWith('--ease-'))
				.every(([, value]) => CSS.supports('animation-timing-function', value)),
			duration: motion.transitionDuration,
			delay: motion.transitionDelay,
			easing: motion.transitionTimingFunction,
			ambientDuration: ambient.animationDuration,
			ambientEasing: ambient.animationTimingFunction,
			ambientIterations: ambient.animationIterationCount,
		};
	}, actual);
	assert.deepEqual(result, {
		easingsAccepted: true,
		duration: '0.2s',
		delay: '0.05s',
		easing: actual['--ease-pri'],
		ambientDuration: '4s',
		ambientEasing: 'linear',
		ambientIterations: 'infinite',
	});
} finally {
	await browser.close();
}
console.log('PASS: 12 exact token values, helper/direct data parity, and equivalent seconds.');
console.log(
	'PASS: Chromium accepts all four easings and resolves consumer durations, delay and easing.'
);
console.log(
	'Review evidence only: no production Time/Easing generator, constructors, or Workbench implementation.'
);
