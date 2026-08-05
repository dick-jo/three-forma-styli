# v0.5 migration

v0.5 replaces incidental implementation vocabulary with the ratified TFS
grammar. Migrate authored source first, regenerate once, then migrate consumers
to the new compact contracts.

## 1. Alpha

Move color-owned alpha schedules into a top-level named Alpha system:

```ts
const alpha = defineAlpha({
	defaultScale: 'standard',
	scales: {
		standard: {
			values: {
				min: 0.07,
				'lo-x': 0.125,
				lo: 0.25,
				hi: 0.68,
				'hi-x': 0.85,
				max: 0.93,
			},
		},
	},
});
```

`non: 0` is generated. Additional scales retain the same fixed positions.

## 2. Typography

Use `defineTypography()`. Sizes and categorical variants are no longer the same
thing:

```ts
const typography = defineTypography({
	modes,
	fonts,
	roles: {
		prose: {
			font: 'sans',
			weights: { min: 300, lo: 400, hi: 500, max: 700 },
			weight: 'lo',
			sizes: {
				min: { fontSize: 'min', lineHeight: 1.35, letterSpacing: 0.01 },
				s: { fontSize: 1, lineHeight: 1.3, letterSpacing: 0.005 },
				base: { fontSize: 2, lineHeight: 1.25, letterSpacing: 0 },
				l: { fontSize: 3, lineHeight: 1.2, letterSpacing: -0.005 },
				max: { fontSize: 4, lineHeight: 1.15, letterSpacing: -0.01 },
			},
			variants: {
				emphatic: { weight: 'max', letterSpacing: -0.01 },
			},
		},
	},
});
```

A one-weight role uses `weights: 400` and omits `weight`. Use
`deriveTypographySizes()` when interpolation removes repetition; its return value
is still the same complete, inspectable size data.

Consumer selection is explicit:

```ts
typographyClassName(
	{ role: 'prose', size: 's', variant: 'emphatic', fontStyle: 'italic' },
	classes
);
```

## 3. Project color groups and runtime policy

Keep taxonomy with the design-system project:

```ts
colors: {
  ...colors,
  groups: {
    sentiment: { identities: ['pos', 'neg'] },
    network: { match: { prefix: 'network-' } },
  },
}
```

Move runtime input policy out of `colors`:

```ts
defineTfsProject({
	system,
	runtime: {
		colorThemes: {
			colors: { include: [{ group: 'foundation' }, 'shadow'] },
			enforce: ['luminance'],
		},
	},
	output,
});
```

The generated/runtime compiler schema now uses the ratified identity vocabulary:

```ts
const runtimeColorThemeConfig = {
	colorIdentities: ['bg', 'ev', 'pri', 'neu', 'ink'],
	// alpha schedule, luminance policy and output naming follow
};
```

Replace pre-v0.5 `colorNames` access with `colorIdentities` and
`RuntimeColorName` with `RuntimeColorIdentity`. Color modes may omit unchanged
identities, but cannot introduce an identity absent from the default mode.

## 4. Motion composites

The ratified cross-domain term is `composite`. Rename the Motion container; its
values and variant behavior do not otherwise change:

```ts
motion: {
  easings,
  composites: {
    hover: {
      base: { duration: 2, easing: 'standard' },
      variants: { min: { duration: 'min' }, max: { duration: 4 } },
      reducedMotion: { base: { duration: 0, delay: 0 } },
    },
  },
}
```

Replace pre-v0.5 `motion.recipes` access with `motion.composites`.

## 5. Compact generated contracts

Enable the token catalogue and disable the detailed system contract for ordinary
application consumption:

```ts
contracts: {
  tokens: true,
  typography: true,
  system: false,
}
```

Then consume stable package exports:

```ts
import {
  colorIdentities,
  colorGroups,
  colorVariable,
  colorReference,
  colorRampStyle,
  type ColorIdentity,
  type ColorIdentityIn,
} from '@repo/design-system/tokens';

export const BUTTON_COLORS = ['neu', 'pri', 'pos', 'neg'] as const
  satisfies readonly ColorIdentity[];

export type NetworkColor = ColorIdentityIn<'network'>;
```

Applications no longer construct `--clr-*` names or recover unions from a large
internal system object.

## 6. Verify

```sh
tfs build .
tfs check .
tfs review serve .
```

Inspect compact contracts, Workbench diagnostics, generated ownership, and one
real consumer typecheck before replacing production output. The compiler fails
invalid font capabilities, group membership, alpha shape, typography ranges,
and runtime policy rather than adapting them silently.
