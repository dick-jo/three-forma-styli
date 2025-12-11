# Three Forma Styli - Architecture

**Last Updated:** 2025-12-10

## Overview

TFS is an opinionated design token generator. It takes user-defined theme inputs and generates consistent, ergonomic design systems across multiple output formats.

### Philosophy

1. **Luminosity-First Design** - Lightness relationships determine readability. When luminosity is correct, hue choices become flexible.
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

### Mode Categories

Modes are grouped into categories that share output selectors:

| Category | Token Families | Purpose |
|----------|---------------|---------|
| `color` | colors | Light/dark themes, custom color themes |
| `size` | spacing, gap, typography, borderRadius, borderWidth | Responsive sizing (small/large viewports) |
| `time` | time | Animation preferences (reduced motion, etc.) |

---

## Token Families

### Colors

**Philosophy:** Alpha-driven variations. User provides root colors, generator creates alpha variants.

**Input:**
```typescript
interface ColorSystem {
  alphaSchedule: AlphaSchedule;  // Default for all modes
  modes: ColorMode[];
}

interface ColorMode {
  name: string;
  isDefault?: boolean;
  tokens: Record<string, Oklch>;  // Arbitrary color names (not enforced)
  alphaSchedule?: AlphaSchedule;  // Override per mode
}

interface AlphaSchedule {
  min: number;    // e.g., 0.07
  'lo-x': number; // e.g., 0.125
  lo: number;     // e.g., 0.25
  hi: number;     // e.g., 0.68
  'hi-x': number; // e.g., 0.85
  max: number;    // e.g., 0.93
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
    unit: string;   // 'px' | 'rem'
    base: number;   // e.g., 8
    min: number;    // e.g., 4
    range: number;  // e.g., 12
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
    spacingMode: string;  // Reference to spacing mode for resolution
    min: number | 'min';  // Literal value or reference to sp-min
    s: number | 'min';    // Literal value or reference to sp-{n}
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
    unit: string;      // 'rem' | 'px' | 'em'
    base: number;      // e.g., 0.875
    min: number;       // e.g., 0.625
    increment: number; // e.g., 0.125
    range: number;     // e.g., 12
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

**Philosophy:** Range-based timing values with named sub-categories and semantic shorthands.

**Input:**
```typescript
interface TimeMode {
  name: string;
  isDefault?: boolean;
  tokens: {
    // Sub-categories - user can define arbitrary names
    standard: TimeScale;      // becomes --t-1, --t-2, etc.
    animation?: TimeScale;    // becomes --t-anim-1, --t-anim-2, etc.
    [key: string]: TimeScale | ShorthandMap | undefined;

    // Semantic shorthands
    shorthands: ShorthandMap;
  };
}

interface TimeScale {
  unit: string;   // 'ms' | 's'
  base: number;   // e.g., 100
  min: number;    // e.g., 50
  range: number;  // e.g., 10
}

interface ShorthandMap {
  [name: string]: string;  // e.g., 'ix-hover': '1' (references t-1)
}
```

**Generation Rules:**
- For `standard` sub-category: `--t-min`, `--t-1`, `--t-2`, ...
- For other sub-categories: `--t-{category}-min`, `--t-{category}-1`, ...
- Formula: `t-{n} = base * n` (same as spacing)
- Shorthands: `--t-{name}: var(--t-{reference})`

**Example:**
```css
--t-min: 50ms;
--t-1: 100ms;
--t-2: 200ms;
--t-anim-min: 500ms;
--t-anim-1: 1000ms;
--t-ix-hover: var(--t-1);
--t-ix-active: var(--t-min);
```

---

## Generator Layer

### Generator Config

```typescript
interface GeneratorConfig {
  // Token naming
  prefixes: {
    color: string;        // default: 'clr'
    spacing: string;      // default: 'sp'
    gap: string;          // default: 'gap'
    typography: string;   // default: 'fs'
    borderRadius: string; // default: 'bdr'
    borderWidth: string;  // default: 'bdw'
    time: string;         // default: 't'
  };

  // Mode grouping for output
  modeCategories: {
    color: string[];  // default: ['colors']
    size: string[];   // default: ['spacing', 'gap', 'typography', 'borderRadius', 'borderWidth']
    time: string[];   // default: ['time']
  };
}
```

### Intermediate Representation (IR)

The generator produces a fully-expanded, normalized data structure:

```typescript
interface IR {
  // All default mode tokens
  tokens: Record<string, TokenValue>;

  // Mode metadata
  modes: {
    [category: string]: {
      default: string;      // Name of default mode
      overrides: string[];  // Names of override modes
    };
  };

  // Override mode tokens (only tokens that differ from default)
  overrideTokens: {
    [modeName: string]: Record<string, TokenValue>;
  };
}

interface TokenValue {
  family: string;           // 'color' | 'spacing' | etc.
  name: string;             // Full token name: 'clr-bg', 'sp-1', 'gap-s'
  value: string;            // Computed value: '8px', 'oklch(...)'
  rawValue?: number;        // Numeric value before formatting (for TS output)
  unit?: string;            // 'px', 'rem', 'ms', etc.
  reference?: string;       // For gaps: 'sp-1' (what user defined)
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
  selectors: {
    root: string;       // default: ':root'
    colorMode: string;  // default: '[data-color-mode="{mode}"]'
    sizeMode: string;   // default: '[data-size-mode="{mode}"]'
    timeMode: string;   // default: '[data-time-mode="{mode}"]'
  };

  colorFormat: 'oklch' | 'rgb' | 'hex';  // default: 'oklch'
}
```

**Output:**
```css
:root {
  /* Default mode tokens */
  --clr-bg: oklch(0.26 0 180);
  --clr-bg-a-lo: oklch(0.26 0 180 / 0.25);
  --sp-1: 8px;
  /* ... */
}

[data-color-mode="light"] {
  /* Color overrides */
  --clr-bg: oklch(0.95 0 180);
}

[data-size-mode="small"] {
  /* Size-related overrides */
  --sp-1: 4px;
  --fs-1: 0.75rem;
}
```

### TypeScript Transformer (Future)

Generates const objects with token values and type definitions.

### Figma/JSON Transformer (Future)

Generates Figma-compatible JSON for design tool sync.

---

## Constraint Validation

The `validateLuminance` function checks color relationships (optional, not part of generation):

```typescript
import { validateLuminance } from '@three-forma-styli/core';

const result = validateLuminance(colors, {
  polarity: 'negative',  // dark bg, light fg
  minDelta: 0.4,
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
│       │   └── figma.ts (future)
│       ├── constraints/  # Validation utilities
│       ├── config.ts     # Default configs
│       ├── types.ts      # All type definitions
│       └── index.ts      # Public API
├── cli/                  # Command-line interface
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

1. **Mode selectors split:** `data-theme-mode` becomes `data-color-mode`, `data-size-mode`, `data-time-mode`
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

### Why resolve gap/border-radius to values (not var references)?
Simpler debugging (see actual value in devtools). No dependency chain issues. Works across different mode selectors.

### Why multiplicative spacing but additive typography?
Spacing needs harmonic ratios (8, 16, 24, 32...). Typography needs consistent visual steps (14px, 16px, 18px...).
