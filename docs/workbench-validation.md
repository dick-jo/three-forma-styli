# Workbench validation evidence

This record distinguishes implemented behavior from design intent. It is not a
visual-approval claim for any product design system.

## Automated release proof

`pnpm check:browser` installs real packed TFS tarballs into an isolated
toolchain, scaffolds a workspace-package design system, builds its generated
package, and opens the generated Workbench in Chromium. The proof fails on
browser warnings/errors and verifies:

- the versioned Workbench contract and color, typography, shadow, motion and
  foundation case inventories;
- stylesheet readiness and a browser-ready marker;
- a whole-system overview containing compact matrices for all five visual
  domains;
- domain-aware color, typography and motion matrix views with multiple cases,
  followed by matrix-to-case drill-down;
- a live OKLCH color edit;
- typography editing, scoped reset, undo and size-mode switching;
- semantic motion playback;
- stable lab/case/mode permalinks.
- generated framework-neutral capture states with exact viewport/mode URLs,
  consumed by the same Chromium proof.

The ordinary release proof also asserts that the compiler tarball contains the
three dependency-free Workbench assets, while generated runtime package tarballs
exclude all review files.

## Real prepared-font proof

A disposable local clone of `tfs-scatter` was built with the current local TFS
packages and `review.workbench` enabled. The canonical source repository was not
modified. In the normal in-app browser:

- Supreme normal and italic and JetBrains Mono reported loaded through
  `document.fonts`;
- the prose sample resolved to Supreme followed by the generated metric-adjusted
  fallback and portable system fallbacks;
- forcing fallback removed Supreme and selected the adjusted fallback;
- the measured prose/base comparison reported a `+2.85px` (`+1.23%`) inline
  width delta and no line-count change for the current narrow stress sample;
- all intentional Supreme normal/italic weights were enumerated;
- default/light/nonon-ten color modes and default/small/large/display size modes
  were present.

That run exposed and fixed a real integration defect: the adjusted fallback was
initially listed twice in the Workbench font stack because the prepared
typography contract already contained it and the review adapter added it again.
A core regression test now protects the de-duplicated contract.

Fallback measurements are browser/viewport evidence, not a universal approval
state. Different strings can still produce different residual width and wrapping
deltas.

## Current capability boundary

Editable source-aligned drafts exist for authored OKLCH colors, typography
tuples and shadow layers. Motion and foundation scales are intentionally
read-only because their visible values derive from structured time references or
compact anchors; patching individual resolved tokens would undermine TFS's
source model.

Still planned:

- project-owned pinned screenshot baselines;
- structured motion/time-reference editing;
- color relationship, gamut and luminance-constraint diagnostics.

Reduced-motion review is implemented. Motion cases switch between standard and
reduced resolved tuples, show whether reduced behavior is preserved or
overridden, and generate stable capture-plan URLs for both user preferences.

Strict fingerprint- and contract-bound patch import is implemented. Typography
fallback evidence now refuses to report a comparison when the intended primary
or adjusted face is unavailable and separates phrase width, constrained line
count, and hostile glyph-corpus width instead of hiding residual behavior behind
one score.

These are tracked in
[`docs/workstreams/gold-standard-toolkit.md`](workstreams/gold-standard-toolkit.md).
