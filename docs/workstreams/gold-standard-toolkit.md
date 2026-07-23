# Gold-standard toolkit workstream

This is the persistent checklist for the July 2026 TFS, Scatter design-system,
and eventual Scatter application rollout. It records approved direction and
remaining work so decisions do not depend on one chat transcript.

## Approved direction

- Preserve TFS's opinionated, minimal-input design-system philosophy. Scatter is
  a demanding reference integration, not a source of hardcoded core policy.
- Preserve `--fs-*` as permanent atomic primitives and build explicit semantic
  typography recipes above them.
- Typography recipe weights are explicit and role-local. Core defines neither a
  hidden middle weight nor a fixed alias schedule.
- Keep typography and font preparation build-time. A future Scatter `<Text />`
  consumes generated contracts locally.
- Use normal and genuine italic font faces where the physical font supports
  them. Do not invent oblique faces or silently synthesize missing capability in
  generated helpers.
- Preserve native OKLCH CSS values so capable browsers and displays retain wide
  gamut colour. Restrictive formats perform their own explicit gamut mapping.
- Preserve the TFS `luminance` feature vocabulary. Before adding WCAG alongside
  it, explicitly document and expose which metric a constraint uses; the current
  implementation compares OKLCH `L`.
- Adopt one canonical private `@repo/design-system` workspace package in the
  Scatter monorepo. Applications import package CSS and contracts instead of
  receiving copied files.
- Keep native Scatter themes as static generated colour modes. Only genuinely
  user-authored collection themes use the browser runtime compiler.
- Keep normal monorepo `build` and `check` fast. Font conversion, fallback
  measurement, regeneration, and drift verification belong to explicit
  authoring/dedicated CI commands.
- Do not use monorepo-wide package overrides to bridge an unreleased TFS build.
  Publish and pin an exact reviewed release, respecting Scatter's package-age
  policy.

## Active TFS work

- [x] Audit the existing output, runtime, compiler, CLI, and package boundaries.
- [x] Research the current OKLCH-L delta model versus relative-luminance/WCAG
      diagnostics and present explicit product/API options before broadening it.
- [x] Add a compact, strict, browser-safe runtime colour-theme API.
- [x] Generate compact native-theme/runtime contracts without forcing the full
      system manifest into a client bundle.
- [x] Add a canonical output layout separating runtime, review, and design-tool
      artifacts while retaining a simple sensible default.
- [x] Generate browser-ready ESM and declarations without a downstream ad hoc
      TypeScript compilation step.
- [x] Separate Node compilation/font tooling from interactive CLI dependencies
      where that materially reduces downstream workspace surface area.
- [x] Add non-mutating generated-output drift verification and prerequisite
      diagnostics suitable for CI.
- [x] Promote drift verification to the generic compiler/CLI contract and add a
      monorepo-ready scaffold whose routine checks remain independent of font
      tooling.
- [x] Add lightweight committed-output/package validation so ordinary monorepo
      build and check paths prove generated contracts without regeneration.
- [x] Run the complete release gate, packed-package consumer fixture, security
      audit, and deterministic legacy-output checks.
- [x] Run the final P3, prepared-font, specimen-server, and real-browser
      regressions against the rebuilt Scatter design-system package.
- [x] Install actual packed TFS tarballs through npm, scaffold both supported
      project shapes, pack the generated design-system package, and build a
      typed production Vite consumer. Keep this separate from the fast routine
      check and run it in release CI.
- [x] Make scaffolded checks non-mutating, pin the local TFS toolchain exactly,
      support scoped workspace package names, and make package-manager choice
      explicit/deterministic.
- [x] Type the CSS Module package export, reject stale exports into removed
      TFS-owned targets, and prove the packed package boundary externally.
- [x] Harden generated asset URLs for spaces, `#`, Unicode and configured path
      nesting; reject non-portable filesystem names and ambiguous public/CDN
      prefixes.
- [x] Preserve literal runtime color-name types, validate luminance against the
      exact emitted CSS precision, normalize diagnostic arithmetic, deep-freeze
      results, and add hostile persisted-JSON regressions.
- [x] Add Windows Node 22 CI for build, package validation, packed installs and
      ecosystem consumers. The first remote run remains release evidence.
- [x] Add a stable machine-readable CLI contract (`--json`, diagnostic IDs,
      documented exit codes and `build --dry-run`) before declaring the CLI 1.0.
- [x] Record exact FontTools/Python provenance whenever byte conversion occurs;
      keep the external tool pinned in dedicated regeneration CI.
- [x] Publish a framework-neutral monorepo package/task/security contract without
      mutating host workspace or cache configuration.
- [x] Execute packed npm plus generated-package artifacts in a real Chromium
      release job, including strict runtime input, native OKLCH, computed
      typography, bundle-boundary, and console/page-error assertions.
- [x] Decide whether install-graph minimalism justifies a dedicated runtime
      package in this release. Defer it: the current runtime subpath bundles to
      2.37 KB gzip without Culori, Node/font/CLI code, or interactive
      dependencies. A fifth published package would add release and migration
      surface for install-tree neatness rather than browser correctness. Revisit
      only if a real consumer policy or vulnerability requires it.

## Active Scatter design-system work

- [x] Rebuild `tfs-scatter` against the final reviewed TFS contracts.
- [x] Move production artifacts under a coherent runtime subtree; keep specimens,
      manifests, and Figma artifacts outside the application export boundary.
- [x] Make routine package `build`/`check` independent of FontTools.
- [x] Preserve protected production token parity and the deliberate new modes,
      fonts, semantic typography, and native themes.
- [x] Verify packed-package exports and isolated Next.js consumption.
- [ ] Add the package to an isolated Scatter worktree in a package-only change.
      Do not import it from an application or change production behaviour in that
      adoption step.
- [x] Reconcile the separate `claude/mktgfx-typography-tuning` worktree after its
      hands-on marketing calibration. Treat its authored values as proposals;
      do not overwrite or silently absorb them during the output-layout migration.

## Candidate system expansions

These are active design investigations, not approved core contracts. Resolve the
author-facing vocabulary and derivation rules before implementation; Scatter is
reference evidence, not hardcoded policy.

- [x] Add typography-role text-transform decisions, resolved into every complete
      recipe and available to generated CSS/TypeScript consumers. Preserve source
      text and keep role names and transform values author-defined.
- [ ] Add first-class composite shadow tokens with ordered multi-layer values,
      explicit semantic colour references, safe interpolation rules, and review
      specimens for elevation, glow, clipping, banding, and light/dark surfaces.
- [ ] Deferred: recalibrate Scatter's shimmer palette per native colour mode as
      an authored colour/theme concern. Do not couple it to the motion system.
- [x] Correct the under-specified time model: simultaneously emitted duration
      namespaces are now authored and exported as `time.scales`, not switchable
      modes. Easing and semantic motion recipes remain pending.
- [ ] Preserve atomic duration primitives, add arbitrary author-named cubic-bezier
      easing primitives, and add arbitrary author-named semantic motion recipes.
      Each recipe has an unsuffixed base plus any author-named variants and resolves
      only duration, easing, and delay—never a list of CSS properties.
- [ ] Generate equivalent CSS and typed JavaScript motion contracts so CSS
      transitions and application animation libraries do not maintain separate
      timing values.
- [ ] Make reduced-motion behavior explicit per semantic recipe and generate a
      `prefers-reduced-motion` contract. Do not globally erase essential feedback
      or assume every motion should degrade in the same way.
- [ ] Keep component state/selectors and arbitrary keyframes outside the initial
      core motion model. Investigate optional higher-level interaction recipes
      only after the transition contract works across real consumers.

## Deferred application rollout

- [ ] Replace Scatter's legacy generated CSS boundary with the workspace package.
- [ ] Re-home application-owned logo URLs outside generated token CSS.
- [ ] Upgrade the runtime custom-theme path, including strict persisted-data
      validation and native OKLCH/P3 output.
- [ ] Decide whether fixed per-polarity runtime overlays become a generic,
      explicitly authored TFS project policy or a generated Scatter-local
      manifest. Do not leave the existing duplicated application constants by
      accident.
- [ ] Represent built-in themes by generated keys/metadata and static selectors;
      preserve runtime collection-owner themes.
- [ ] Test real-page cold-cache font loading, fallback reflow, CLS, P3 colour,
      native/custom themes, and independent size modes.
- [ ] Build and trial Scatter's local `<Text />` primitive from generated CSS
      Module and TypeScript contracts.
- [ ] Perform the broader typography migration only after representative visual
      approval.

## Release boundary

- [ ] Complete the separate checklist in `docs/releasing.md` before publishing.
- [ ] Publish an exact canary, test it in Scatter, then promote it deliberately.
- [ ] Remove all temporary vendored package tarballs after the reviewed release is
      available and old enough for Scatter's dependency policy.
- [ ] Decide whether the public `themes` source-preset package should become
      `presets`; do not rename it incidentally inside the current runtime/output
      release.

## Decision log

- **2026-07-23 — luminance terminology and metric.** Keep the established public
  `luminance` vocabulary. The current constraint compares perceptual OKLCH `L`,
  so common, runtime, generated diagnostics, and manifests must identify the
  metric as `oklch-l`.
  A future WCAG contrast feature must use relative luminance and remain a
  separate diagnostic rather than silently changing the existing constraint.
- **2026-07-23 — package adoption boundary.** The canonical Scatter source is one
  co-located private workspace package. TFS owns only its generated subtree;
  the host `package.json`, authored sources, and font inputs remain human-owned.
- **2026-07-23 — release safety.** Do not solve local unpublished integration by
  overriding every Scatter consumer of `@three-forma-styli/core`. Package-only
  adoption waits for an exact reviewed release or another equally isolated,
  explicitly reviewed bridge.
- **2026-07-23 — package responsibility split.** `core` remains framework- and
  browser-safe; `compiler` owns Node project/font compilation; `cli` owns config
  loading and interactive commands. Compatibility CLI exports remain during the
  transition, but new authored projects import compiler APIs directly.
- **2026-07-23 — concurrent visual calibration.** Marketing typography tuning is
  isolated in `/Users/dickjones/project-local/tfs-scatter-mktgfx-tuning` from the
  committed `tfs-scatter` main line and its vendored TFS build. The canonical
  output migration must later reconcile that branch deliberately.
- **2026-07-23 — canonical Scatter package proven.** `tfs-scatter` commit
  `e71a470` packages runtime CSS, fonts, ESM, and declarations separately from
  design-tool and review artifacts. Its complete CI gate proves production token
  parity, reproducible generation, preserved P3 declarations, font conversion,
  package boundaries, an isolated production Next.js build, and browser-loaded
  primary and adjusted-fallback faces. Hands-on typography values were kept
  separate until the later explicit marketing-calibration reconciliation.
- **2026-07-23 — mode-aware typography calibration.** TFS commits `25d8ea3`
  and `c056036` add strict, role-local tuple overrides for non-default typography
  modes and make the generated specimen a real multi-mode editor. Browser proof
  against Scatter verified all four size modes, resolved controls and metadata,
  mode-scoped draft output, double-click reset, primary/adjusted font availability,
  and a clean console.
- **2026-07-23 — marketing tuning reconciled.** Canonical `tfs-scatter` commit
  `838e93e` applies the five source values from Claude's clean tuning branch after
  confirming its weight concern was withdrawn. The tighter Supreme leading is
  global because the author confirmed Scatter headings are always all-caps; no
  obsolete generated layout or dist artifact was imported.
- **2026-07-23 — generated output is a checked contract.** TFS now provides a
  first-class non-mutating check for both flat and workspace-package projects.
  It fully renders to a locked sibling stage and reports byte-level drift rather
  than silently repairing it. The opt-in workspace-package scaffold separates
  fast routine checks, explicit generation, and dedicated CI regeneration.
  Routine builds use a separate manifest/hash/package validator and therefore
  remain independent of FontTools.
- **2026-07-23 — canonical package adopts the generic contract.** `tfs-scatter`
  commit `3f4f61d` uses the generic lightweight validator in its ordinary check
  path and the generic staged drift checker in dedicated CI. The fast path
  validates all 24 committed files, exact package wiring, production parity,
  and P3 without font preparation; the heavy path still proves regeneration,
  conversion, packing, and an isolated Next.js consumer.
- **2026-07-23 — runtime theme boundary mapped.** Built-in modes use generated
  static selectors; only genuinely user-authored themes use the strict browser
  runtime API. Scatter's positive-polarity sentiment/network overlay remains an
  explicit ownership decision because core must not guess editable colours or
  polarity transforms. The alternatives are recorded in `tfs-scatter`'s
  `SCATTER-INTEGRATION.md`.
- **2026-07-23 — mature-tool workflow benchmark.** TFS adopts the useful parts
  of Prettier, Storybook and Style Dictionary without copying their entire
  product surface: project-local exact tooling, deterministic owned output,
  write-versus-check command clarity, isolated review artifacts, explicit
  target planning and realistic packed/browser consumers. TFS deliberately
  avoids global config, a generic hook free-for-all, partial managed-tree
  cleaning, and an internal cache until every external input can be keyed.
- **2026-07-23 — realistic consumers found real defects.** True tarball and
  framework tests exposed an un-packable versionless workspace scaffold,
  unresolved CSS Module declarations, stale exports after target removal, and
  broken font URLs for reserved URL characters. Those are now permanent
  regressions rather than one-off manual observations.
- **2026-07-23 — inspectable CLI contract.** Project planning is now a public,
  read-only compiler operation shared with `tfs build --dry-run`. Build, check,
  and validate emit versioned JSON envelopes on request; operation and usage
  failures have stable diagnostic IDs and exit codes. The packed ecosystem gate
  verifies stdout purity and the no-write guarantee through the real executable.
- **2026-07-23 — external font compiler provenance.** Copy-only font projects do
  not resolve or mention FontTools. Actual TTF/OTF conversion records the exact
  FontTools version and Python implementation/version without leaking machine
  paths or timestamps. A dedicated pinned CI job performs a real conversion and
  proves inspected semantics survive.
- **2026-07-23 — monorepo integration boundary.** TFS recommends one private
  generated design-system package with many package consumers, not multiple copy
  destinations. Ordinary build/check only validate committed output; explicit
  generation and discarded drift checks remain separate. TFS documents task
  inputs/outputs but does not edit a host's workspace or cache policy.
- **2026-07-23 — browser runtime evidence.** A production Vite/Chrome audit of
  the strict runtime path produced a 6.08 KB raw / 2.37 KB gzip bundle, versus
  78.61 KB raw / 25.01 KB gzip for the legacy `generate() + toCss()` path.
  Culori and Node/compiler dependencies were absent; all 40 Scatter-like custom
  properties matched build-time output and hostile payloads were rejected. This
  evidence defers a standalone runtime package without weakening the public
  browser boundary.
- **2026-07-23 — exact Scatter persistence audit.** Read-only monorepo research
  found that the stored collection theme is an outer JSON envelope containing
  `themeData` plus app-owned logo fields, while the current server schema checks
  optional `polarity`/`colors` at the wrong level. The application rollout must
  repair both read and write boundaries, preserve existing records and cookie
  precedence, and use generated native mode keys instead of copied built-in
  palettes. The exact migration and regression matrix lives in
  `tfs-scatter/SCATTER-INTEGRATION.md`.
- **2026-07-23 — executable review boundary.** The release matrix now has a
  separate Chromium job that installs real packed artifacts, scaffolds and packs
  a design-system package, builds its Vite consumer, and executes that result.
  Playwright is repository-only tooling and does not enter any published or
  generated consumer package.
