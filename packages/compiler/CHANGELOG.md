# @three-forma-styli/compiler

## 0.3.0

### Minor Changes

- e7572c6: Add first-class layered box/text shadow recipes, semantic color references,
  strict interpolation helpers, global and CSS Module helpers, DTCG shadow
  composites, typed runtime contracts, and an interactive shadow specimen.
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

- 78891b2: Extract project and font compilation into a dedicated Node.js compiler package.
  The CLI delegates to it while retaining all existing authoring and font export
  paths as compatibility re-exports.

  Add a package-oriented project output layout that atomically generates separate
  runtime, review, design-tool, and shared font-asset trees. Runtime output can
  include browser-ready CSS, dependency-free ESM contracts, declarations, and a
  compact native-colour-mode contract while the host package remains explicitly
  owned and validated by its author.

  Export the intermediate project-font and project-system authoring types so
  split source files retain literal font-ID validation with `satisfies`.

  Keep the complete discriminated typography-selection type contract identical
  between flat and workspace-package outputs.

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

- 4d00b24: Add a non-mutating generated-output check that fully rebuilds a project in a
  private sibling stage and reports missing, changed, and unexpected files.

  Add a lightweight committed-output validator for routine monorepo build paths.
  It verifies manifest ownership/version, exact file inventory and hashes, and
  workspace package wiring without running font preparation or regeneration.

  Expose the workflow as `tfs check <path>` and add an opt-in
  `tfs init --workspace-package` scaffold with package-safe runtime exports,
  explicit generation, fast routine checks, and a dedicated drift-check script.

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

- 63fd508: Add property-agnostic semantic motion recipes with arbitrary author names,
  duration-scale references, cubic Bézier easing tokens, composite CSS fragments,
  and equivalent millisecond/second values in generated TypeScript contracts.
- 5a6c0ab: Add strict review-patch import to generated Workbenches. Imports are bounded,
  fingerprint- and contract-validated, replace the disposable draft as one
  undoable transaction, and reject stale baselines, foreign systems, unknown
  paths/cases, duplicate operations, and invalid control values.
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

- 8fe03a3: Encode author-defined Workbench case identifiers deterministically, export the
  shared review-case union, and keep generated review assets synchronized with the
  componentized Workbench implementation.
- Updated dependencies [e7572c6]
- Updated dependencies [25d8ea3]
- Updated dependencies [1b7b42a]
- Updated dependencies [b4c2c69]
- Updated dependencies [78891b2]
- Updated dependencies [7786d60]
- Updated dependencies [777f8df]
- Updated dependencies [bdbc97e]
- Updated dependencies [ba640e9]
- Updated dependencies [b2e6127]
- Updated dependencies [4e49cd6]
- Updated dependencies [709cfa3]
- Updated dependencies [8fe03a3]
- Updated dependencies [63fd508]
- Updated dependencies [9237f2c]
- Updated dependencies [604853a]
  - @three-forma-styli/core@0.3.0

## 0.2.0 — 2026-07-23

### Initial package

- Extracted the import-safe project authoring contract, deterministic project
  compiler, font preparation, inspection, and adjusted fallback implementation
  from the interactive CLI package without changing generated artifacts.
