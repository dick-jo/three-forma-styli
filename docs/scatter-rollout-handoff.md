# Scatter monorepo rollout handoff

Status: runtime/theme integration implemented and production-shaped verification
completed in the isolated `splinter-tfs-integration` worktree on 2026-07-23.
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
import { enforceRuntimeColorTheme } from '@three-forma-styli/core/runtime';
import { runtimeColorThemeConfig } from '@repo/design-system/runtime-color-theme';

const result = enforceRuntimeColorTheme(untrustedThemeData, runtimeColorThemeConfig);
```

The app owns persistence-envelope validation, route precedence, cookie
migration, DOM assignment and cleanup. TFS owns exact inner payload validation,
native OKLCH/P3-preserving declarations, alpha generation and explicit OKLCH-L
separation enforcement. An editor that must display invalid drafts can call
`generateRuntimeColorTheme` instead and inspect `result.luminance.deltaValid`.

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

- [x] Byte/semantic comparison against production tokens, including Robinhood
      and excluding removed Monad Testnet.
- [x] Current P3 vibrancy preserved in real Chromium rendering. The Robinio
      Quants primary retains its authored `oklch(0.7972 0.4900 125.28)`.
- [x] Default, Light and Nonon Ten switch without runtime CSS generation.
- [x] Real collection records exercise color-only, partial-logo and two-logo
      custom themes in a production Next server.
- [x] Malformed/hostile runtime payloads fail before DOM assignment.
- [x] Custom-to-native and route transitions leave no active stale properties,
      logos or mode attributes.
- [x] Exactly the five declared core colors and their alpha schedule are
      emitted by the latest TFS runtime contract.
- [ ] Complete the separate cold-cache font loading, adjusted-fallback and CLS
      review as part of the full typography replacement.
- [x] No compiler, FontTools, prompt, Svelte or Workbench dependency enters the
      application production graph.
- [x] TFS packed-release, production Next 16/Svelte 5/Turborepo/Chromium gates,
      Scatter theme tests, strict type-check and the Scatter production build
      pass.

## Release handoff

The accumulated Changesets resolve the coordinated public release to `0.3.0`.
The integration branch intentionally requests exact
`@three-forma-styli/core@0.3.0`; its lockfile must not be regenerated against an
older registry version or a committed local override.

Before pushing the Scatter integration commit:

1. authenticate npm for the `@three-forma-styli` scope;
2. prepare and review the coordinated `0.3.0` release diff;
3. publish the exact canary under `next`;
4. install that exact registry version in the isolated Scatter worktree and
   regenerate the lockfile;
5. rerun the full Scatter check/build/browser matrix;
6. promote the already-proven version to `latest`, then push the integration
   branch.
