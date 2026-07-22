# Overnight hardening handoff — 22 July 2026

This pass deliberately stayed below the product-opinion layer. It did not change
Scatter, publish npm packages, reinterpret the known-good P3 palette, rename the
public packages, or invent more typography semantics. It strengthened the parts
that every serious consumer should be able to rely on: invalid input fails,
starter projects work from a clean checkout, packed packages match their source,
and release work has an auditable path.

## What changed

### Generator correctness

- Mode names are unique within each family, have at most one explicit default,
  and must be safe to place in generated CSS identifiers.
- Authored color, alpha, and namespace names receive the same CSS-safety check.
- Numeric schedules reject `NaN` and infinities before formatting.
- OKLCH lightness and alpha constraints are explicit. Chroma remains uncapped
  above zero so TFS does not dull or reject valid wide-gamut/P3 intent.
- Gap and border-radius references must resolve to a real spacing mode and an
  atomic step that mode actually generates.
- Generated custom-property collisions now fail with both involved families and
  the affected mode instead of silently overwriting one value.
- The advertised but non-functional `separators` and `modeCategories` options
  were removed. TFS owns that structural syntax; projects still own semantic
  names, prefixes, selectors, and output policy.

The complete rule set and its rationale are in [validation.md](./validation.md).

### Default preset

The modern preset now demonstrates the previously approved modest density modes:

| family            | small     | default   | large      |
| ----------------- | --------- | --------- | ---------- |
| spacing base/min  | 6px / 3px | 8px / 4px | 10px / 5px |
| `--fs-2` baseline | 13px      | 14px      | 15px       |
| border width      | 1px       | 1px       | 1px        |

Typography still has twelve permanent atomic steps. The mode changes adjust the
atomic values; the authored semantic tuples continue to reference those same
steps. Structural borders deliberately do not become blurry or visually heavy
when density changes.

### `tfs init` and project loading

- A generated starter is now a private, versionless project with local core/CLI
  dependencies, Node 22+, TypeScript 5.9, build/check/specimen scripts, and its
  own README.
- Project and preset names cannot escape into arbitrary filesystem paths.
- Copied source-family order is deterministic.
- Generated NodeNext imports are valid and the scaffold passes its advertised
  `tsc --noEmit` contract.
- The integration test builds the complete project, inspects its manifest, and
  performs a project-directory Figma dry-run.
- `tfs build .` and `tfs figma-sync .` now share one deterministic project loader.
  A directory prefers one `tfs.config.ts`/`.js`, rejects ambiguity, and otherwise
  falls back to `index.ts`.

The stronger scaffold test exposed a genuine type bug: a self-contained preset
could build but failed external TypeScript overload resolution. The fix preserves
literal project-font typo checking while allowing the stock preset's concrete
font registry to flow through `defineTfsProject()`.

### Package and release integrity

- Public builds target ES2022 and support maintained Node 22/24 LTS lines. Broken
  declaration maps that referenced unshipped source files were removed.
- Public packages declare `sideEffects: false`; the CLI executable remains a
  separate bin entry and API imports remain inert.
- `publint` is a pinned release gate.
- The packed-release test extracts the real tarballs, rejects leaked `workspace:`
  ranges, installs all three together, imports their APIs, type-checks a strict
  external consumer, and executes `tfs --help`.
- CI builds before testing (so a clean clone cannot borrow stale `dist/` files),
  tests Node 22 and 24, cancels superseded runs, and runs package/audit gates once.
- Changesets now owns future version intent and changelog generation. Core, CLI,
  and themes remain a fixed pre-1.0 release train.

See [package-architecture.md](./package-architecture.md) and
[releasing.md](./releasing.md).

## Compatibility and judgment calls

1. **Node 22 is now the minimum.** Node 18 and 20 are end-of-life. This makes the
   supported contract honest and avoids claiming CI coverage for unmaintained
   runtimes. Generated CSS and browser-side core output are unaffected.
2. **The dead generator knobs were removed rather than implemented.** They had
   never influenced output, so leaving them would promise customization that did
   not exist. This is an intentional pre-0.2 API cleanup.
3. **No P3 conversion path was rewritten.** Validation permits high chroma and
   the established OKLCH CSS path remains intact. P3-specific serializers retain
   their existing explicit profile selection.
4. **The package split remains core / CLI / themes plus a private preview app.**
   That boundary is sound. Renaming `themes` to `presets` remains a credible later
   cleanup, but doing it overnight would create migration work without improving
   generation correctness.
5. **The default density values are a reference opinion, not core vocabulary.**
   Authors can replace mode names and values. TFS merely validates and emits them.

## Evidence to reproduce

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check:release
pnpm audit --prod --audit-level=moderate
pnpm typography:review
```

`check:release` is the important gate: builds every workspace, runs the core and
CLI runtime/type tests, checks the private Svelte app, lints all public package
manifests, then verifies the actual tarballs in isolation.

## Explicitly still open

- Publish/install an exact npm canary and run it through Scatter before promoting
  any package to `latest`.
- Expand DTCG/Figma output beyond its current color-focused coverage.
- Validate a live eligible Figma file; dry-run generation is covered locally.
- Decide whether `@three-forma-styli/themes` should become `presets` in a planned
  compatibility release.
- Keep improving public tutorials and API reference before claiming a 1.0-quality
  external developer experience.
- Perform the separate Scatter rollout: generated-file replacement, native theme
  manifest integration, font preloads, and the local `<Text />` consumer.

Those are visible roadmap items, not hidden blockers to using the current project
compiler and generated design-system artifacts today.
