# Package architecture

## Current no-regret boundary

```text
apps/
└── preview/     private visual workbench; never published

packages/
├── core/        public, browser-safe generator and programmatic runtime
├── compiler/    public, Node-only project and font compiler
├── cli/         public, interactive `tfs` command shell and compatibility API
└── themes/      public starter/reference source systems
```

This division prevents font parsing, prompts, filesystem code and esbuild from
entering applications that only need the small programmatic core. The private
Svelte application is an app—not a package—and is absent from every published
tarball.

All public packages currently share one version and release together. This is a
fixed release train, not an assertion that every package changed equally. It
prevents a packed CLI from resolving an older, API-incompatible core from npm.
`pnpm check:release` proves the packed artifacts work together outside the
workspace before anything is published.

Project configs should use the import-safe compiler root:

```ts
import { defineTfsProject } from '@three-forma-styli/compiler';
```

Programmatic compilation lives at `@three-forma-styli/compiler/build`, and font
preparation/inspection lives at `@three-forma-styli/compiler/fonts`. The CLI
retains its existing root, `/project`, and `/fonts` exports as compatibility
re-exports. Only the CLI has a `bin`; importing either authoring root does not
evaluate the command parser or heavy compiler graph.

## The one unresolved public-package decision

`@three-forma-styli/themes` contains typed source-system presets, not generated CSS
themes. Three credible choices remain:

### A. Rename it to `@three-forma-styli/presets` — recommended

The name accurately communicates reusable authored inputs. Publish `themes` as a
thin compatibility re-export for one release, move the CLI and preview to
`presets`, then deprecate the old package.

This preserves an important TFS promise: a user can begin from a rigorous default
instead of authoring every decision from zero.

### B. Fold presets into the CLI

This produces only two public packages. It is simpler for `tfs init`, but makes the
defaults awkward for programmatic consumers and couples reusable data to Node-only
tooling.

### C. Keep `themes`

This has zero migration cost, but the name will continue suggesting runtime CSS or
finished branded themes rather than source presets.

## Not recommended

- A single package containing core, CLI, fonts and the preview. Browser consumers
  would install Node-only parsing/build dependencies and the product boundaries
  would become harder to explain.
- Moving the TFS source monorepo into Scatter. Scatter should contain its
  `packages/design-system` source project and depend on released TFS tooling; the
  generic toolkit and product-specific system have different release lifecycles.
- Adding an umbrella package only to hide package names. The CLI can already be the
  normal author-facing dependency while advanced/runtime consumers deliberately
  choose core.

## Recommended release shape

Long term there are still four public responsibilities, even if `themes` becomes
`presets`:

1. `core` — stable, browser-safe programmatic API;
2. `compiler` — Node-only project/font compilation;
3. `cli` — interactive config loading and command workflows;
4. `presets` — optional starting systems and derivation defaults.

Applications consume generated design-system packages, not the TFS preview app and
not necessarily the CLI at runtime.
