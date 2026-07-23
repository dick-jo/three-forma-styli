# Scatter monorepo rollout handoff

Status: implementation contract prepared from read-only audits on 2026-07-23.
Nothing in `/Users/dickjones/project-local/splinter` was changed.

Scatter is the first demanding production integration, not a TFS preset. Every
toolkit feature used below is also exercised through neutral standalone,
workspace, Vite, Next.js and Turborepo fixtures.

## Current authority

- Production behavior and current token output in `splinter` are the regression
  authority.
- The clean `tfs-scatter` repository is the best current authored migration
  source for palettes, native modes, typography, fonts, motion and shadows.
- The long-term authority will be `splinter/packages/design-system`.
- The 2026-07-23 read-only audit found unrelated active changes in the Scatter
  checkout, including theme files. Perform adoption in an isolated worktree and
  do not overwrite those changes.

## Package-only adoption

Copy the authored project—not its repository metadata, root lockfile,
`node_modules`, or temporary vendored TFS tarballs—into:

```text
packages/design-system/
├── src/
├── fonts/source/
├── tooling/fonttools/
├── tfs.config.ts
├── package.json
└── generated/
```

Use exact, reviewed TFS releases in `devDependencies`. Keep `generated/`
committed. Ordinary `build` and `check` validate committed artifacts without
FontTools; explicit `generate` writes them; a dedicated uncached
`check:generated` job installs the pinned external font toolchain and rejects
drift.

Add the package without changing an application import first. It must pass:

```sh
pnpm --filter @repo/design-system check
pnpm check
pnpm build
```

The root lockfile, minimum-release-age policy and Turborepo graph remain owned
by Scatter. TFS must not inject or weaken them.

## Source policy required before generation

Scatter has many static colors but only five user-editable runtime colors. The
canonical color input must state both facts independently:

```ts
colors: {
  modes,
  alphaSchedule,
  luminance: {
    minimumLuminanceDelta: 0.33,
    backgroundColors: ["bg", "ev"],
    foregroundColors: ["pri", "neu", "ink"],
  },
  runtimeThemes: {
    colorNames: ["bg", "ev", "pri", "neu", "ink"],
  },
}
```

This produces `@repo/design-system/runtime-color-theme`. Network, sentiment and
shimmer colors remain static design-system tokens; they do not accidentally
become fields accepted from an untrusted collection-theme payload.

The package config enables the matching generated contract:

```ts
targets: {
  runtime: {
    contracts: {
      system: true,
      typography: true,
      nativeColorModes: true,
      runtimeColorTheme: true,
    },
  },
}
```

Its human-owned `package.json` exports the generated `.js` and `.d.ts` files
under `./runtime-color-theme`, exactly like the other typed contracts.

## Application migration boundary

The first application change imports generated CSS once at the framework root:

```ts
import '@repo/design-system/styles.css';
```

Logo URLs and `--collection-image-rendering` remain app-owned. Generated CSS is
never edited or copied into an app directory.

Default, Light and Nonon Ten are static first-party modes. Consume
`nativeColorModes`, then set or remove `data-color-mode`; do not regenerate
their CSS in the browser. `data-size-mode` remains independent.

Only genuinely user-authored collection themes use the strict runtime:

```ts
import { generateRuntimeColorTheme } from '@three-forma-styli/core/runtime';
import { runtimeColorThemeConfig } from '@repo/design-system/runtime-color-theme';

const result = generateRuntimeColorTheme(untrustedThemeData, runtimeColorThemeConfig);
```

The app owns persistence-envelope validation, route precedence, cookie
migration, DOM assignment and cleanup. TFS owns exact inner payload validation,
native OKLCH/P3-preserving declarations, alpha generation and OKLCH-L separation
diagnostics.

## One remaining Scatter-specific adapter

Positive custom themes currently darken fixed sentiment/network colors while
negative custom themes inherit their defaults. Those colors are deliberately
outside the editable runtime payload. Preserve that behavior during migration
with a small app adapter derived from canonical generated native-mode data; do
not copy the registry back into application constants.

If multiple unrelated products demonstrate the same requirement, TFS may gain a
generic authored fixed-overlay policy. Do not hardcode Scatter's polarity or
network conventions into core based on one consumer.

## Regression gates

- byte/semantic comparison against production tokens, including Robinhood and
  excluding removed Monad Testnet;
- current P3 vibrancy preserved in real Chromium rendering;
- Default, Light and Nonon Ten switch without runtime CSS generation;
- valid legacy collection records retain their exact visual output;
- malformed/hostile runtime payloads fail before DOM assignment;
- custom-to-native and route transitions leave no stale properties or mode
  attributes;
- exactly the five declared core colors and their alpha schedule are emitted;
- cold-cache font loading, adjusted fallbacks and CLS checked in browser;
- no compiler, FontTools, prompt, Svelte or Workbench dependency enters an app
  production graph;
- root `pnpm check`, production build and security review pass in the isolated
  worktree before merge.
