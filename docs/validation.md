# Validation and failure policy

TFS expands a compact input into many downstream artifacts. A silent typo at the
source therefore has a larger blast radius than a typo in ordinary hand-written
CSS. The generator follows one rule: deterministic author intent is accepted;
ambiguous, lossy, unsupported, or silently overwritten input fails before output.

## Names

Mode names, color token names, alpha levels, typography fonts/roles/variants,
weight aliases, and configurable namespaces must be CSS-token safe:

```text
letter, followed by letters, numbers, or hyphens
```

Names are author-owned. TFS does not impose `prose`, `heading`, `label`, `min`,
`lo`, or any other semantic vocabulary. It only rejects values that cannot enter
the stable CSS/TypeScript output safely.

Every family must have unique mode names and at most one explicit default. When no
mode is marked, the first remains the deliberate backwards-compatible default.

Families in one category do not need identical override sets. A mode may affect
only typography, for example. Reusing the same size-mode name across spacing,
gap, typography, radius, and width intentionally combines their declarations
under one selector; omitting that name from a family leaves its defaults intact.
Semantic typography font-size aliases are rebound in every authored typography
mode; other semantic role properties remain inherited because the mode does not
change them.

## Numbers and units

- All numeric inputs must be finite. `NaN` and infinities never reach formatting.
- OKLCH lightness is `0..1`; chroma is any non-negative finite value, so
  wide-gamut/P3 author intent is not artificially capped; hue may be any finite
  angle and wraps according to CSS.
- Base colors are opaque. Transparency belongs to the alpha schedule so derived
  output remains consistent and inspectable.
- Alpha schedule values are finite and `0..1`.
- Size/time ranges are positive integers. Spacing, typography, border, and time
  measurements enforce their documented positive/non-negative constraints.
- Units are plain CSS unit identifiers such as `px`, `rem`, `%`, `ms`, or `s`;
  punctuation that could terminate a declaration is rejected.

## References

Gap and border-radius values reference an actual spacing primitive: `"min"` or an
integer from `1` through the selected spacing mode's range. An explicit
`spacingMode` must exist. Omitting it still follows the documented resolution:
same-named spacing mode when available, otherwise the spacing default.

Typography semantic recipes reference a generated atomic font-size step and an
explicit role-local weight. Prepared fonts prove requested physical styles,
weights, OpenType features, and variation axes. No unsupported cut is remapped or
synthesized.

## Output collisions

After every family is expanded, TFS checks the complete default set and every mode
override for duplicate custom-property names. This catches collisions caused by:

- an authored name overlapping a derived alpha/recipe name;
- two configured family prefixes becoming identical;
- two families independently generating the same destination.

The build fails with both source families and the affected mode instead of letting
object assignment silently choose a winner.

## Stable structure versus configurable policy

Projects control semantic names, family prefixes, selector templates, output
locations, font URL policy, typography class namespace, and specificity.

TFS owns structural separators and the three mode categories (`color`, `size`,
and `time`). Earlier prototypes exposed `separators` and `modeCategories` options,
but the generators never consumed them. They were removed before `0.2.0`; a
configuration option that succeeds while doing nothing is worse than an explicit
product boundary.

## Testing validation

Validation is exercised through the same public `generate()` entry point used by
`generateCss()`, project builds, Figma serialization, and generated system
contracts:

```sh
pnpm --filter @three-forma-styli/core test
```

Project builds additionally validate output ownership, path containment, font
licence attestations, prepared capabilities, URL policy, and artifact collisions
before atomically replacing the previous generated directory.

Generated projects use a strict write/check split:

- `npm run generate` deliberately replaces the TFS-owned output;
- `npm run build` and `npm run check` validate committed output and never write;
- `npm run check:generated` performs a full private regeneration and fails on
  byte drift without repairing it.

The repository release gate then packs the actual npm tarballs, installs them
through ordinary package-manager resolution, scaffolds standalone and workspace
projects, packs the generated design-system package, type-checks its CSS Module
export, and creates a production browser bundle. CI runs the matrix on Linux
Node 22/24 and the path/install/package checks on Windows Node 22.

URL-bearing generated paths are encoded segment-by-segment. Spaces, `#`, and
Unicode remain valid filenames; ambiguous query/fragment prefixes and
cross-platform filesystem-reserved names fail before generation.
