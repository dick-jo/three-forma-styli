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
- [x] Run the complete release gate, packed-package consumer fixture, security
      audit, and deterministic legacy-output checks.
- [x] Run the final P3, prepared-font, specimen-server, and real-browser
      regressions against the rebuilt Scatter design-system package.

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

## Deferred application rollout

- [ ] Replace Scatter's legacy generated CSS boundary with the workspace package.
- [ ] Re-home application-owned logo URLs outside generated token CSS.
- [ ] Upgrade the runtime custom-theme path, including strict persisted-data
      validation and native OKLCH/P3 output.
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
