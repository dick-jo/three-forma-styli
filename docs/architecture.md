# Three Forma Styli - Architecture

**Last Updated:** 2026-07-21

## Overview

TFS is an opinionated design token generator. It takes user-defined theme inputs and generates consistent, ergonomic design systems across multiple output formats.

### Philosophy

1. **Luminance-First Design** - Explicit OKLCH-L separation controls palette hierarchy while hue and chroma remain flexible.
2. **Alpha-Based Variations** - Instead of generating solid color variants (blue-100, blue-200...), use alpha/transparency variants of base colors.
3. **Ergonomic Abstraction** - Limit choices to enforce consistency. Spacing scales, gap shortcuts, and semantic naming reduce decision fatigue.
4. **Runtime Theming** - CSS custom properties enable theme switching without reloading.

### Three-Layer Architecture

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

---

## Input Layer

### DesignSystem Structure

```typescript
interface DesignSystem {
	colors: ColorSystem;
	spacing: SpacingSystem;
	gap: GapSystem;
	typography: TypographySystem;
	borderRadius: BorderRadiusSystem;
	borderWidth: BorderWidthSystem;
	time: TimeSystem;
}
```

Each token family has **modes** - a default mode plus optional override modes.
Override participation is family-selective: families may share a mode name to
coordinate one selector, but a family is never required to implement every mode
used by another family in the same category.

### Mode Categories

Switchable modes are grouped into categories that share output selectors. Time
scales are deliberately excluded: every authored duration scale exists
simultaneously and does not need a selector.

| Category | Token Families                                      | Purpose                                   |
| -------- | --------------------------------------------------- | ----------------------------------------- |
| `color`  | colors                                              | Light/dark themes, custom color themes    |
| `size`   | spacing, gap, typography, borderRadius, borderWidth | Responsive sizing and fixed-canvas scales |

---

## Token Families

### Colors

**Philosophy:** Alpha-driven variations. User provides root colors, generator creates alpha variants.

**Input:**

```typescript
interface ColorSystem {
	alphaSchedule: AlphaSchedule; // Default for all modes
	modes: ColorMode[];
}

interface ColorMode {
	name: string;
	isDefault?: boolean;
	tokens: Record<string, Oklch>; // Arbitrary color names (not enforced)
	alphaSchedule?: AlphaSchedule; // Override per mode
}

interface AlphaSchedule {
	min: number; // e.g., 0.07
	'lo-x': number; // e.g., 0.125
	lo: number; // e.g., 0.25
	hi: number; // e.g., 0.68
	'hi-x': number; // e.g., 0.85
	max: number; // e.g., 0.93
}
```

**Generation Rules:**

- For each color in `tokens`, generate:
  - Base color: `{prefix}-{name}` (e.g., `--clr-bg`)
  - Alpha variants: `{prefix}-{name}-a-{level}` for each level in schedule

**Conventions (documented, not enforced):**

- Background colors: `bg`, `ev` (elevation)
- Foreground colors: `primary`, `neutral`, `ink`
- Feedback colors: `positive`, `negative`

**Mode Inheritance:**

- Override modes only define colors they want to change
- Missing colors inherit from default mode
- Missing alphaSchedule inherits from default mode or system default

---

### Spacing

**Philosophy:** Range-based generation with multiplicative increments.

**Input:**

```typescript
interface SpacingMode {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string; // 'px' | 'rem'
		base: number; // e.g., 8
		min: number; // e.g., 4
		range: number; // e.g., 12
	};
}
```

**Generation Rules:**

- Formula: `sp-{n} = base * n`
- Generate `--sp-min` = min value
- Generate `--sp-1` through `--sp-{range}`

**Example (base: 8, range: 12):**

```css
--sp-min: 4px;
--sp-1: 8px;
--sp-2: 16px;
--sp-3: 24px;
/* ... */
--sp-12: 96px;
```

---

### Gap

**Philosophy:** Semantic shortcuts on top of spacing. Reduces choices further for common use cases.

**Input:**

```typescript
interface GapMode {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string;
		spacingMode: string; // Reference to spacing mode for resolution
		min: number | 'min'; // Literal value or reference to sp-min
		s: number | 'min'; // Literal value or reference to sp-{n}
		l: number | 'min';
		max: number | 'min';
		// Extensible: user can add more gap tokens
	};
}
```

**Generation Rules:**

- Resolve references (e.g., `s: 1` means use value of `sp-1`)
- Special value `'min'` resolves to `sp-min`
- Output actual computed values (not CSS var references)

**Example:**

```css
--gap-min: 4px;
--gap-s: 8px;
--gap-l: 16px;
--gap-max: 24px;
```

---

### Typography

**Philosophy:** Range-based font sizes with additive increments.

**Input:**

```typescript
interface TypographyMode {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string; // 'rem' | 'px' | 'em'
		base: number; // e.g., 0.875
		min: number; // e.g., 0.625
		increment: number; // e.g., 0.125
		range: number; // e.g., 12
	};
}
```

**Generation Rules:**

- Formula: `fs-{n} = base + ((n - 1) * increment)`
- Generate `--fs-min` = min value
- Generate `--fs-1` through `--fs-{range}`

**Example (base: 0.875, increment: 0.125):**

```css
--fs-min: 0.625rem;
--fs-1: 0.875rem;
--fs-2: 1rem;
--fs-3: 1.125rem;
/* ... */
```

---

### Border Radius

**Philosophy:** Semantic shortcuts like gap. Limit choices for consistency.

**Input:**

```typescript
interface BorderRadiusMode {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string;
		spacingMode: string;
		min: number | 'min';
		s: number | 'min';
		l: number | 'min';
		max: number | 'min';
		// Extensible
	};
}
```

**Generation Rules:** Same as gap - resolve references to actual values.

---

### Border Width

**Philosophy:** Single value for simplicity. Most projects only need one border width.

**Input:**

```typescript
interface BorderWidthMode {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string;
		value: number;
	};
}
```

**Generation Rules:** Generate single `--bdw` variable.

---

### Time

**Philosophy:** Several atomic duration scales may be available simultaneously.
They are namespaces, not switchable modes.

**Input:**

```typescript
interface TimeScale {
	name: string;
	isDefault?: boolean;
	tokens: {
		unit: string; // 'ms' | 's'
		base: number; // e.g., 100
		min: number; // e.g., 50
		range: number; // e.g., 10
	};
}
```

**Generation Rules:**

- The default scale produces `--t-min`, `--t-1`, `--t-2`, ...
- Other scales produce `--t-{scale}-min`, `--t-{scale}-1`, ...
- Formula: `t-{n} = base * n` (same as spacing)

**Example:**

```css
--t-min: 50ms;
--t-1: 100ms;
--t-2: 200ms;
--t-anim-min: 500ms;
--t-anim-1: 1000ms;
```

---

### Motion

**Philosophy:** Semantic, property-agnostic transition fragments derived from
the atomic time scales. TFS decides a consistent duration/easing/delay
vocabulary; each application still decides which selectors and properties
animate.

**Input:**

```typescript
motion: {
  easings: {
    standard: [0.2, 0, 0.38, 0.9],
    enter: [0, 0, 0.38, 0.9],
    exit: [0.2, 0, 1, 0.9],
  },
  recipes: {
    hover: {
      base: { duration: 2, easing: "standard" },
      variants: {
        min: { duration: "min" },
        lo: { duration: 1 },
        hi: { duration: 3 },
        max: { duration: 4 },
      },
      displayOrder: ["min", "lo", "base", "hi", "max"],
    },
  },
}
```

Recipe, variant, and easing names are entirely author-defined. Duration numbers
reference the default time scale; `{ scale: "ambient", step: 2 }` explicitly
references another scale. Variants inherit omitted easing and delay decisions
from their base.

**Output:**

```css
--motion-ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9);
--motion-hover-duration: var(--t-2);
--motion-hover-easing: var(--motion-ease-standard);
--motion-hover-delay: 0ms;
--motion-hover: var(--motion-hover-duration) var(--motion-hover-easing) var(--motion-hover-delay);
```

```css
.control {
	transition:
		color var(--motion-hover),
		box-shadow var(--motion-hover);
}
```

The generated system TypeScript contract also exposes the resolved cubic Bézier
tuple plus duration/delay in milliseconds and seconds for Motion, Framer Motion,
or another JavaScript engine. TFS does not encode CSS property names and does
not emit motion helper classes.

---

### Shadows

**Philosophy:** Ordered, multi-layer semantic effects with explicit author
intent. Box and text families are separate because `text-shadow` has neither
spread nor inset.

```typescript
shadows: {
  unit: "px",
  box: {
    elevation: {
      base: [
        { x: 0, y: 1, blur: 2, color: { color: "shadow", alpha: "lo" } },
        {
          x: 0,
          y: 8,
          blur: 24,
          spread: -4,
          color: { color: "shadow", alpha: "min" },
        },
      ],
      variants: {
        max: [/* complete ordered layers */],
      },
    },
  },
  text: {
    glow: {
      base: [
        { x: 0, y: 0, blur: 10, color: { color: "pri", alpha: "lo" } },
      ],
    },
  },
}
```

The resulting variables are `--shadow-box-elevation`,
`--shadow-box-elevation-max`, and `--shadow-text-glow`. Semantic color
references point at the generated color/alpha variables and therefore follow
color modes. Core assigns no meaning to `elevation`, `glow`, or variant names.

`deriveShadowRange()` only interpolates compatible geometry. Anchors must have
the same ordered layer count, paired layers must agree on inset state, and
different semantic colors require an explicit choice. Workspace projects may
emit global helpers, kebab-case CSS Modules, a typed contract, DTCG 2025.10
shadow composites, and `review/shadows.html`.

---

## Generator Layer

### Generator Config

```typescript
interface GeneratorConfig {
	// Token naming
	prefixes: {
		color: string; // default: 'clr'
		spacing: string; // default: 'sp'
		gap: string; // default: 'gap'
		typography: string; // default: 'fs'
		typographyRole: string; // default: 'text'
		borderRadius: string; // default: 'bdr'
		borderWidth: string; // default: 'bdw'
		time: string; // default: 't'
		motion: string; // default: 'motion'
		shadow: string; // default: 'shadow'
	};
}
```

### Intermediate Representation (IR)

The generator produces a fully-expanded, normalized data structure:

```typescript
interface IR {
	// All default mode tokens
	tokens: Record<string, TokenValue>;

	// Switchable mode metadata
	modes: {
		color: {
			default: string; // Name of default mode
			overrides: string[]; // Names of override modes
		};
		size: {
			default: string;
			overrides: string[];
		};
	};

	// Simultaneously emitted scale metadata
	scales: {
		time: {
			default: string;
			names: string[];
		};
	};

	// Override mode tokens (only tokens that differ from default)
	overrideTokens: {
		[modeName: string]: Record<string, TokenValue>;
	};
}

interface TokenValue {
	family: string; // 'color' | 'spacing' | etc.
	name: string; // Full token name: 'clr-bg', 'sp-1', 'gap-s'
	value: string; // Computed value: '8px', 'oklch(...)'
	rawValue?: number; // Numeric value before formatting (for TS output)
	unit?: string; // 'px', 'rem', 'ms', etc.
	reference?: string; // For gaps: 'sp-1' (what user defined)
	metadata?: {
		isAlphaVariant?: boolean;
		alphaLevel?: string;
		baseColor?: string;
	};
}
```

### Input Validation

Performed at generator entry point:

- DesignSystem must have at least one mode per token family
- Each token family must have exactly one default mode (or first mode is used)
- Alpha values must be between 0 and 1
- Numeric values must be positive
- Required fields must be present

---

## Transform Layer

Each transformer takes the IR and outputs a specific format. Transformer configs are separate from generator config.

### CSS Transformer

**Config:**

```typescript
interface CssTransformerConfig {
	selectors?: {
		root?: string; // default: ':root'
		colorMode?: string; // default: '[data-color-mode="{mode}"]'
		sizeMode?: string; // default: '[data-size-mode="{mode}"]'
	};

	fileHeader?: FileHeaderConfig | false; // default: undefined (no header)
}

interface FileHeaderConfig {
	toolName: string; // e.g., 'three-forma-styli'
	toolVersion: string; // e.g., '0.1.4'
	includeTimestamp?: boolean; // default: false
	customLines?: string[];
}
```

**Output:**

```css
/**
 * Do not edit directly
 * Generated by three-forma-styli v0.1.4
 */

:root {
	/* Default mode tokens */
	--clr-bg: oklch(0.26 0 180);
	--clr-bg-a-lo: oklch(0.26 0 180 / 0.25);
	--sp-1: 8px;
	/* ... */
}

[data-color-mode='light'] {
	/* Color overrides */
	--clr-bg: oklch(0.95 0 180);
}

[data-size-mode='small'] {
	/* Size-related overrides */
	--sp-1: 4px;
	--fs-1: 0.75rem;
}
```

### File Headers

Generated files can optionally include a "Do not edit directly" header comment.

**Design:**

- Header content is **format-agnostic** (string array)
- Each transformer wraps content in format-appropriate comment syntax
- Timestamp is **opt-in** (off by default) to avoid noisy git diffs in CI/CD
- CLI automatically injects tool name and version when header config is provided

**Core utilities (`header.ts`):**

```typescript
interface FileHeaderInfo {
  toolName: string;
  toolVersion: string;
  timestamp?: Date;
  customLines?: string[];
}

type CommentStyle = 'block' | 'line' | 'xml';

// Get raw header lines
getHeaderLines(info: FileHeaderInfo): string[];

// Format as comment block
formatHeaderComment(lines: string[], style: CommentStyle): string;
```

**Example output (CSS):**

```css
/**
 * Do not edit directly
 * Generated by three-forma-styli v0.1.4
 */
```

---

### TypeScript Transformer (Future)

Generates const objects with token values and type definitions.

### DTCG/Figma JSON Transformer

Generates standards-validated DTCG 2025.10 colors, dimensions, durations,
easings, transitions, semantic typography and shadows, or a structured Figma
Variables API color model. CSS-only facts and TFS modes live in a namespaced
extension. The transformer preserves color modes and supports explicit sRGB and
Display-P3 components. Display-P3 output must match the target Figma file
profile.

---

## Constraint Validation

The `validateLuminance` function checks color relationships directly. Projects
may also author reusable groups and a minimum once as `colors.luminance`. A
separate `colors.runtimeThemes.colorNames` list identifies the exact
user-editable subset; static palette members do not silently become runtime
fields. When both policies exist, the workspace compiler emits their shared
contract as `runtime-color-theme` for strict browser theme generation.

Runtime generation has two explicit policies:

- `generateRuntimeColorTheme()` strictly validates input and returns OKLCH-L
  diagnostics even when the separation constraint fails. Use it in editors.
- `enforceRuntimeColorTheme()` performs the same work but raises
  `RuntimeLuminanceConstraintError` when the valid palette violates the
  constraint. Use it before accepting or applying a theme when separation is a
  product invariant.

Malformed untrusted data continues to raise the separate, path-aware
`RuntimeColorThemeValidationError`.

```typescript
import { validateLuminance } from '@three-forma-styli/core';

const result = validateLuminance(colors, {
	polarity: 'negative', // dark bg, light fg
	minimumLuminanceDelta: 0.4,
	backgroundColors: ['bg', 'ev'],
	foregroundColors: ['primary', 'neutral', 'ink'],
});

// Returns per-color diagnostics with headroom values
// result.colors.bg.headroom = 0.15 (positive = safe)
// result.colors.ev.headroom = -0.05 (negative = violation)
```

---

## Package Structure

```
packages/
├── core/                 # Generator + Transformers
│   └── src/
│       ├── generator/    # Input → IR
│       │   ├── index.ts
│       │   ├── colors.ts
│       │   ├── spacing.ts
│       │   └── ...
│       ├── transformers/ # IR → Output
│       │   ├── css.ts
│       │   ├── typescript.ts (future)
│       │   └── figma-json.ts
│       ├── constraints/  # Validation utilities
│       ├── header.ts     # File header generation (format-agnostic)
│       ├── config.ts     # Default configs
│       ├── types.ts      # All type definitions
│       └── index.ts      # Public API
├── cli/                  # Command-line interface
│   └── src/
│       ├── index.ts      # Entry point + CLI setup
│       ├── commands/     # Subcommands (init, build, figma-sync)
│       └── version.ts    # Runtime version injection
├── themes/               # Pre-built themes
└── preview/              # GUI for theme building (low priority)
```

---

## CLI Usage

```bash
# Initialize new theme project
tfs init my-theme
# Creates directory with theme files + installs dependencies

# Build CSS from theme
tfs build . --output tokens.css
# or: tfs build ./my-theme --output tokens.css
```

---

## Migration Notes (from current implementation)

### Breaking Changes

1. **Mode selectors split:** `data-theme-mode` becomes independent
   `data-color-mode` and `data-size-mode` selectors. Time scales remain
   simultaneously available root namespaces.
2. **Config restructured:** Transformer-specific config (selectors, colorFormat) separated from generator config
3. **Internal refactor:** Single `css.ts` split into generator (produces IR) + CSS transformer (formats IR)

### Preserved Behavior

- All token naming conventions unchanged
- Generation formulas unchanged
- Output CSS variable names unchanged

---

## Design Decisions

### Why "ev" instead of "surface"?

Shorter for hand-coding. Emphasizes z-index relationship (elevation above background).

### Why arbitrary color names (not enforced core colors)?

Constraints system works with any color names. Users can follow conventions (bg, ev, primary...) without code enforcement. More flexible for edge cases.

### Why separate mode categories?

Avoids selector collision. Color modes and size modes are independent concerns - a dark theme can be small or large.

### Must every size family implement every size mode?

No. Modes are authored per family. Shared names coordinate deliberate overrides;
unique names support focused contexts such as a typography-only fixed-canvas
`display` mode. Missing family participation means “keep its default tokens,” not
“derive an override.”

Semantic font-size aliases are the deliberate exception to “atomic tokens only”
inside a typography override block. TFS re-declares those aliases alongside the
new `--fs-*` ruler so a mode scoped below `:root` resolves role recipes against
the local scale instead of the already-resolved root scale.

### Why resolve gap/border-radius to values (not var references)?

Simpler debugging (see actual value in devtools). No dependency chain issues. Works across different mode selectors.

### Why multiplicative spacing but additive typography?

Spacing needs harmonic ratios (8, 16, 24, 32...). Typography needs consistent visual steps (14px, 16px, 18px...).

### Why is file header timestamp opt-in (off by default)?

Follows Style Dictionary's evolution. Initially timestamps seemed useful, but they cause noisy git diffs in CI/CD where files regenerate on every build. Most teams prefer deterministic output.

### Why separate header content from comment formatting?

Keeps header logic format-agnostic. Same content works for CSS (`/* */`), TypeScript (`//`), or XML (`<!-- -->`). Transformers just wrap the content appropriately.
