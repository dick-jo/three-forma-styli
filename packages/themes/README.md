# @three-forma-styli/themes

Typed starter and reference design-system source presets for three-forma-styli.
These are authored inputs, not runtime CSS themes. The package also includes the
source templates used by `tfs init`.

## Installation

```bash
npm install @three-forma-styli/themes
```

## Usage

```typescript
import { designSystem } from '@three-forma-styli/themes';
import { generate, toCss } from '@three-forma-styli/core';

const css = toCss(generate(designSystem));
```

## Available Themes

- `default` - The modern reference theme with fully visible prose/heading/label typography
- `legacy` - The frozen pre-semantic default/small/large typography modes

See the [main repo](https://github.com/dick-jo/three-forma-styli) for full documentation.
