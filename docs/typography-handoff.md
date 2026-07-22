# Typography workbench handoff

This document is the review map for the current branch. It is not a publish or
Scatter rollout record.

For current Scatter token provenance, stale sibling snapshots, colour authority,
and source-location options, see
[`scatter-source-reconciliation.md`](./scatter-source-reconciliation.md).

## What exists

- Permanent atomic `--fs-*` primitives with independent typography modes.
- Generic role-local `base`, arbitrary `variants`, and explicit `displayOrder`;
  no default-theme names in core.
- Optional explicit anchor derivation through `deriveTypographyRange()`.
- Strict prepared-font capability validation with no weight remapping.
- Verified style/weight combinations, OpenType feature checks, and custom-axis checks.
- Role-bound public variables: physical font IDs do not leak into CSS names.
- Configurable ordinary-class `.text--…` global helpers, opt-in zero-specificity
  `:where()` helpers, and a typed CSS Module,
  all kebab-case.
- A literal TypeScript contract suitable for a future local `Text` component.
- An interactive/static HTML calibration specimen with rendered metric guides
  and resettable controls.
- License-aware font inspection, automatic web-format strategy, verified WOFF2
  conversion, and target-relative `@font-face` placement.
- Exact per-style/per-weight adjusted fallback measurements for physical normal
  and italic faces, private fallback faces, a factual provenance manifest, and
  explicit specimen comparison states.
- A transactional one-command project build and hashed artifact manifest.
- The old coupled typography theme isolated under `themes/legacy`.

Colour-generation implementation files were not changed as part of the typography correction.
No Scatter files were changed and no npm package was published.

## Review in this order

1. [`packages/themes/src/default/typography.ts`](../packages/themes/src/default/typography.ts)
   — every default-theme opinion is visible.
2. [`packages/core/src/types.ts`](../packages/core/src/types.ts) and
   [`packages/core/src/typography/authoring.ts`](../packages/core/src/typography/authoring.ts)
   — the generic public kernel and opt-in helper.
3. [`packages/core/src/generator/validate.ts`](../packages/core/src/generator/validate.ts)
   — face, weight, style, feature, axis, collision, and recipe validation.
4. [`packages/core/src/generator/typography.ts`](../packages/core/src/generator/typography.ts)
   — role-bound tokens and structured contract.
5. [`packages/core/src/transformers/typography-css.ts`](../packages/core/src/transformers/typography-css.ts),
   [`typography-typescript.ts`](../packages/core/src/transformers/typography-typescript.ts), and
   [`typography-specimen.ts`](../packages/core/src/transformers/typography-specimen.ts)
   — the three semantic consumers.
6. [`packages/cli/src/fonts/prepare.ts`](../packages/cli/src/fonts/prepare.ts),
   [`fallback-metrics.ts`](../packages/cli/src/fonts/fallback-metrics.ts),
   [`adjusted-fallbacks.ts`](../packages/cli/src/fonts/adjusted-fallbacks.ts), and
   [`packages/cli/src/project-build.ts`](../packages/cli/src/project-build.ts)
   — font evidence, measured fallbacks, and the atomic portable build.
7. [`examples/typography/theme.ts`](../examples/typography/theme.ts) and
   [`examples/typography/tfs.config.example.ts`](../examples/typography/tfs.config.example.ts)
   — explicit Supreme/JetBrains examples.

Run `pnpm typography:review` to produce a disposable review bundle in the
operating-system temp directory. The script builds a temporary copy of the
holistic project and does not replace `examples/project/generated`.

## Verification snapshot — 22 July 2026

- `pnpm check:release`: 160 core tests, 60 CLI tests, both type suites, zero
  Svelte diagnostics, every workspace build, and the isolated packed-consumer
  test passed.
- `pnpm audit --prod --audit-level=moderate`: no known vulnerabilities.
- Core, themes and CLI tarball dry-runs contained their intended declarations,
  executable and exports.
- Real `pnpm pack` tarballs rewrote `workspace:^` dependencies to ordinary
  semver, installed together in a clean disposable consumer, and built the
  complete 10-file default project successfully.

No package was published. The three public package manifests are prepared as one
coordinated `0.2.0` release, and the release check proves their packed form works
together without workspace-only resolution. Follow [`releasing.md`](./releasing.md)
and let Scatter consume a canary before any `latest` promotion.

## Key invariants to challenge

- Changing a physical font ID never changes public role token names.
- A role's base has no `base`, `m`, or `default` suffix.
- Role and variant names are arbitrary except CSS-safety and reserved helper
  namespaces; flattened collisions fail before output.
- Missing font cuts/styles fail with available capabilities; nothing silently
  adapts.
- `min`/`max` weight aliases, when present, are honest role-local endpoints.
- CSS cannot advertise a style/weight pair the typed contract forbids.
- Non-interpolable font settings are never silently chosen by the range helper.
- Failed project builds leave the previous owned output untouched.
- Typography output does not alter color generation.

## Future Scatter `Text` blueprint

The generated consumer contract represents the base as no variant:

```tsx
<Text as="p" role="prose" />
<Text as="h2" role="heading" variant="l" weight="max" />
<Text as="span" role="label" variant="s" weight="lo" />
<Text as="em" role="prose" fontStyle="italic" weight="lo" />
```

TFS remains build-time only. Scatter's component would import the generated CSS
Module and TypeScript contract locally. It should add no color or margin.

Putting `Text` inside `Button` is not intrinsically bad. The ownership issue is
whether every caller must reconstruct button typography. A sound implementation
lets `Button` own its default selection, possibly by composing `Text` internally,
while preserving an explicit escape hatch for rich or exceptional labels.

## Current production boundary (read-only audit)

Scatter/Splinter currently depends on `@three-forma-styli/core` `^0.1.3`; it does
not consume the CLI or themes packages at runtime. Its TFS imports are in the
theme color builder and luminance validation path. Typography is still owned by
`apps/main/src/css/typography.css`.

The committed JetBrains Mono file inspected as an upright variable face covering
100–800, while Scatter's current `@font-face` descriptor claims 100–900. No italic
face is declared. A future rollout must correct the range and add a real italic
face before exposing italic label selections. This branch intentionally does not
modify the dirty Splinter worktree.

## Decisions still requiring visual review

- The exact Supreme line-height/tracking anchors at multiline display sizes.
- The first-pass Supreme prose/heading and JetBrains Mono label weight choices in
  the Scatter source project.
- Observed geometry and swap behavior for the generated adjusted fallbacks in
  representative browsers and platforms. Measurement and emission are implemented
  and inspectable; TFS does not own a human approval state.
- Preload policy and subset policy; neither should be inferred from mere file
  availability.

Supreme's official delivery route and local technical proof are now known, but
publishing or self-hosting it remains blocked on the project owner's review of
the actual license terms. TFS's font checks record technical evidence and
project attestations; they do not grant legal permission.

## Positioning

TFS is not merely a token transport tool. Its useful territory is turning a small,
deliberate foundation into coordinated outputs while keeping every opinion
inspectable. Typography follows that rule by combining explicit role anchors with
optional derivation—not by teaching core that a word such as `heading` has a
universal line height.
