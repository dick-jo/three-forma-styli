# @three-forma-styli/core

## 0.3.0

### Minor Changes

- e7572c6: Add first-class layered box/text shadow recipes, semantic color references,
  strict interpolation helpers, global and CSS Module helpers, DTCG shadow
  composites, typed runtime contracts, and an interactive shadow specimen.
- 25d8ea3: Allow semantic typography recipes to opt into explicit, role-local tuple
  overrides for non-default typography modes. Mode overrides can change font size,
  weight, line height, and letter spacing without inventing a parallel role or
  changing existing atomic `--fs-*` behaviour.

  Make the interactive typography specimen genuinely mode-aware: alternate modes
  now load their generated tokens, controls and labels show resolved tuples, and
  copied drafts preserve default recipes versus mode overrides. Calibration edits
  also apply to the editable glyph sample and its metric context together.
  Slider controls no longer quantize precise authored line-height or tracking
  values when another field is edited.

- 1b7b42a: Require every semantic motion recipe to declare its reduced-motion behavior.
  Generate matching `prefers-reduced-motion` CSS overrides, typed normal/reduced
  JavaScript contracts, DTCG extension data, stable Workbench review states, and
  interactive standard/reduced playback without globally erasing essential
  feedback.
- b4c2c69: Author reusable luminance separation policy and an explicit runtime-editable
  color subset as part of a color system, rename the public threshold to
  `minimumLuminanceDelta`, and generate a literal `runtime-color-theme` contract
  for strict browser theme processing.

  Project compiler configurations may now customize the shared generator naming
  and color-format policy once; CSS, TypeScript, design interchange, review, and
  runtime contracts resolve from the same configuration.

- 78891b2: Add a strict, dependency-light browser runtime entrypoint for parsing unknown
  color themes, preserving native OKLCH wide-gamut CSS, expanding alpha schedules,
  and returning explicitly identified OKLCH-L luminance diagnostics.
- 7786d60: Generate a typed, framework-neutral typography CSS Module class resolver and
  add exact baseline/draft comparison to the portable visual Workbench.
- 777f8df: Correct the time authoring model by replacing the misleading `time.modes`
  contract with simultaneously emitted `time.scales`. Generated system contracts
  now separate switchable color/size modes from time scales and expose
  `TfsTimeScale`; their schema advances to version 2.

  Add validated role- and recipe-level `textTransform` typography decisions.
  Resolved transform tokens flow through global helpers, CSS Modules, TypeScript
  contracts, mode overrides, derived-range safeguards, and interactive specimens
  without modifying source text or hardcoding role policy in core.

- bdbc97e: Replace the private preset-bound preview and disconnected review specimens with
  one generated, versioned TFS Workbench. Workspace builds now emit a portable
  review application with stable color, typography and shadow cases, global mode
  switching, non-destructive draft controls, transaction-safe undo/reset,
  permalinks, patch export, and a source-aware agent handoff. Its whole-system
  proof sheet and domain matrices make every current color, typography, shadow,
  motion and foundation specimen reviewable together before drilling into a
  focused case.

  Add `tfs review serve` as the secure project-aware localhost workflow. Package
  the dependency-free Workbench shell inside the compiler without adding Svelte
  or Vite to published runtime dependencies, describe the review collection in
  the build manifest, and verify the real packed result in Chromium.

- ba640e9: Add explicit merge and authoritative Figma sync policies with deletion
  confirmation, exact token-backed dry-run diffs, ambiguity/type safety checks,
  and deterministic temporary IDs.

  Expand DTCG 2025.10 output from colors and shadows to all losslessly
  representable TFS families: dimensions, durations, cubic Bézier curves,
  transitions, and semantic typography. Preserve modes and CSS-only facts under
  the TFS extension instead of emitting non-standard composite members.

- 4e49cd6: Harden real consumer workflows across the runtime, compiler and CLI.

  Runtime color-theme configuration now preserves literal declared color names,
  reports luminance diagnostics against the exact emitted CSS precision, removes
  floating-point display noise, deep-freezes nested diagnostics, and rejects a
  larger hostile persisted-JSON corpus.

  Workspace packages now expose CSS Module declarations through an explicit
  `types` condition and reject stale exports into removed TFS-owned artifacts.
  Generated font, CSS import and specimen URLs encode filesystem path segments;
  ambiguous prefixes and cross-platform-reserved output names fail early.
  WOFF2 conversion manifests now identify the FontTools executable, exact
  FontTools release, and Python runtime; copy-only font preparation neither
  requires nor claims that external toolchain.

  Scaffolds pin exact TFS and TypeScript releases, use non-mutating build/check
  scripts, support scoped package names and deterministic package-manager
  selection, and produce a packable private workspace package. The release gate
  installs actual tarballs, exercises both scaffold shapes, packs the generated
  package, and type-checks and bundles a production browser consumer.

  The CLI depends directly on the two prompt controls it uses rather than the
  umbrella Inquirer prompt suite, reducing every authoring install's dependency
  surface without changing commands.

  The compiler now exposes a read-only, validated project plan. The CLI presents
  it through `build --dry-run`, and build/check/validate expose versioned JSON
  success and failure envelopes with documented exit semantics.

- 8fe03a3: Encode author-defined Workbench case identifiers deterministically, export the
  shared review-case union, and keep generated review assets synchronized with the
  componentized Workbench implementation.
- 63fd508: Add property-agnostic semantic motion recipes with arbitrary author names,
  duration-scale references, cubic Bézier easing tokens, composite CSS fragments,
  and equivalent millisecond/second values in generated TypeScript contracts.
- 9237f2c: Make Workbench typography calibration genuinely mode-scoped: every non-default
  typography mode now has resolved review cases and source paths, so display or
  compact edits cannot be exported as global recipe changes. Freeze public
  generator and CSS defaults and return isolated resolved configuration objects
  for deterministic repeated generation.

  Report FontTools whenever variable WOFF2 fallback sampling requires it, route
  decompression through the identified converter boundary, and record exact tool
  provenance in the adjusted-fallback manifest. Build locks now contain
  inspectable ownership metadata and safely recover exited same-host writers and
  old pre-metadata locks.

- 604853a: Emit framework-neutral Workbench capture plans with stable overview/case IDs,
  exact viewport and mode state, runner-ready permalinks, and meaningful font
  verification diagnostics.

  Add an explicit enforcing runtime-theme API that distinguishes malformed input
  from a valid palette that violates the configured TFS OKLCH-L luminance
  constraint. The existing generator remains a measurement/editor API.

### Patch Changes

- b2e6127: Expose the runtime's native OKLCH CSS formatters through the browser-safe public
  entrypoint so host applications can serialize fixed theme overlays with exactly
  the same precision and wide-gamut policy as generated runtime palettes.
- 709cfa3: Allow authors to name a role's default font style explicitly without repeating its weight in generated typography selections.

## 0.2.0 — 2026-07-22

### Minor changes

- Added explicit semantic typography roles, arbitrary role-local variants and
  weights, prepared-font capability validation, normal/italic/oblique modelling,
  longhand CSS recipes, typed manifests, and the interactive specimen generator.
- Preserved native OKLCH values for wide-gamut CSS and added profile-aware
  Display-P3 Figma/DTCG output without routing CSS through P3 component bytes.
- Added first-class mode metadata, typed system output foundations, configurable
  selectors, collision detection, and substantially stricter runtime validation.
- Removed the advertised but non-functional `separators` and `modeCategories`
  generator options. TFS owns stable token separators and structural mode
  categories; projects continue to control namespaces and CSS selectors.
- Aligned the `TypographySystem` type with runtime validation: atomic font-size
  modes may stand alone, while semantic roles require their font registry.
