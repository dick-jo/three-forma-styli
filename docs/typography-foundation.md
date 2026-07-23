# Typography foundation

Status: active development on `codex/typography-system`. Reviewable locally;
not published and not wired into Scatter.

## Contract

Typography has two independent layers:

1. Atomic typography modes generate the permanent `--fs-min` and
   `--fs-1` through `--fs-{range}` primitives.
2. Arbitrarily named semantic roles combine a font, an unsuffixed base recipe,
   optional role-local variants, and an intentionally exposed weight/style set.

Core has no built-in `prose`, `heading`, `label`, `min`, `s`, `l`, or `max`
vocabulary. Those are visible opinions in the default theme. A project can use
`reading`, `display`, `control`, or any CSS-safe names instead.

The base is deliberately unsuffixed:

```css
--text-prose-font-size: var(--fs-2);
--text-prose-line-height: 1.25;
--text-prose-letter-spacing: 0;

--text-prose-s-font-size: var(--fs-1);
--text-prose-s-line-height: 1.3;
--text-prose-s-letter-spacing: 0.005em;
```

The semantic namespace defaults to `text` for both tokens and global helpers:
`--text-prose-*` pairs with `.text--prose`. TFS owns the `-` and `--`
separators. Setting the generator's `prefixes.typographyRole` changes both
defaults; `typographyCss.classPrefix` is an explicit class-only override.

There is no public `base`, `m`, or `default` variant. Absence of a variant means
the role's base.

## Explicit authoring kernel

```ts
import { defineTypography } from '@three-forma-styli/core';

export const typography = defineTypography({
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: {
				unit: 'rem',
				base: 0.75,
				min: 0.625,
				increment: 0.125,
				range: 12,
			},
		},
	],

	fonts: {
		sans: {
			family: 'system-ui',
			fallbacks: ['sans-serif'],
			verification: 'unavailable',
		},
	},

	roles: {
		reading: {
			font: 'sans',
			base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
			variants: {
				compact: { fontSize: 1, weight: 'min', lineHeight: 1.3, letterSpacing: 0.005 },
				display: { fontSize: 5, weight: 'max', lineHeight: 1.05, letterSpacing: -0.015 },
			},
			weights: { min: 300, lo: 400, max: 700 },
		},
	},
});
```

`defineTypography()` is a literal-preserving identity helper. It improves
TypeScript errors for font IDs and caller vocabulary; it derives nothing and
adds no hidden policy.

Every recipe is a complete size/weight/line-height/tracking tuple. `weight`
references an arbitrary alias in that role's intentional `weights` map; there is
no hidden role-wide default alias. `fontSize` references the atomic scale, line
height is unitless, and numeric `letterSpacing` is emitted
in `em` so it follows the selected size. Roles deliberately exclude color,
margin, and layout. Presentational `textTransform` may be set on a role and
overridden by its base or a particular variant; it never rewrites source text.
Generated CSS uses font longhands because the `font` shorthand resets related
properties that TFS does not necessarily own.

## Optional mode-specific calibration

Atomic typography modes normally change `--fs-*` while semantic recipes retain
their authored tuple. A genuinely different context—such as fixed-canvas display
graphics—can opt into explicit role-local tuple changes without creating another
role vocabulary:

```ts
heading: {
  // base, variants, weights, and font omitted here
  modeOverrides: {
    display: {
      base: { fontSize: 6, lineHeight: 0.85, letterSpacing: -0.02 },
      variants: {
        max: { fontSize: 12, weight: 'max', lineHeight: 0.8 },
      },
    },
  },
}
```

The mode must exist in `typography.modes` and must not be the default mode.
Variant and weight aliases must already exist on the role. Overrides may change
only the four composite tuple fields; TFS preserves every omitted decision and
does not derive an aesthetic calibration from font metrics.

## Optional anchor derivation

`deriveTypographyRange()` removes repetitive interpolation without becoming a
second hidden model. The caller supplies the scale, arbitrary anchor names,
arbitrary derived names, and exact order. It returns the ordinary
`{ base, variants, displayOrder }` shape used above. `displayOrder` is role-local
presentation metadata; it does not change token names, cascade order, or
component semantics.

```ts
const readingRange = deriveTypographyRange({
	scale,
	order: ['min', 's', 'base', 'l', 'max'],
	anchors: {
		min: { fontSize: 'min', weight: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
		base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
		max: { fontSize: 4, weight: 'lo', lineHeight: 1.2, letterSpacing: -0.005 },
	},
	derived: {
		s: { between: ['min', 'base'], weight: 'lo' },
		l: { between: ['base', 'max'] },
	},
});
```

Font size, line height, and tracking are interpolated. Weight, OpenType features,
variation settings, kerning, and optical-sizing policy are not interpolable. If
the two anchors select different weights, the derived point must declare `weight`;
when their other settings disagree, it must declare `settings`. TFS never silently
chooses one side.

## Default theme versus core

The quickest supported starting point is the default theme. Its complete
typography data lives in
[`packages/themes/src/default/typography.ts`](../packages/themes/src/default/typography.ts):

- one twelve-step 14px application scale;
- explicit system sans and mono stacks;
- explicit `prose`, `heading`, and `label` ranges;
- visible anchor derivation calls;
- role-local weight choices.

Copy or import that theme when those opinions fit. Editing the file changes the
theme, not the core engine. The earlier coupled `small/default/large` proof of
concept remains isolated under `@three-forma-styli/themes/legacy`.

Atomic typography modes are still supported. A `compact` mode can change every
`--fs-*` value while semantic roles keep stable references. TFS does not couple
that density mechanism to spacing modes or invent radically different semantic
role schedules.

## Font facts versus design-system decisions

Prepared font data answers factual questions:

- which upright, italic, and oblique faces exist;
- exact static weights or variable ranges;
- OpenType features and variable axes;
- file identity, metrics, coverage, embedding flags, and warnings.

Roles answer design questions:

- which font owns a role;
- which supported weights and styles the system intentionally exposes;
- which role-local weight alias each complete recipe selects;
- the base and variant size/line-height/tracking decisions.

TFS never maps a missing requested weight to the nearest available cut. A role
asking for JetBrains Mono 300 when the prepared face exposes only 400 and 500
fails with the requested path and available cuts. `min` and `max`, when used as
aliases, must be the actual endpoints of that role's exposed set; no fixed alias
schedule is required.

Font verification is explicit:

- `verification: 'prepared'` requires authoritative capabilities and is produced
  by `fontFromManifest()`.
- `verification: 'unavailable'` is an explicit escape hatch for system or
  externally managed stacks. The specimen labels it unverified. It cannot claim
  italic, feature, or custom-axis validation.

Adding a face to a font file does not expose it in the design system. Each role
declares valid style/weight combinations. Generated CSS emits only complete
combination helpers such as `.text--prose-style-italic-weight-lo`; it does not
publish independent helpers that can be composed into an invalid pair.

## Font preparation

`tfs fonts inspect` reports identity, faces, ranges, axes, metrics, features,
coverage, embedding metadata, and warnings.

`tfs fonts prepare ./fonts.config.ts`:

- copies WOFF/WOFF2 sources or performs deterministic FontTools WOFF2 conversion
  for TTF/OTF sources by default; an explicit strategy remains available;
- requires explicit web-embedding and transformation attestations;
- never subsets implicitly;
- rejects ambiguous overlapping faces and duplicate CSS family ownership;
- converts OpenType's static oblique-angle sign to the CSS convention and emits
  the exact `font-style: oblique <angle>` descriptor;
- verifies that conversion preserved style, ranges, axes, features, coverage,
  metrics, and embedding flags;
- emits correct `@font-face` longhands, copied license text, and manifest schema 2;
- records the exact FontTools version, Python implementation/version, and
  executable command only when it actually converts TTF/OTF bytes;
- stages and commits its managed output atomically.

Copy-only WOFF/WOFF2 preparation does not resolve, execute, or mention
FontTools. This keeps normal builds and committed-output validation independent
of Python. Conversion provenance deliberately excludes absolute executable
paths and timestamps, so otherwise identical output does not depend on a
checkout or virtual-environment location.

`fontFromManifest()` checks the schema and manifest consistency before converting
raw face facts into the core validation shape. It does not derive semantic weight
aliases.

Variable `ital`/`slnt` axes and multiple overlapping static oblique angles are
rejected for now because role selections do not yet expose an angle axis. This is
an explicit limitation, not a silent flattening to synthetic italic.

License checks are technical guardrails, not legal clearance. The project owner
must confirm redistribution, serving, conversion, and subsetting rights.

## One-command project build

The normal portable workflow keeps font sources, typography intent, and outputs
in `tfs.config.ts`, then runs:

```sh
tfs build .
```

The compiler executes:

```text
load config
→ inspect/prepare fonts
→ bind the in-memory manifest
→ strictly validate typography
→ generate every requested artifact in a sibling stage
→ hash the result
→ replace only the TFS-owned output directory
```

Top-level project fonts and embedded `system.typography.fonts` are mutually
exclusive. Semantic CSS/TypeScript outputs automatically include their required
token CSS, and `build.manifest.json` records artifact dependencies.

Prepared faces can be placed in three explicit ways:

```ts
output: {
	fontAssets: {
		directory: 'fonts',
		urls: { mode: 'relative' }, // portable default
		// urls: { mode: 'public', prefix: '/fonts' },
		// urls: { mode: 'absolute', prefix: 'https://cdn.example/fonts' },
	},
	css: {
		file: 'tokens.css',
		selectors: {
			root: ':root',
			colorMode: '[data-color-mode="{mode}"]',
			sizeMode: '[data-size-mode="{mode}"]',
		},
	},
	typographyCss: {
		file: 'typography.css',
		classPrefix: 'text', // TFS owns the `--` separator
		specificity: 'class', // class | zero (:where)
		fontFaces: 'include', // include | separate | none
	},
	systemTypescript: true,
}
```

Mode selectors are project output policy and remain independent. Optional
author-owned mode metadata (for example `label` and `polarity`) is preserved in
`system.generated.ts` beside authored source values and resolved CSS values.

`include` is the project default: `@font-face` blocks appear first in
`typography.css`, with URLs re-rendered relative to that exact file. `separate`
keeps faces in `fonts/fonts.css` and lets `index.css` import both artifacts.
`none` is the escape hatch for framework-owned loading. TFS never concatenates
a stylesheet containing stale relative URLs.

A portable output can contain:

```text
dist/
├── index.css
├── tokens.css
├── system.generated.ts
├── typography.css
├── typography.generated.module.css
├── typography.generated.module.css.d.ts
├── typography.generated.ts
├── typography.specimen.html
├── fonts/
│   ├── fonts.css
│   ├── fonts.manifest.json
│   ├── *.woff2
│   └── licenses/
├── figma/
│   ├── colors.dtcg.json
│   └── variables.json
└── build.manifest.json
```

DTCG and Figma JSON are currently color-only; the build manifest states that
limitation. DTCG is the Design Tokens Community Group interchange format.

## Calibration specimen

The generated HTML is a calibration workbench, not a second source of truth. It
shows every role base and variant, every permitted style/weight combination,
wrapping and glyph stress, light/dark surfaces, font readiness, prepared-font
warnings, rendered baseline/CSS `1cap`/CSS `1ex` diagnostics, a WCAG
text-spacing stress mode, and explicit primary/adjusted/unadjusted fallback
states. It sets `font-synthesis: none`.

Interactive controls adjust font-size references, line height, and tracking in
memory. Double-clicking either slider resets that value; the accessible
`Reset recipe` button restores the whole tuple and removes inline overrides. The
page produces a copyable minimal configuration fragment; it never
edits source or generated CSS. Set `output.specimen.interactive: false` for a
static evidence artifact.

Metrics drive inspectable adjusted fallback faces, but they cannot determine
aesthetically correct UI density or make unlike glyph shapes identical. Final
line height, tracking and observed swap behavior still require visual calibration. See
[`typography-fallback-metrics.md`](./typography-fallback-metrics.md).

## Framework boundary

TFS emits tokens, framework-neutral helpers, a CSS Module with literal
declarations, and a typed TypeScript contract. It does not ship a React runtime.
A future Scatter `<Text>` component can consume the generated contract with
`variant` optional:

```tsx
<Text role="prose">Ordinary text</Text>
<Text role="heading" variant="max">Display heading</Text>
<Text role="label" fontStyle="italic" weight="lo">Status</Text>
```

Components such as `Button` may own a default selection internally. Explicitly
nesting `Text` is not inherently wrong; the risk is making every caller rebuild a
decision the component should keep consistent.

## Research anchors

- [Radix Themes typography](https://www.radix-ui.com/themes/docs/theme/typography)
- [DTCG typography composite](https://www.designtokens.org/tr/2025.10/format/#typography)
- [CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/)
- [WCAG text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
