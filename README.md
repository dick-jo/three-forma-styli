# Three-Forma-Styli

**TypeScript-first design token generator with OKLCH color support**

## Quick Start

```bash
# Install the CLI globally
npm install -g @three-forma-styli/cli

# Initialize a new theme project
tfs init

# Edit your theme files (with full IntelliSense!)
# Then generate CSS
tfs build . --output tokens.css
```

## Packages

| Package | Description |
|---------|-------------|
| `@three-forma-styli/core` | Core library for generating design tokens |
| `@three-forma-styli/cli` | CLI tool (`tfs` command) |
| `@three-forma-styli/themes` | Starter/reference themes |

## Programmatic Usage

For apps that need to generate themes at runtime (e.g., user-customizable themes):

```typescript
import { generate, toCss, oklch } from '@three-forma-styli/core';
import type { DesignSystem } from '@three-forma-styli/core';

const system: DesignSystem = {
  colors: {
    modes: [{
      name: 'dark',
      isDefault: true,
      tokens: {
        bg: oklch(0.15, 0, 0),
        ev: oklch(0.20, 0.01, 285),
        primary: oklch(0.70, 0.15, 250),
        neutral: oklch(0.60, 0.02, 270),
        ink: oklch(0.90, 0.02, 270),
        positive: oklch(0.70, 0.18, 145),
        negative: oklch(0.65, 0.20, 15)
      }
    }],
    transparencySchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 }
  },
  spacing: { modes: [{ name: 'default', isDefault: true, tokens: { unit: 'px', base: 8, min: 4, range: 12 }}] },
  gap: { modes: [{ name: 'default', isDefault: true, tokens: { min: 'min', s: 1, l: 2, max: 3 }}] },
  typography: { modes: [{ name: 'default', isDefault: true, tokens: { unit: 'rem', base: 1, min: 0.875, increment: 0.125, range: 8 }}] },
  border: {
    radius: { modes: [{ name: 'default', isDefault: true, tokens: { min: 'min', s: 1, l: 2, max: 4 }}] },
    width: { modes: [{ name: 'default', isDefault: true, tokens: { unit: 'px', value: 1 }}] }
  },
  time: { modes: [{ name: 'default', isDefault: true, tokens: { unit: 'ms', base: 100, min: 50, range: 10 }}] }
};

const css = toCss(generate(system));
```

### Partial Generation

Generate only specific token families (e.g., just colors for theme overlays):

```typescript
import { generate, toCss, oklch } from '@three-forma-styli/core';
import type { PartialDesignSystem } from '@three-forma-styli/core';

const colorOverlay: PartialDesignSystem = {
  colors: {
    modes: [{
      name: 'ocean',
      isDefault: true,
      tokens: {
        bg: oklch(0.18, 0.02, 240),
        ev: oklch(0.25, 0.03, 235),
        primary: oklch(0.65, 0.18, 200),
        neutral: oklch(0.70, 0.01, 240),
        ink: oklch(0.95, 0.01, 200),
        positive: oklch(0.72, 0.20, 150),
        negative: oklch(0.65, 0.22, 25)
      }
    }],
    transparencySchedule: { min: 0.07, lo: 0.25, hi: 0.75, max: 0.93 }
  }
};

const css = toCss(generate(colorOverlay));
// Only color tokens are generated
```

## Core Color System

Every design system defines 7 core colors:

- `bg` - Page background
- `ev` - Elevated surfaces (cards, panels)
- `primary` - Main brand/action color
- `neutral` - Achromatic scale (grays)
- `ink` - Text and icons
- `positive` - Success/positive sentiment
- `negative` - Error/negative sentiment

Each color generates transparency variants based on your transparency schedule.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm --filter @three-forma-styli/core test
```

## License

ISC
