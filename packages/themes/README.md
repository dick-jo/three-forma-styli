# @three-forma-styli/themes

Starter and reference design system themes for three-forma-styli.

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

See the [main repo](https://github.com/three/three-forma-styli) for full documentation.
