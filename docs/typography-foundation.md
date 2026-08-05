# Typography foundation

This document describes the v0.5 public model. Product grammar is ratified in
[`founder-board.md`](./founder-board.md); migration examples live in
[`v05-migration.md`](./v05-migration.md).

## Two layers

1. Atomic font-size modes generate permanent `--fs-min` and `--fs-1…n` scales.
2. Semantic roles couple an authored font, size range, role-local weights,
   styles, settings, and optional categorical variants.

Core owns the structure, not role identities. `prose`, `heading`, and `label`
are visible starter-theme opinions.

## Fixed role grammar

Every role uses `sizes: { min?, s?, base, l?, max? }`. Base is the unsuffixed
consumer selection. The order is fixed and resolved font-size references must
strictly increase. Controlled sparsity preserves honest endpoints: `s` requires
`min`, and `l` requires `max`.

Weights are role-local because numeric font weights are not visually universal.
A role uses either:

- one scalar, such as `weights: 400`; or
- a sparse fixed range using `min / lo / hi / max`, with actual `min` and `max`
  endpoints and an explicit default `weight`.

Each size resolves to a final weight. A size omits `weight` only when it should
inherit the role default.

Categorical `variants` are separate from sizes. They may change weight, style,
line height, tracking, casing, kerning, optical sizing, OpenType features, or
unmanaged variable axes. They cannot change font family or font size.

## Authored example

```ts
import { defineTypography } from '@three-forma-styli/core';

export const typography = defineTypography({
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'rem', base: 0.75, min: 0.625, increment: 0.125, range: 12 },
		},
	],
	fonts,
	roles: {
		heading: {
			font: 'editorial',
			weights: { min: 600, lo: 650, hi: 700, max: 800 },
			weight: 'hi',
			sizes: {
				min: { fontSize: 1, lineHeight: 1.1, letterSpacing: 0 },
				s: { fontSize: 2, lineHeight: 1.05, letterSpacing: -0.005 },
				base: { fontSize: 4, lineHeight: 1, letterSpacing: -0.01 },
				l: { fontSize: 6, lineHeight: 0.95, letterSpacing: -0.0175 },
				max: { fontSize: 8, lineHeight: 0.9, letterSpacing: -0.025, weight: 'max' },
			},
			variants: {
				emphatic: { weight: 'max', letterSpacing: -0.02 },
			},
		},
	},
});
```

`deriveTypographySizes()` may interpolate repetitive size, line-height, and
tracking decisions from explicit anchors. It returns the same exact `sizes`
shape. It never guesses a disputed weight.

## Modes and calibration

Changing an atomic typography mode rebinds stable `--fs-*` identities. Semantic
role composites otherwise remain calibrated. If a context genuinely needs more
than a scale change, a role may author a sparse `modeOverrides[mode].sizes`
patch. Omitted fields retain the resolved role-size decision.

## Font validation

Project builds prepare physical fonts before resolving typography. Requested
styles and weights must exist; OpenType features and variable-axis values must
be supported by the selected physical face. TFS reports capabilities and fails
invalid requests. It does not remap or synthesize a design decision.

## CSS and consumer contract

Generated CSS uses longhands. Base helpers are `.text--{role}`; sizes,
categorical variants, and style/weight capabilities compose as separate class
keys. The generated `./typography` entrypoint exposes:

- literal roles, sizes, variants, styles, and weights;
- discriminated `TypographySelection` types;
- `typographyClassName(selection, classes)` for the generated CSS Module.

Resolution order is role defaults → size → categorical variant → explicit
style/weight. Color, margin, and layout remain caller-owned.

## Visual calibration

The Workbench presents each role and size in every authored mode, physical
style/weight combinations, wrapping stress, metric guides, fallback comparison,
and editable line-height/tracking controls. It is evidence and an authoring aid;
the committed TypeScript source remains the source of truth.
