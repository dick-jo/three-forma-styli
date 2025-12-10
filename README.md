# Three-Forma-Styli

**TypeScript-first design token generator with OKLCH color support and luminance constraints**

Generate CSS custom properties from TypeScript-defined design systems. Built for runtime theming, accessibility-aware color relationships, and ergonomic developer experience.

## Philosophy

1. **Luminance-First Design** - Lightness relationships determine readability. When luminance is correct, hue choices become flexible.
2. **Transparency-Based Variations** - Instead of generating solid color variants (blue-100, blue-200...), use transparency variants of base colors.
3. **Ergonomic Abstraction** - Limit choices to enforce consistency. Spacing scales, gap shortcuts, and semantic naming reduce decision fatigue.
4. **Runtime Theming** - CSS custom properties enable theme switching without page reload.

## Quick Start

```bash
# Install the CLI globally
npm install -g @three-forma-styli/cli

# Initialize a new theme project
tfs init

# Edit your theme files (with full TypeScript IntelliSense)
# Then generate CSS
tfs build . --output tokens.css
```

## Packages

| Package | Description |
|---------|-------------|
| `@three-forma-styli/core` | Core library for generating design tokens |
| `@three-forma-styli/cli` | CLI tool (`tfs` command) |
| `@three-forma-styli/themes` | Starter/reference themes |

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

Define root colors, get transparency variants automatically:

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
  transparencySchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 }
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
  modes: [{
    name: 'default',
    isDefault: true,
    tokens: { unit: 'px', base: 8, min: 4, range: 12 }
  }]
}
```

**Output:** `--sp-min: 4px`, `--sp-1: 8px`, `--sp-2: 16px`, ... `--sp-12: 96px`

### Gap

Semantic shortcuts that reference spacing:

```typescript
gap: {
  modes: [{
    name: 'default',
    isDefault: true,
    tokens: { min: 'min', s: 1, l: 2, max: 3 }  // References sp-min, sp-1, sp-2, sp-3
  }]
}
```

**Output:** `--gap-min: 4px`, `--gap-s: 8px`, `--gap-l: 16px`, `--gap-max: 24px`

### Typography

Range-based font sizes with additive increments:

```typescript
typography: {
  modes: [{
    name: 'default',
    isDefault: true,
    tokens: { unit: 'rem', base: 1, min: 0.875, increment: 0.125, range: 8 }
  }]
}
```

**Output:** `--fs-min: 0.875rem`, `--fs-1: 1rem`, `--fs-2: 1.125rem`, ...

### Border & Time

Similar patterns for border radius/width and timing values.

## Luminance Constraints

Validate color relationships for accessibility:

```typescript
import { validateLuminance } from '@three-forma-styli/core';

const result = validateLuminance(colors, {
  polarity: 'dark',  // dark background, light foreground
  minDelta: 0.4,     // minimum luminance difference
  backgroundColors: ['bg', 'ev'],
  foregroundColors: ['primary', 'neutral', 'ink'],
});

// Returns per-color diagnostics
// result.colors.bg.headroom = 0.15  (positive = safe margin)
// result.colors.ink.headroom = -0.05 (negative = violation!)
```

## Mode Categories

Modes are grouped into categories with separate CSS selectors:

| Category | Token Families | Selector |
|----------|---------------|----------|
| `color` | colors | `[data-color-mode="..."]` |
| `size` | spacing, gap, typography, border | `[data-size-mode="..."]` |
| `time` | time | `[data-time-mode="..."]` |

This allows independent switching - a dark theme can be small or large.

## Programmatic Usage

For apps that generate themes at runtime:

```typescript
import { generate, toCss, oklch } from '@three-forma-styli/core';
import type { DesignSystem } from '@three-forma-styli/core';

const system: DesignSystem = { /* ... */ };
const css = toCss(generate(system));
```

### Partial Generation

Generate only specific token families (e.g., for theme overlays):

```typescript
import { generate, toCss } from '@three-forma-styli/core';
import type { PartialDesignSystem } from '@three-forma-styli/core';

// Only generate colors - no spacing, typography, etc.
const colorOverlay: PartialDesignSystem = {
  colors: { /* ... */ }
};

const css = toCss(generate(colorOverlay));
```

## Configuration

Customize token prefixes, separators, and selectors:

```typescript
const config = {
  prefixes: {
    color: 'c',      // --c-primary instead of --clr-primary
    spacing: 's',    // --s-1 instead of --sp-1
  },
  selectors: {
    root: ':root',
    colorMode: '[data-theme="{mode}"]',
  }
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

## Design Decisions

**Why "ev" instead of "surface"?** Shorter for hand-coding. Emphasizes z-index relationship (elevation above background).

**Why transparency variants instead of solid color scales?** Fewer tokens, consistent relationships, works with any base color.

**Why multiplicative spacing but additive typography?** Spacing needs harmonic ratios (8, 16, 24...). Typography needs consistent visual steps (14px, 16px, 18px...).

**Why resolve gap to values (not var references)?** Simpler debugging in devtools. No dependency chain issues across mode selectors.

## License

ISC
