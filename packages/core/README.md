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
	colors: {
		/* ... */
	},
	spacing: {
		/* ... */
	},
	gap: {
		/* ... */
	},
	typography: {
		/* ... */
	},
	border: {
		/* ... */
	},
	time: {
		/* ... */
	},
};

const css = toCss(generate(system));

// Partial generation (e.g., just colors)
const partial: PartialDesignSystem = {
	colors: {
		/* ... */
	},
};

const colorsCss = toCss(generate(partial));
```

## API

- `generate(designSystem, config?)` - Generate intermediate representation from design system
- `toCss(ir, config?)` - Transform IR to CSS string
- `oklch(l, c, h)` - Create OKLCH color object
- `generateCss(designSystem, config?)` - Convenience function combining generate + toCss
- `generateFigmaJson(designSystem, config?, format?)` - Generate color-only DTCG or Figma Variables JSON
- `toFigmaJson(ir, config?, format?)` - Transform a hex/profile-aware IR to JSON
- `defineTypography(system)` - Preserve literal font/role/variant names for an explicit typography system; adds no hidden defaults
- `deriveTypographyRange(input)` - Optionally derive caller-named role variants from explicit anchors
- `fontFromManifest(manifest, id, options?)` - Bind prepared font capabilities into typography validation
- `generateTypographyTypescript(designSystem, config?)` - Generate a typed semantic typography contract
- `toTypographyTypescript(ir)` - Transform structured typography IR into TypeScript
- `generateTypographySpecimen(designSystem, config?)` - Generate a static calibration workbench
- `toTypographySpecimen(ir, config?)` - Transform structured typography IR into HTML
- `toTypographyCss(ir, config?)` - Generate global or local CSS Module recipes with explicit specificity policy
- `toTypographyCssModuleTypes(ir)` - Generate literal declarations for the CSS Module recipe keys

## Types

- `DesignSystem` - Full design system with all token families
- `PartialDesignSystem` - Partial design system (all families optional)
- `GeneratorConfig` - Configuration for token generation
- `GeneratorOptions` - Deeply optional user-facing generator configuration
- `CssTransformerConfig` - Configuration for CSS output

Display-P3 output uses profile-relative RGB components and must only be sent to
a Display-P3 Figma file. CSS output should stay in native OKLCH; TFS rejects P3
component bytes passed to `generateCss()` as CSS hex.

See the [main repo](https://github.com/dick-jo/three-forma-styli) for full documentation.
The repository's [validation policy](https://github.com/dick-jo/three-forma-styli/blob/master/docs/validation.md)
documents naming, numeric, reference, font-capability, and collision failures.
