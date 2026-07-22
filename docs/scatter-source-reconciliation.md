# Scatter design-system source reconciliation

Status: read-only audit on 2026-07-22. No Scatter repository was modified.

## Authority and provenance

`/Users/dickjones/project-local/splinter` is the only current production source.
It is the `guminc/scatter` Git repository, and its relevant token and typography
files are clean. The sibling `tfs-scatter-master` and `tfs-scatter` directories
are unversioned reconstruction/sandbox snapshots, not deployable authorities.

Splinter commit `4168c5b4b` records the May 21 `tfs-scatter-master`
reconstruction being imported into production. Later production commits add
Robinhood (`0500ab716`) and remove Monad Testnet (`e6c7bbc16`). Rebuilding the
May snapshot unchanged would therefore regress production.

After numeric normalization, shared token values match. The meaningful
membership differences are:

| State            | Production only      | Old snapshot only            |
| ---------------- | -------------------- | ---------------------------- |
| Network tokens   | Robinhood (8 tokens) | Monad Testnet (8 tokens)     |
| Runtime theme    | —                    | static nonon-ten (40 tokens) |
| App-owned assets | 2 logo URL variables | —                            |

Robinhood's current source value is `oklch(0.88 0.22 135)`; its positive-polarity
runtime variant uses `L = 0.38`. Nonon Ten is a canonical first-party theme, but
it is intentionally applied by Scatter's runtime theme machinery rather than a
static selector. Its source values belong in the new canonical project; restoring
the stale static selector is a separate integration choice. Logo URLs are
application assets, not TFS design tokens.

## Current theme application contract

Scatter has three canonical first-party choices:

- default/dark is the absence of an override and falls through to production
  `:root` values;
- Light is a complete positive-polarity runtime preset;
- Nonon Ten is a complete positive-polarity runtime preset.

Light and Nonon are serialized as full `{ themeData }` payloads in a one-year
cookie, not stored by stable preset ID. Collection themes use a separate nullable
database JSON string shaped as `{ themeData?, logoSmallUri?, logoLargeUri?,
logoTint? }`. On `/c/:slug` and `/collection/:slug`, a collection payload shadows
the user's preference. Scatter then replaces one late
`<style id="custom-theme-styles">` containing generated `:root` core ramps,
optional logo variables, and positive-polarity universal-color overrides.

The static `[data-theme-mode="light|small|large"]` selectors still present in
production CSS are not set by application code. They are dormant compatibility
artifacts, not the live theme-switching path.

This reveals several application defects to address during rollout, not in TFS
core:

- saving no collection customization serializes `"{}"` instead of database
  `null`; the truthy raw string shadows user preference while the parsed empty
  object leaves the picker enabled;
- the server validator describes an obsolete top-level `{ polarity, colors }`
  shape, while the client persists nested `{ themeData: { ... } }`; optional
  fields allow the nested payload to pass effectively unvalidated;
- parsed cookie and database payloads are casts rather than runtime validation;
- full native theme values in cookies become stale when a preset changes;
- initial HTML is dark, then user and collection overrides arrive from effects
  and a client query, so theme flashes are possible.

There is also one exact source discrepancy: the runtime builder seeds default
`pri` chroma as `0.1163`, while authoritative production root CSS uses `0.1164`.

## Colour authority

Old experimental colour-conversion output in the stale sandboxes is not
canonical input for the new project.

Scatter's installed npm `@three-forma-styli/core@0.1.3` also gamut-maps authored
OKLCH through sRGB before emitting runtime CSS. For example, an input near
`oklch(.5 .1 180)` becomes approximately `oklch(.5041 .0921 179)`. Meanwhile,
one editor preview path writes raw OKLCH. That inconsistency is a credible source
of the dull-color behaviour and preview/live disagreement.

The practical requirement is simpler: current production Scatter colours are
the accepted visual authority and must remain equally vibrant. Future generation
should be compared against current production output and browser rendering, not
against stale experimental output. No existing color route should
silently inherit a new gamut policy.

## Typography production facts

Only `splinter/apps/main/src/css/typography.css` is authoritative. Current files:

- JetBrains Mono variable upright: actual `wght` 100–800; CSS incorrectly says
  100–900.
- Work Sans variable upright: actual `wght` 100–900.
- PP Nikkei Maru static cuts: actual 300, 400, and 800.
- no JetBrains italic file, despite at least one italic request;
- a navigation rule requests JetBrains 900, which the physical font cannot
  supply.

The existing global element selectors, `font` shorthands, and metric-adjusted
fallback faces are compatibility input—not the target architecture.

## Source-of-truth location options

### A. A tracked package inside Splinter

Example: `packages/scatter-design-system` or `apps/main/design-system`.

Benefits:

- source changes and consuming application changes are one atomic commit;
- no unpublished-package/version drift during early calibration;
- Scatter runtime theme generation can import the same palette foundation;
- CI can regenerate and reject a dirty diff;
- production history remains discoverable in the repository that deploys it.

Trade-off: this source is app-local until intentionally extracted or published.
That is appropriate while Scatter is the only consumer.

### B. A new sibling `~/project-local/tfs-scatter` repository (selected)

This matches the selected physical layout and cleanly separates the project
from application code. It must be a real Git repository, not another unversioned
sandbox.

The requested path already exists as a roughly 71 MB unversioned sandbox with
dependencies and generated artifacts. It must be preserved, renamed or
deliberately adopted before scaffolding; the canonical build must not overwrite
it by assumption.

To be safe, it must be a real Git repository with a pinned TFS dependency,
build manifest, provenance README, and an explicit install/sync contract into
Splinter. Without those pieces it repeats the failure mode of the two existing
unversioned snapshots.

Trade-off: every source change becomes a coordinated two-repository operation.
That is useful after the contract stabilizes, but extra failure surface during
pixel calibration.

### C. Source in Splinter, portable review/build bundle outside it

Keep option A as authority while a generated/disposable sibling bundle provides
easy specimen review and future extraction evidence.

This gives the requested inspectable `tfs-scatter` workspace without making the
copy authoritative. The manifest must name its source commit.

## Recommended clean structure

```text
scatter-design-system/
├── foundation.ts        # alpha schedule, palette and network source values
├── typography.ts        # explicit role recipes; derivation is optional
├── fonts/               # licensed sources + attestations, or documented inputs
├── tfs.config.ts        # one build command and explicit output policy
├── regression/
│   └── production-token-baseline.css
├── generated/
│   ├── system.tokens.css
│   └── scatter-theme-manifest.ts
└── README.md             # provenance, review and rollout instructions
```

The generated, versioned runtime manifest should expose canonical preset IDs and
data, core color names, alpha schedule, positive-polarity universal policy and
validation constants. Scatter consumes that manifest instead of maintaining a
second copy. App-owned logo URLs remain outside generated token CSS.

The source project owns Scatter's visual parameters: canonical presets, palette,
atomic systems and output policy. Scatter continues to own route
resolution, React state, cookies, database envelopes/migrations, user uploads,
pixelated rendering and DOM application. The app's chain registry owns which
networks exist; CI should enforce that registry and visual-token membership agree
in both directions.

## Pixel-perfect typography calibration

Scatter should author complete role recipes explicitly. `deriveTypographyRange`
is an optional drafting helper, not required architecture.

The calibration loop can be evidence-driven:

1. Inspect and hash every actual font file; reject nonexistent weights/styles.
2. Inventory current callsites and cluster intentional typography patterns,
   without treating every historical one-off value as a desired token.
3. Encode explicit role-local `base` and variants.
4. Generate the specimen with the actual prepared faces.
5. Compare current and candidate screens at representative dense, wrapping and
   responsive states.
6. Adjust source tuples, not generated CSS; use the copyable specimen patch.
7. Gate cutover on line wrapping, control geometry, invalid raw weights,
   synthesis, fallback swap behavior, and a semantic token diff.

An AI can do the inventory, generate candidate clusters, measure browser
geometry, surface anomalies, and apply iterative source changes. It cannot infer
the intended aesthetic from metrics alone; final tuple acceptance remains a
visual design decision.

## Cutover gates

- exact semantic diff against current production tokens;
- Robinhood present, Monad Testnet absent, Nonon Ten source canonical but runtime
  application unchanged until explicitly migrated;
- current production colour values and vibrancy preserved;
- every exposed font weight/style backed by a physical face;
- old typography remains available during the first canary;
- deterministic build plus `git diff --exit-code` in CI;
- one atomic source + consumer rollout after the canary passes.
