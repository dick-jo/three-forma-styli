# Three-Forma-Styli

**TypeScript-first design-system generator with native OKLCH color support and explicit palette constraints**

Generate portable CSS, fonts, typed contracts, design-tool data, and review artifacts
from compact TypeScript-defined design systems. Built for deterministic handoff,
strict user-authored runtime themes, and ergonomic developer experience.

## Philosophy

1. **Luminance-First Design** - Explicit OKLCH-L separation controls palette hierarchy while hue and chroma remain flexible.
2. **Alpha-Based Variations** - Instead of generating solid color variants (blue-100, blue-200...), use alpha/transparency variants of base colors.
3. **Ergonomic Abstraction** - Limit choices to enforce consistency. Spacing scales, gap shortcuts, and semantic naming reduce decision fatigue.
4. **Runtime Theming** - CSS custom properties enable theme switching without page reload.

## Quick Start

```bash
# Run the published CLI once; the scaffold installs its own local copy
npx @three-forma-styli/cli init my-design-system
cd my-design-system

# Edit your theme files (with full TypeScript IntelliSense)
# Then generate the configured portable dist/ directory and prove it is current
npm run generate
npm run check

# A targeted single-file build can emit one format
tfs build ./index.ts --format dtcg --output tokens.json
```

For a co-located monorepo package instead of a standalone handoff:

```bash
npx @three-forma-styli/cli init design-system --workspace-package
cd design-system
npm run generate          # explicit authoring operation
npm run check             # fast types + committed package validation
npm run check:generated   # dedicated byte-for-byte CI proof
```

Display-P3 Figma files are supported explicitly. The selected color space must
match the target file profile:

```bash
tfs build ./index.ts --format figma-variables --color-space display-p3 --output figma.json
tfs figma-sync . --file-key "$FIGMA_FILE_KEY" --color-space display-p3
```

The sync command uses Figma's Variables REST API, which currently requires an
Enterprise organization, an eligible full seat, edit access, and a token with
both `file_variables:read` and `file_variables:write` scopes. Run with
`--dry-run` to inspect the atomic payload without a token or network write.

## Packages

| Package                       | Description                               |
| ----------------------------- | ----------------------------------------- |
| `@three-forma-styli/core`     | Core library for generating design tokens |
| `@three-forma-styli/compiler` | Node project and font compiler            |
| `@three-forma-styli/cli`      | CLI tool (`tfs` command)                  |
| `@three-forma-styli/themes`   | Starter/reference themes                  |

The private Svelte review application lives under `apps/preview`; it is repository
tooling, not a published package or consumer dependency. Installing the CLI/core
does not install or bundle Svelte.

The public packages share a coordinated release version and are verified as
packed artifacts—including an external TypeScript consumer—before publishing.
See [the package architecture](docs/package-architecture.md),
[monorepo integration](docs/monorepo-integration.md),
[validation policy](docs/validation.md), and [release procedure](docs/releasing.md).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT LAYER                                                │
│  User-defined DesignSystem (colors, spacing, typography...) │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  GENERATOR LAYER                                            │
│  Applies opinionated rules to expand inputs into full       │
│  token system. Produces Intermediate Representation (IR).   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TRANSFORM LAYER                                            │
│  Converts IR to output formats: CSS, TypeScript, JSON, etc. │
└─────────────────────────────────────────────────────────────┘
```

## Token Families

### Colors

Define root colors, get alpha variants automatically:

```typescript
colors: {
  modes: [{
    name: 'dark',
    isDefault: true,
    tokens: {
      bg: oklch(0.15, 0, 0),        // Page background
      ev: oklch(0.20, 0.01, 285),   // Elevated surfaces
      primary: oklch(0.70, 0.15, 250),
      neutral: oklch(0.60, 0.02, 270),
      ink: oklch(0.90, 0.02, 270),  // Text/icons
      positive: oklch(0.70, 0.18, 145),
      negative: oklch(0.65, 0.20, 15)
    }
  }],
  alphaSchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 }
}
```

**Output:**

```css
--clr-bg: oklch(0.15 0 0);
--clr-bg-a-min: oklch(0.15 0 0 / 0.07);
--clr-bg-a-lo: oklch(0.15 0 0 / 0.25);
--clr-bg-a-hi: oklch(0.15 0 0 / 0.75);
--clr-bg-a-max: oklch(0.15 0 0 / 0.93);
/* ... same for all colors */
```

### Spacing

Range-based generation with multiplicative increments:

```typescript
spacing: {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'px', base: 8, min: 4, range: 12 },
		},
	];
}
```

**Output:** `--sp-min: 4px`, `--sp-1: 8px`, `--sp-2: 16px`, ... `--sp-12: 96px`

### Gap

Semantic shortcuts that reference spacing:

```typescript
gap: {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { min: 'min', s: 1, l: 2, max: 3 }, // References sp-min, sp-1, sp-2, sp-3
		},
	];
}
```

**Output:** `--gap-min: 4px`, `--gap-s: 8px`, `--gap-l: 16px`, `--gap-max: 24px`

### Typography

Typography has an atomic foundation and a semantic layer. Atomic modes generate
the permanent `--fs-*` scale. Arbitrarily named roles then define one unsuffixed
base recipe and any role-local variants the project actually needs:

```typescript
const typography = {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'rem', base: 0.75, min: 0.625, increment: 0.125, range: 12 },
		},
		{
			name: 'display',
			tokens: { unit: 'rem', base: 1.5, min: 1, increment: 0.5, range: 12 },
		},
	],
	fonts: {
		sans: { family: 'system-ui', fallbacks: ['sans-serif'], verification: 'unavailable' },
	},
	roles: {
		prose: {
			font: 'sans',
			base: { fontSize: 2, weight: 'lo', lineHeight: 1.25, letterSpacing: 0 },
			variants: {
				s: { fontSize: 1, weight: 'min', lineHeight: 1.3, letterSpacing: 0.005 },
				l: { fontSize: 3, weight: 'lo', lineHeight: 1.225, letterSpacing: -0.0025 },
			},
			modeOverrides: {
				display: {
					base: { fontSize: 4, weight: 'hi', lineHeight: 0.9 },
					variants: { l: { fontSize: 7, lineHeight: 0.85, letterSpacing: -0.01 } },
				},
			},
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
		},
	},
};
```

**Output:** atomic sizes such as `--fs-min` and `--fs-1` through `--fs-12`,
plus an unsuffixed semantic tuple such as `--text-prose-font-size` and
`--text-prose-font-weight`, and optional
variant tuples such as `--text-prose-s-line-height`.

The default theme contains inspectable `prose`, `heading`, and `label` opinions.
Core does not know those names. `deriveTypographyRange()` can interpolate repetitive
size/line-height/tracking points from explicit anchors. Weight is a required,
non-interpolable choice on every recipe. The helper's result is the same
visible `base`/`variants` data and it never invents font roles or weight aliases.

For a complete movable handoff, define a project and run `tfs build .`. Project
mode prepares licensed local fonts, resolves their real capabilities, then stages
CSS, typed system/mode and typography contracts, helper classes, a specimen,
JSON interchange, and a hashed ownership manifest before replacing the output directory once. See
`examples/project/tfs.config.ts`.

Run `tfs check .` in dedicated CI to perform that same complete build in a
private sibling stage and reject missing, changed, or unexpected committed
artifacts without modifying them. `tfs init --workspace-package` scaffolds the
package exports and separates this heavier regeneration proof from routine
monorepo checks. `tfs validate .` is the lightweight routine path: it verifies
the committed manifest, artifact bytes, and package wiring without FontTools or
regeneration.

Review that generated specimen over localhost with `tfs specimen serve .`.
Pass `--open` only when the CLI should launch the browser; use `--port 4400`
when a fixed review port is required.

Prepared `sans` and `mono` project fonts can also receive automatic
per-style/per-weight adjusted fallback faces for physical upright and italic
cuts. Those faces are generated from exact font instances. The factual
`fonts/fallbacks.manifest.json` records inputs, measurements, profile provenance
and warnings without inventing an approval lifecycle.

Prepared custom fonts provide authoritative face capabilities. Roles explicitly
choose supported weights and styles; unavailable cuts fail instead of being
silently remapped. See [the typography foundation](docs/typography-foundation.md).

### Border & Time

Similar patterns for border radius/width and timing values.

## Luminance Constraints

Validate intentional perceptual separation between palette groups:

```typescript
import { validateLuminance } from '@three-forma-styli/core';

const result = validateLuminance(colors, {
	polarity: 'negative', // dark background, light foreground
	minDelta: 0.4, // minimum OKLCH-L separation
	backgroundColors: ['bg', 'ev'],
	foregroundColors: ['primary', 'neutral', 'ink'],
});

// Returns per-color diagnostics
// result.colors.bg.headroom = 0.15  (positive = safe margin)
// result.colors.ink.headroom = -0.05 (negative = constraint violation)
```

TFS preserves the established `luminance` product vocabulary, while every
diagnostic identifies the actual metric as `oklch-l`. This is not WCAG relative
luminance, a contrast ratio, or an accessibility-conformance result. A future
WCAG diagnostic must remain separate rather than silently changing this model.

## Mode Categories

Modes are grouped into categories with separate CSS selectors:

| Category | Token Families                   | Selector                  |
| -------- | -------------------------------- | ------------------------- |
| `color`  | colors                           | `[data-color-mode="..."]` |
| `size`   | spacing, gap, typography, border | `[data-size-mode="..."]`  |

Typography may define multiple atomic size modes just like spacing. Semantic roles
continue to reference the stable `--fs-*` names, so a compact mode can alter the
atomic scale without coupling density to a second set of role names.

Size-mode participation is family-selective. A fixed-canvas `display` mode may
override typography alone, while a responsive `small` mode can coordinate
spacing, gaps, typography, radii, and borders under the same selector. TFS emits
only the families that explicitly author that mode; it never invents companion
overrides.

When semantic typography roles are present, each typography mode also rebinds
their `--text-*-font-size` aliases within the mode selector. This is required by
CSS custom-property inheritance: overriding only `--fs-*` on a descendant does
not retarget an alias that was inherited after resolving in `:root`.

When scaling the atomic ramp is insufficient, a role may explicitly author
`modeOverrides` for any non-default typography mode. Each override is a partial
tuple: omitted fields retain the role recipe, while authored `fontSize`,
`weight`, `lineHeight`, or `letterSpacing` values are emitted only inside that
mode selector. Mode and variant names are validated; TFS never guesses which
roles should tighten, grow, or become heavier.

Time values are scales, not modes. Every authored scale is emitted into `:root`
at once: the default scale produces `--t-*`, while an additional `ambient`
scale produces `--t-ambient-*`. They never create a selector or compete for one
active state.

## Programmatic Usage

For build tools and trusted authoring processes that need the complete design
system IR:

```typescript
import { generate, toCss, oklch } from '@three-forma-styli/core';
import type { DesignSystem } from '@three-forma-styli/core';

const system: DesignSystem = {/* ... */};
const css = toCss(generate(system));
```

Do not ship that complete generator just to process saved end-user colours in a
browser. Use the strict, tree-shakeable runtime boundary instead:

```typescript
import { generateRuntimeColorTheme } from '@three-forma-styli/core/runtime';

const result = generateRuntimeColorTheme(untrustedThemeData, runtimePolicy);
```

It accepts one exact serializable shape, rejects hostile or malformed data, emits
native OKLCH custom properties, and returns explicitly identified OKLCH-L
diagnostics. The release gate executes this path from packed npm and generated
package tarballs in Chromium; compiler, font, CLI, and Culori code must not enter
that browser bundle.

### Partial Generation

Generate only specific token families (e.g., for theme overlays):

```typescript
import { generate, toCss } from '@three-forma-styli/core';
import type { PartialDesignSystem } from '@three-forma-styli/core';

// Only generate colors - no spacing, typography, etc.
const colorOverlay: PartialDesignSystem = {
	colors: {/* ... */},
};

const css = toCss(generate(colorOverlay));
```

## Configuration

Customize token prefixes and selectors:

```typescript
const config = {
	prefixes: {
		color: 'c', // --c-primary instead of --clr-primary
		spacing: 's', // --s-1 instead of --sp-1
		typographyRole: 'copy', // --copy-prose-* and .copy--prose
	},
	selectors: {
		root: ':root',
		colorMode: '[data-theme="{mode}"]',
	},
};

const css = toCss(generate(system, config), config);
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm --filter @three-forma-styli/core test
```

See [docs/releasing.md](docs/releasing.md) for the npm release and production
consumer update procedure.

Current implementation references:

- [Overnight hardening handoff](docs/overnight-hardening-2026-07-22.md)
- [Verified implementation state](docs/audit-2026-07-22.md)
- [Typography foundation](docs/typography-foundation.md)
- [Typography fallback metrics](docs/typography-fallback-metrics.md)
- [Validation and failure policy](docs/validation.md)
- [Industry workflow benchmark](docs/industry-workflow-benchmark.md)
- [Scatter source reconciliation](docs/scatter-source-reconciliation.md)

## Design Decisions

**Why "ev" instead of "surface"?** Shorter for hand-coding. Emphasizes z-index relationship (elevation above background).

**Why alpha variants instead of solid color scales?** Fewer tokens, consistent relationships, works with any base color.

**Why multiplicative spacing but additive typography?** Spacing needs harmonic ratios (8, 16, 24...). Typography needs consistent visual steps (14px, 16px, 18px...).

**Why resolve gap to values (not var references)?** Simpler debugging in devtools. No dependency chain issues across mode selectors.

## License

ISC
