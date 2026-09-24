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
const { validatePartialDesignSystem } = load(path.join(core, 'generator/validate.ts'));
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

// Focused Group companion: execute existing resolution/validation, not a new compiler.
const { colors: groupColors } = load(path.join(root, 'groups/color.ts'));
const { colorGroups: expectedGroups } = load(path.join(root, 'groups/expected-groups.ts'));
const groupIdentities = Object.keys(groupColors.tokens);
assert.deepEqual(resolveIdentityGroups(groupIdentities, groupColors.groups), expectedGroups);
assert.deepEqual(expectedGroups, {
	glow: ['pri', 'neu'],
	network: ['network-base', 'network-optimism'],
});
assert.deepEqual(
	resolveIdentityGroups(
		[...groupIdentities, 'network-new', 'networking', 'Network-capital'],
		groupColors.groups
	),
	{ ...expectedGroups, network: [...expectedGroups.network, 'network-new'] }
);
assert.deepEqual(resolveIdentityGroups([...groupIdentities].reverse(), groupColors.groups), {
	glow: expectedGroups.glow,
	network: [...expectedGroups.network].reverse(),
});

// Adapt only this complete ordinary palette to the existing validator's legacy input.
const groupSystem = {
	alpha,
	colors: {
		modes: [{ name: 'ordinary', isDefault: true, tokens: groupColors.tokens }],
		groups: groupColors.groups,
	},
};
validatePartialDesignSystem(groupSystem);
const invalidGroups = [
	[{ glow: { identities: ['missing'] } }, /unknown color identity "missing"/],
	[{ glow: { identities: [] } }, /non-empty unique list/],
	[{ glow: { identities: ['pri', 'pri'] } }, /non-empty unique list/],
	[{ network: { match: { prefix: 'absent-' } } }, /does not match any color identity/],
	[{ glow: { identities: ['pri'], match: { prefix: 'pri' } } }, /exactly one/],
	[{ 'bad name': { identities: ['pri'] } }, /identity is not CSS-token safe/],
	[{ network: { match: { prefix: 'network_*' } } }, /CSS-token-safe prefix/],
];
for (const [groups, error] of invalidGroups) {
	assert.throws(
		() =>
			validatePartialDesignSystem({ ...groupSystem, colors: { ...groupSystem.colors, groups } }),
		error
	);
}
const groupGenerator = {
	prefixes: { color: 'clr' },
	colorFormat: { base: 'oklch', alpha: 'oklch', alphaModifier: 'a' },
};
const groupedTokens = generateColorTokens(groupSystem.colors, groupGenerator, schedule);
assert.deepEqual(
	groupedTokens,
	generateColorTokens({ modes: groupSystem.colors.modes }, groupGenerator, schedule)
);
assert.equal(groupedTokens.defaultTokens.length, 32);

// Luminance companion: same colours, different explicitly requested operations.
const { colors: ordinaryColors } = load(path.join(root, 'luminance/color.ts'));
const { runtimeColorThemeConfig } = load(path.join(root, 'luminance/runtime-contract.ts'));
const { customerTheme, correctedTheme } = load(path.join(root, 'luminance/customer-theme.ts'));
const { generateRuntimeColorTheme, enforceRuntimeColorTheme } = load(
	path.join(core, 'runtime/theme.ts')
);
const { RuntimeLuminanceConstraintError, RuntimeColorThemeValidationError } = load(
	path.join(core, 'runtime/types.ts')
);
const ordinarySystem = {
	alpha,
	colors: { modes: [{ name: 'ordinary', isDefault: true, tokens: ordinaryColors.tokens }] },
};
validatePartialDesignSystem(ordinarySystem);
const ordinaryGenerated = generateColorTokens(ordinarySystem.colors, groupGenerator, schedule);
const ordinaryProperties = Object.fromEntries(
	ordinaryGenerated.defaultTokens.map(({ name, value }) => [`--${name}`, value])
);
const declaredPolicySystem = {
	...ordinarySystem,
	colors: { ...ordinarySystem.colors, luminance: runtimeColorThemeConfig.luminance },
};
validatePartialDesignSystem(declaredPolicySystem);
assert.deepEqual(
	generateColorTokens(declaredPolicySystem.colors, groupGenerator, schedule),
	ordinaryGenerated
);

const preview = generateRuntimeColorTheme(customerTheme, runtimeColorThemeConfig);
assert.deepEqual({ ...preview.customProperties }, ordinaryProperties);
assert.equal(Object.keys(ordinaryProperties).length, 40);
assert.equal(preview.luminance.metric, 'oklch-l');
assert.equal(preview.luminance.deltaValid, false);
assert.equal(preview.luminance.actualDelta, 0.2);
assert.equal(preview.luminance.requiredDelta, 0.33);
assert.equal(preview.luminance.foregroundConstraint, 0.63);
assert.equal(preview.luminance.colors.pri.headroom, -0.13);
assert.equal(preview.theme.colors.pri.l, 0.5, 'Preview must not correct the supplied colour.');
let rejection;
assert.throws(
	() => enforceRuntimeColorTheme(customerTheme, runtimeColorThemeConfig),
	(error) => {
		rejection = error;
		return (
			error instanceof RuntimeLuminanceConstraintError && error.result.luminance.actualDelta === 0.2
		);
	}
);
const accepted = enforceRuntimeColorTheme(correctedTheme, runtimeColorThemeConfig);
assert.equal(accepted.luminance.deltaValid, true);
assert.equal(accepted.luminance.actualDelta, 0.33);
assert.equal(accepted.luminance.colors.pri.headroom, 0);
assert.deepEqual(accepted.theme.colors.pri, correctedTheme.colors.pri);
assert.deepEqual(
	Object.keys(ordinaryProperties).filter(
		(name) => ordinaryProperties[name] !== accepted.customProperties[name]
	),
	Object.keys(ordinaryProperties).filter(
		(name) => name === '--clr-pri' || name.startsWith('--clr-pri-a-')
	)
);

// Inverting lightness gives a light-background palette with the same exact gap.
const positiveTheme = {
	polarity: 'positive',
	colors: Object.fromEntries(
		Object.entries(correctedTheme.colors).map(([name, color]) => [
			name,
			{ ...color, l: 1 - color.l },
		])
	),
};
assert.equal(
	enforceRuntimeColorTheme(positiveTheme, runtimeColorThemeConfig).luminance.actualDelta,
	0.33
);
const { ink: omittedInk, ...incompleteColors } = customerTheme.colors;
assert.throws(
	() =>
		generateRuntimeColorTheme(
			{ ...customerTheme, colors: incompleteColors },
			runtimeColorThemeConfig
		),
	(error) => error instanceof RuntimeColorThemeValidationError && error.path === 'theme.colors.ink'
);
const { luminance: omittedPolicy, ...withoutPolicy } = runtimeColorThemeConfig;
assert.throws(
	() => generateRuntimeColorTheme(customerTheme, withoutPolicy),
	/config.luminance.minimumLuminanceDelta must be a finite number/
);
// Existing generated metadata does not choose which runtime function is called.
assert.equal(
	generateRuntimeColorTheme(customerTheme, { ...runtimeColorThemeConfig, enforce: ['luminance'] })
		.luminance.deltaValid,
	false
);
assert.throws(
	() => enforceRuntimeColorTheme(customerTheme, { ...runtimeColorThemeConfig, enforce: [] }),
	RuntimeLuminanceConstraintError
);

const luminanceSnapshot = [
	'REVIEW EVIDENCE — existing core functions; no new compiler or runtime API.',
	'Ordinary generation: no policy required; 40 Color variables.',
	`Runtime preview: metric=${preview.luminance.metric}; gap=${preview.luminance.actualDelta}; required=${preview.luminance.requiredDelta}; passes=${preview.luminance.deltaValid}.`,
	`Acceptance before edit: ${rejection.name}: ${rejection.message}`,
	`Acceptance after pri.l = 0.63: gap=${accepted.luminance.actualDelta}; passes=${accepted.luminance.deltaValid}.`,
	'Positive polarity with inverted lightness: same 0.33 gap, accepted.',
	'Missing ink: rejected as malformed input before preview.',
	'Policy-free runtime generation: unsupported today; proposed direction only.',
	'',
	`Before edit: backgrounds L <= ${preview.luminance.backgroundConstraint}; foregrounds L >= ${preview.luminance.foregroundConstraint}.`,
	`After edit: backgrounds L <= ${accepted.luminance.backgroundConstraint}; foregrounds L >= ${accepted.luminance.foregroundConstraint}.`,
	'Colour\tRole\tL before\tHeadroom before\tL after\tHeadroom after',
	...Object.entries(preview.luminance.colors).map(
		([name, diagnostic]) =>
			`${name}\t${diagnostic.group}\t${diagnostic.luminance}\t${diagnostic.headroom}\t${accepted.luminance.colors[name].luminance}\t${accepted.luminance.colors[name].headroom}`
	),
	'',
	'Token\tOrdinary / original runtime preview\tAccepted after customer edit',
	...Object.entries(ordinaryProperties).map(
		([name, value]) => `${name}\t${value}\t${accepted.customProperties[name]}`
	),
	'',
].join('\n');
const luminanceOutput = path.join(root, 'luminance/expected-results.txt');
if (process.argv.includes('--write')) fs.writeFileSync(luminanceOutput, luminanceSnapshot);
assert.equal(
	fs.readFileSync(luminanceOutput, 'utf8'),
	luminanceSnapshot,
	'Luminance review evidence has drifted.'
);
console.log(
	'PASS: complete ordinary palette, Light/Dark choices, both Groups, two Alpha scales, and 94 stable token names.'
);
console.log(
	'PASS: Group companion lists/order, automatic prefix membership, seven invalid inputs, and no extra Color tokens.'
);
console.log(
	'PASS: ordinary/runtime parity, preview diagnostics, explicit enforcement, both polarities, and 40 Color variables before/after the customer edit.'
);
console.log(
	'Review evidence only: no generic-Axis compiler, Shadow helper execution, nested CSS, policy-free runtime implementation, or application integration.'
);
