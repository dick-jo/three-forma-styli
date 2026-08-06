# v0.5 domain audit: spacing, gap, borders, time, motion, and shadows

This audit separates proven behaviour from legacy source shape. It deliberately
does not retrofit the deferred generic-axis model or rename public fields without
an explicit workshop verdict.

## Executive status

| Domain        | Keep now                                                                    | Correct before v0.5 migration                                      | Defer behind an explicit verdict                             |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Spacing       | multiplicative atomic scale, `min` boundary                                 | exact input validation; ordered-scale and stable-identity checks   | shared `size` axis source shape                              |
| Gap           | references to Spacing; compact semantic choices                             | reject misleading unit conversion; validate ordered resolved range | final range vocabulary and automatic axis following          |
| Border radius | references to Spacing; compact semantic choices                             | same unit and ordering issues as Gap                               | final range vocabulary and automatic axis following          |
| Border width  | one deliberate scalar in the common case                                    | stop requiring duplicate unchanged modes                           | optional axis overrides when width genuinely changes         |
| Time          | simultaneous named scales; references consumed by Motion                    | require CSS time units and a genuinely ordered atomic scale        | whether numerical step identities remain the lasting grammar |
| Motion        | property-agnostic composites, easing references, explicit reduced behaviour | distinguish ordered ranges from categorical variants               | exact range vocabulary and derivation helper                 |
| Shadow        | ordered multi-layer composites and typed Color/Alpha references             | distinguish ordered ranges from categorical variants               | exact range vocabulary and derivation helper contract        |

## Cross-domain finding: today has categories, not axes

The current IR knows two switchable categories: Color and Size. Spacing,
Typography, Gap, Border radius, and Border width independently repeat local
`modes`; the generator merges equally named overrides and the CSS transformer
routes them through the Size selector. This works, but the relationship is
implicit and name-based.

That is the legacy mechanism which the ratified Axis model will eventually
replace. The migration must be explicit because an axis needs to answer:

- which domains participate;
- which domain follows another domain by reference;
- whether an axis is author- or environment-controlled;
- how independently active axes resolve collisions.

Until that model exists, v0.5 must not merely rename `modes` to `axes`. That would
change vocabulary without fixing the source model.

## Spacing

### Proven

- `--sp-min` plus `--sp-1…n` is a compact, useful atomic Scale.
- The multiplier formula is transparent and easy to author.
- Every mode preserves the consumer-facing token names.
- Generated raw values, units, and mode evidence are available in the IR and
  Workbench.

### Concrete gaps

- Unknown fields inside a spacing token object are not rejected at runtime.
- `min` is not required to be lower than `base`, so the supposed minimum can
  duplicate or exceed `--sp-1`.
- Different modes may declare different `range` values. Missing override tokens
  then silently inherit from the default mode, producing a partly switched
  Scale instead of one stable identity set.
- Family-local modes duplicate an axis decision that should eventually be
  declared once.

### Recommendation

Keep its generated CSS grammar. Harden the exact input and ordered-scale
invariants now. Require every mode participating in the same current Size
category to expose the same scale identities. Move the authoring source to a
shared Axis only with the complete generic-axis implementation.

## Gap and Border radius

These two domains currently have the same structure and should continue sharing
machinery.

### Proven

- They deliberately reference Spacing rather than inventing another ruler.
- Reference metadata preserves both the semantic choice and resolved value.
- Their small semantic ranges prevent arbitrary one-off values in consumers.

### Concrete gaps

- The fixed range is `min / s / l / max`, with no unsuffixed `base`. This may be
  an intentional compact contract, but it has not yet been reconciled against
  the ratified Range grammar used by Typography.
- Every Size mode repeats the same mapping merely to follow a corresponding
  Spacing mode.
- `spacingMode` selection falls back through matching names and then the default.
  That is convenient but implicit; a typo can select a different ruler unless
  validation sees an explicit reference.
- An optional `unit` can relabel a resolved Spacing number without converting
  it. For example, Spacing `8px` can become Gap `8rem`. That is not a valid
  reference operation and should be removed or replaced with an explicit
  absolute-value escape hatch.
- Resolved `min / s / l / max` values are not checked to be strictly ordered.

### Recommendation

Preserve the four public CSS identities until the range-vocabulary verdict.
Remove the misleading unit relabelling. Make ordered resolution mandatory. In
the eventual Axis model, an unchanged Gap/Radius mapping should be authored once
and follow the active Spacing mode automatically; only a genuinely different
mapping should require an override.

## Border width

### Proven

- A single structural width is the correct common-case opinion.
- Zero remains a valid authored boundary where a system intentionally removes a
  border.

### Concrete gap

The default theme repeats `1px` for `default`, `small`, and `large` even though
the design decision does not vary. This is source noise and falsely suggests
that Border width participates in the Size axis.

### Recommendation

Make the default authoring shape one scalar. Allow axis-specific overrides only
when the value actually changes. Continue emitting the existing unsuffixed
`--bdw` token.

## Time

### Proven

- Named Time scales are simultaneous namespaces, not switchable modes.
- The default scale receives ergonomic `--t-*` names; additional scales receive
  `--t-{identity}-*` names.
- Motion references a scale and step explicitly and exposes milliseconds and
  seconds in its generated contract.

### Concrete gaps

- Time accepts any syntactically CSS-like unit until Motion happens to consume
  it. A standalone Time system can therefore emit an invalid duration such as
  `100px`.
- `base: 0` creates an entire scale of duplicate zero values. Reduced Motion now
  has an explicit semantic override, so zero is no longer a defensible Time
  Scale.
- `min` is not required to be lower than `base`.
- Unknown fields inside a scale token object are not rejected at runtime.

### Recommendation

Keep simultaneous named scales and existing CSS names. Require `ms` or `s`, a
positive base, and `0 <= min < base`. Keep literal zero as a Motion policy value,
not an atomic Time scale. Defer changing numerical step identities until a real
consumer demonstrates that another fixed vocabulary is better.

## Motion workshop boundary

The conceptual core is strong:

- composites are property-agnostic fragments of duration, easing, and delay;
- call sites own selectors and animated properties;
- named easings are portable to CSS and JavaScript engines;
- every composite makes a deliberate Reduced Motion decision.

The unresolved mismatch is structural: stock `min / lo / base / hi / max`
choices are ordered strengths, but the public field calls them `variants`.
Under the ratified grammar they are a Range, while a true Variant is categorical
and may change several coupled decisions.

The next workshop must decide:

1. whether every Motion identity owns the fixed sparse range
   `min / lo / base / hi / max`;
2. whether `base` is required and unsuffixed, matching Typography and Shadow;
3. whether derivation interpolates only duration, or may interpolate Bézier
   control points and delay;
4. whether categorical variants are needed in v0.5 at all;
5. whether Reduced Motion overrides the base and range positions independently,
   or continues inheriting as it does today.

Recommendation: formalise the ordered Range; retain current explicit Reduced
Motion inheritance; interpolate duration only by default; require explicit
easing choices because interpolated curves are rarely meaningful design intent.

## Shadow workshop boundary

The conceptual core is also strong:

- Box and Text shadows are distinct grammars;
- each value is an ordered multi-layer Composite;
- colors and Alpha positions are semantic References;
- the helper refuses to invent layer pairing, inset state, or color transitions.

Again, stock `min / lo / base / hi / max` choices are a Range currently stored
under `variants`. `deriveShadowRange()` already exposes the real concept while
returning the older field shape.

The next workshop must decide:

1. whether every Shadow identity owns the same fixed sparse range;
2. whether sparse authoring follows the same endpoint rules as Typography;
3. whether Box and Text share the range grammar while retaining different layer
   grammars;
4. whether categorical Shadow variants have a real use case beyond distinct
   Shadow identities;
5. whether interpolation remains authoring sugar whose complete resolved layers
   appear in evidence and Workbench.

Recommendation: promote the existing helper's Range concept into the source and
contract; keep Box/Text separate; keep interpolation optional and inspectable;
do not add categorical variants until a real coupled alternative requires one.

## Safe implementation sequence

1. Add exact-object and ordered-scale validation without changing output names.
2. Resolve the Gap/Radius four-position range verdict.
3. Resolve Motion and Shadow Range vocabulary together.
4. Change authored source and generated contracts with a migration guide and
   golden output fixtures.
5. Implement shared Axes separately; do not hide them inside this domain cleanup.
6. Rebuild the stock example and exact Scatter review workspace after each
   public change.
