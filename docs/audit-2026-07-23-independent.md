# Independent hostile due-diligence audit — 23 July 2026

This audit was performed by a separate read-only agent instructed to assume the
toolkit's quality claims were inflated and to evaluate TFS as production
developer infrastructure rather than as a demo.

## Verdict

TFS is not yet entitled to the phrase “world-class complete.” It is, however,
well beyond generic token plumbing and meaningfully differentiated by its
opinionated OKLCH generation, explicit luminance constraints, prepared-font and
metric-adjusted-fallback pipeline, semantic typography tuples, generated
package contracts, strict runtime themes, and source-aware visual Workbench.

The recommendation was to continue funding and the guarded Scatter rollout,
but not yet recommend TFS as critical infrastructure to an unrelated company.

Both the release gate and full external integration suite passed during the
audit. Those suites exercise real package tarballs, standalone and workspace
projects, Vite, Next.js, Turborepo, runtime themes, and Chromium Workbench
interactions.

## Findings closed immediately

- Workbench typography controls could export a non-default mode edit to the
  base role path. Review cases and browser regression proof are now
  mode-scoped.
- Exported generator and CSS defaults were mutable singletons. Defaults are now
  frozen and every resolved generator configuration is isolated.
- FontTools planning omitted variable-WOFF2 adjusted-fallback decompression.
  Planning, execution, and provenance now share the same tool boundary.
- Killed builds could leave an opaque permanent lock. Locks now record their
  owner and recover only provably stale same-host or old legacy locks.
- The strongest Next.js, Turborepo, and Chromium proof was optional.
  `check:release` and the browser-consumer CI job now run the full integration
  matrix.
- Workbench fallback evidence treated `document.fonts.check()` as proof that a
  named face loaded, even though browsers may return `true` when generic
  fallback can render the text. Evidence now requires matching loaded
  `FontFace` objects, and the packed Chromium gate deliberately supplies a
  nonexistent primary family to prove that no misleading delta is reported.
- Review cases shallow-copied a default capture policy whose nested arrays
  remained shared. Capture policies are now freshly allocated per case, with
  cross-case and cross-contract mutation covered by a regression test.

A second hostile pass over these fixes found no remaining P0/P1 issue in the
current batch. It independently reproduced the browser font-loading semantics
and reran the focused core and packed Chromium proofs.

## Remaining ranked findings

1. Workbench still needs baseline/draft comparison and optional project-owned
   pinned screenshots. Executable viewport/mode capture output, real font
   diagnostics, strict fingerprint-bound patch import, and Chromium consumption
   landed on 2026-07-23.
2. ~~Figma sync is additive. It needs explicit merge versus authoritative
   policy, a dry-run diff, and deletion safeguards.~~ Closed on 2026-07-23:
   merge remains the default; authoritative deletion is separately named,
   dry-runnable against remote state, and confirmation-gated.
3. ~~DTCG coverage remains narrower than the complete TFS system.~~ Closed on
   2026-07-23 for every losslessly representable 2025.10 family. CSS-only facts
   and modes are carried in the TFS extension. A representative complete export
   is validated offline against the provenance-recorded official bundled schema.
4. ~~Large validation and project-build orchestration modules need domain splits
   without public behavior changes.~~ Closed on 2026-07-23: project planning,
   output ownership, shared validation, time/motion/shadow validation, and
   typography validation now live behind coherent internal boundaries.
5. Font fallback calibration needs documented/custom corpora and broader
   script/platform evidence before the word “universal” applies to that
   subsystem.
6. ~~Runtime luminance measurement versus enforcement must remain an explicit
   product/API distinction.~~ Closed on 2026-07-23: measurement/editor and
   enforcement boundaries are separately named, and constraint failure has a
   distinct error type from malformed untrusted input.
7. Canary publication, independent installation, and the isolated Scatter
   package adoption remain operational release gates.

### Structural-debt progress

The first behavior-preserving split landed on 2026-07-23:

- `project-build.ts` fell from 1,010 to 631 lines. Portable legacy output
  planning, atomic output ownership/replacement, and read-only project/font
  planning now have separate modules.
- `validate.ts` fell from 1,381 to 476 lines. Shared validation primitives,
  time/motion/shadow validation, and the complete semantic typography validator
  now have separate modules. The typography block moved intact as one domain;
  this was not a line-count-driven rewrite.
