# @three-forma-styli/core

Core library for generating design tokens as CSS custom properties.

## Installation

```bash
npm install @three-forma-styli/core
```

## Usage

```typescript
import { generate, toCss, oklch } from '@three-forma-styli/core';
import type { DesignSystem, PartialDesignSystem } from '@three-forma-styli/core';

// Full design system
const system: DesignSystem = {
  colors: { /* ... */ },
  spacing: { /* ... */ },
  gap: { /* ... */ },
  typography: { /* ... */ },
  border: { /* ... */ },
  time: { /* ... */ }
};

const css = toCss(generate(system));

// Partial generation (e.g., just colors)
const partial: PartialDesignSystem = {
  colors: { /* ... */ }
};

const colorsCss = toCss(generate(partial));
```

## API

- `generate(designSystem, config?)` - Generate intermediate representation from design system
- `toCss(ir, config?)` - Transform IR to CSS string
- `oklch(l, c, h)` - Create OKLCH color object
- `generateCss(designSystem, config?)` - Convenience function combining generate + toCss

## Types

- `DesignSystem` - Full design system with all token families
- `PartialDesignSystem` - Partial design system (all families optional)
- `GeneratorConfig` - Configuration for token generation
- `CssTransformerConfig` - Configuration for CSS output

See the [main repo](https://github.com/three/three-forma-styli) for full documentation.
