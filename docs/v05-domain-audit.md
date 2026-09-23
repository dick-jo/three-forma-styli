# v0.5 domain audit: spacing, gap, borders, time, motion, and shadows

This audit separates proven behaviour from legacy source shape. It deliberately
does not retrofit the deferred generic-axis model or rename public fields without
an explicit workshop verdict.

The [Founder Board's overhaul milestones](./founder-board.md#overhaul-milestones)
govern this audit. We are in blueprint and ratification. Implementation gaps below
are inputs to the later architecture and runbook milestone, not an instruction
to begin development as each domain is ratified.

Every domain now requires a reviewed representative authoring mock before its
workshop is considered ready to move on. The Founder Board records the standard:
gold-standard usage, immediate readability of the domain definition, inline
authoring where practical, meaningful case coverage, and visible output. Check
mock coverage for previously ratified domains before closing the whole blueprint;
their existing verdicts remain valid.

The [workshop progress list](./v05-workshop-progress.md) records current readiness
and the recommended sequence across the whole blueprint.

## Executive status

| Domain        | Keep now                                                                            | Correct before v0.5 migration                                             | Defer behind an explicit verdict                     |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Spacing       | multiplicative atomic scale, `min` boundary                                         | exact input validation; ordered-scale and stable-identity checks          | shared `size` axis source shape                      |
| Gap           | references to Spacing; ratified `min / s / l / max` range                           | reference, unit, and ordering validation implemented in foundation        | automatic axis following                             |
| Border radius | references to Spacing; ratified `min / s / l / max` range                           | same validation as Gap, implemented in foundation                         | automatic axis following                             |
| Border width  | one deliberate scalar in the common case                                            | stop requiring duplicate unchanged modes                                  | optional axis overrides when width genuinely changes |
| Time          | simultaneous named scales; ratified `min / lo / hi / max` values                    | implement keyed scales with `defaultScale`, `unit`, and explicit `values` | standard-theme numerical calibration                 |
| Easing        | ratified Bézier and Linear forms, helper contract, semantic vocabulary              | independent structured pool, helpers, and Workbench editing               | theme calibration                                    |
| Motion        | independent Time/Easing foundations; call sites own animation choices               | triage the inherited composite code and consumer dependencies later       | composites explicitly parked for this overhaul       |
| Shadow        | ratified flat catalogue, complete ranges, inline Color expansion, consumer boundary | replace the inherited base/variants shape and preserve scoped references  | shared Axis syntax; later standard-theme calibration |

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
- The foundation validates all four positions, rejects unknown explicit Spacing
  modes and unit relabelling, and requires strictly increasing resolved values.

### Ratified verdict — 2026-09-09

Gap and Border radius each retain `min / s / l / max`, with no `base` position
and no generated unsuffixed `--gap` or `--bdr` token. A Range does not universally
require a default position; consumers can choose their own default from its
available positions.

The approved foundation already implements this shape, so this verdict requires
no generator change or numerical recalibration. Typography retains its separately
ratified role-local `min / s / base / l / max` grammar. The five-position
Gap/Radius implementation preserved on `codex/v05-foundation` is a superseded
prototype, not the approved contract.

### Remaining axis work

- Every Size mode repeats the same mapping merely to follow a corresponding
  Spacing mode.
- `spacingMode` selection falls back through matching names and then the default.
  This relationship remains implicit when no explicit reference is authored.

### Recommendation

Preserve the ratified four-position contract and existing validation. In the
eventual Axis model, an unchanged Gap/Radius mapping should be authored once and
follow the active Spacing mode automatically; only a genuinely different mapping
should require an override.

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

### Foundation validation already implemented

The current numerical scale requires `ms` or `s`, a finite positive `base`,
`0 <= min < base`, and a positive integer `range`; unknown token-object fields
are rejected. This `base` is a scale-generation input, not a ratified universal
semantic position.

### Ratified verdict — 2026-09-09

Time values are property-agnostic: the same `--t-*` tokens can supply either
duration or delay. A separate delay domain or token family is unnecessary for
the stated use case.

Every scale has four required, explicit, strictly increasing values,
`min / lo / hi / max`, without an unsuffixed base. Authors can add a named scale
such as `anim`, giving
`--t-anim-min` and its companion positions alongside the short `--t-*` scale.
Alpha is the ratified analogue: one selected scale receives short names, while
additional identities receive namespaced names and remain available together.
`anim` is a Time scale identity, not a new Family or a switchable Mode.

The ratified authoring shape is `time: { defaultScale, scales }`, with each
authored scale identity containing `{ unit, values }`. `defaultScale` explicitly
selects the scale receiving short names; it creates no extra position. This
replaces the existing array of scales and the numerical `base`/`range` inputs.
The complete example is recorded in the Founder Board; its numbers remain
illustrative, pending standard-theme calibration.

Implementation and migration from numerical steps remain pending. They must
carry the ratified positions through references, generated contracts, CSS,
resolved evidence, and downstream transforms.

## Easing and Motion workshop boundary

The current workshop supersedes the earlier recommendation to formalise Motion
composite ranges first. Establish Time and an independent Easing pool before
deciding what additional value composites provide. Call sites continue to own
selectors and animated properties.

The standard-theme identity vocabulary is ratified in the Founder Board:
`neu / pri / duo / tri / tet / pen`, with custom authored identities still
possible. For Easing, `neu` directly owns the chosen neutral curve, and `pri`
directly owns the chosen primary accent curve. If that accent is a bounce,
`pri` contains its definition; it need not reference another identity named
`bounce`. Neither `default` nor all six accent/neutral entries are required.
The names describe roles; they do not fix the same curve in every theme.

Reusable bounce support is an explicit product requirement. A standard theme
should provide usable definitions without making authors reconstruct bounce
behaviour. Optional helpers or shared definitions may help author those values,
but a separate preset registry is not a required part of the model.

Implementation is still pending: the current Easing type only accepts a
four-number cubic Bézier tuple, and Motion validation requires composites.
The exact curve representation must support the intended bounce and preserve
meaning across CSS, TypeScript, and resolved evidence. Figma exports only its
supported subset and may report an easing as unavailable; native playback parity
is not required. The two supported forms, helper signatures, and return shapes
are ratified below.
Illustrative `easingPresets.*` notation was not a ratified API.

The later founder verdict explicitly parks Motion composites for this overhaul:
there is no immediate use case. Their range, categorical variants, and composite
Reduced Motion authoring are deferred. The inherited `min / lo / base / hi / max`
shape is implementation evidence, not approval of a required `base` or future
grammar. The architecture/triage milestone will decide what to do with that code
and any consumers; the blueprint workshop makes no source changes.

### Ratified conventional Easing forms — 2026-09-09

The founder supports structured, inspectable values and optional authoring
helpers, but rejects a bespoke `bounce({ count, decay })` value type. That
unratified proposal is withdrawn. Most authored values will be cubic Bézier
curves; other support should follow established token or CSS primitives.

The later simplicity verdict removes Steps from the earlier three-form scope.
Local CSS can express that niche behaviour directly. TFS does not mirror every
CSS feature as a token type or editor, and does not offer a Steps helper.

The ratified scope is a small typed model covering:

| Form         | Authored data                     | Purpose                                                       |
| ------------ | --------------------------------- | ------------------------------------------------------------- |
| Cubic Bézier | Four numbers, `x1 / y1 / x2 / y2` | Ordinary easing and overshoot; the main authoring path        |
| Linear       | Ordered input/output points       | Constant speed or a custom curve, including a repeated bounce |

The DTCG format standardises `cubicBezier`; Linear is a conventional CSS form,
not an additional DTCG token type. CSS keywords such as `ease-in` can
resolve to their defined primitives without creating additional value kinds or
mandatory semantic identities.

An independent top-level `easings` map directly owns these definitions. Small
constructors can return plain typed data, following the existing `oklch()`
helper. A four-number tuple is already structured and editable: the Workbench
can label its coordinates without requiring four separately named object fields.
The accepted common shape is `{ type, value }`. The
[Time/Easing authoring contract](./v05-time-easing-contract.md) specifies
`cubicBezier(x1, y1, x2, y2)`, `linear()`, and `linear(points)`, their return
types, the `[input, output]` coordinate convention, and a complete example.
The authoring/helper verdict is complete; numerical calibration remains open.

Agreed Bézier authoring pattern, not an existing export; values are illustrative:

```ts
const easings = {
	neu: cubicBezier(0.2, 0, 0.38, 0.9),
	pri: cubicBezier(0.34, 1.56, 0.64, 1),
};
```

The second curve overshoots and settles; it is not a repeated-bounce curve.
Reusable multi-bounce support remains available through Linear point data
supplied by a standard theme, without inventing a bounce-specific grammar or
physics engine. Themes own those calibrated values. Authoring a curve once
makes it reusable through its semantic identity.

Generate `--ease-{identity}` independently of Time or Motion composites. Each
identity has one value; no ordered positions or default alias are generated.
CSS strings are output. Workbench controls and review patches should edit the
authored coordinates or points, and preview the same values that
generation emits. Current Motion review cases have no editing controls; these
controls and their patch integration remain implementation work.

### Ratified library decision — no dependency added

Implement the small constructors, validation, and serialization in TFS. The
existing core already validates and formats cubic Bézier tuples. Workbench can
draw the curve as an SVG path and delegate actual playback to the browser, so
this scope does not require a JavaScript easing engine.

If a later feature needs numerical Bézier evaluation at a given time progress,
consider the focused [bezier-easing](https://github.com/gre/bezier-easing)
library. That operation involves inverting the curve's x coordinate; it is more
subtle than formatting four values. It is unnecessary solely for token authoring
or CSS preview, and must not become a dependency of generated token modules.

[d3-ease](https://d3js.org/d3-ease) and
[Motion's easing functions](https://motion.dev/docs/easing-functions) provide
evaluators and named behaviours, rather than a serializable token schema.
Neither is needed for the ratified core grammar. Existing easing definitions
may inform theme calibration without becoming new public TFS token kinds.

The [CSS Easing specification](https://www.w3.org/TR/css-easing-2/) defines the
function families and demonstrates a reusable bounce using `linear()`.
[Figma's prototype Transition API](https://developers.figma.com/docs/plugins/api/Transition/)
exposes Bézier and spring curves, without an arbitrary piecewise-linear curve
field. The [DTCG 2025.10 format](https://www.designtokens.org/tr/2025.10/format/#cubic-b%C3%A9zier)
defines `cubicBezier` values as four numbers. Therefore broader easing support
must not be constrained to that export type. Keep the complete curve in CSS,
TypeScript, and TFS evidence; the Figma adapter can report unsupported export.
Do not label a sampled bounce as a cubic Bézier or silently substitute another
curve. The founder explicitly accepts limited Figma coverage and does not need
native transition playback. Any supported mapping and diagnostic belongs in the
adapter, without Figma-specific branches in core easing validation or generation.

## Shadow workshop boundary

The opening observations and questions below describe the inherited implementation
and earlier audit. The ratified workshop update supersedes them.

The conceptual core is also strong:

- Box and Text shadows are distinct grammars;
- each value is an ordered multi-layer Composite;
- colors and Alpha positions are semantic References;
- the helper refuses to invent layer pairing, inset state, or color transitions.

Again, stock `min / lo / base / hi / max` choices are a Range currently stored
under `variants`. `deriveShadowRange()` already exposes the real concept while
returning the older field shape.

The earlier audit proposed the following questions; none establishes a required
feature merely because the current code or helper supports it:

1. whether every Shadow identity owns the same fixed sparse range;
2. whether sparse authoring follows the same endpoint rules as Typography;
3. whether Box and Text share the range grammar while retaining different layer
   grammars;
4. whether categorical Shadow variants have a real use case beyond distinct
   Shadow identities;
5. whether interpolation remains authoring sugar whose complete resolved layers
   appear in evidence and Workbench.

### Shadow workshop update — 2026-09-10

The founder has ratified one flat catalogue of complete `min / lo / hi / max`
ranges and reviewed the representative mock. The Shadow workshop is complete.
The [current mock and full token expansion](./blueprints/shadow/README.md) put
`unit`, optional `defaultRange`, and `ranges` directly under `shadows`. Authored
identities such as `neu`, `inset`, and `text` are siblings; a color-expansion helper
appears inline and writes a shared glow once for several Color identities.
There are no separate Box/Text authoring sections or helper overloads.

The real CSS property differences remain: text-shadow cannot use spread or inset.
The ratified boundary is that TFS validate its own token definitions and emit
them faithfully, while the consumer chooses an appropriate CSS property. Add no
required target declarations or derived compatibility API for this scope. This
supersedes the previous recommendation to make compatibility machinery a condition
of flattening. The final consumer boundary is recorded as ratified in the Founder
Board; no library implementation has begun.

One length unit applies throughout. Color/Alpha references remain structured,
Color changes follow the active mode, and correct binding within nested scopes
remains a compiler responsibility. The ordinary no-shadow case uses omission or
CSS `none`. Inner shadows use the per-layer inset field. No Shadow darkness
constraint, separate opacity schedule, categorical variants, or layer-interpolation
helper is required for this blueprint.

The latest mock retains sixteen elevation/inset/shared-glow values and replaces
eight duplicated Text-glow examples with four values for an independently authored
`text` treatment. Earlier Text-glow names remain expressible as ordinary authored
identities. This does not migrate any actual consumers. The source is editor-checked
with a declaration-only helper; numerical calibration, public implementation,
package placement, migration, and scoped CSS verification belong to later work.

The shared position-pattern catalogue and per-domain design policy remain accepted.
Shared labels do not force identical completeness or numeric validation across
domains. The shared Axis source model still needs its own blueprint workshop.

### Earlier starting proposal — subsequent verdict above takes precedence

Start with the consumer decision: choose a shadow identity, then a degree of that
shadow's presence. A neutral `neu` range with `min / lo / hi / max` is a candidate
for the common case, with no required `base` or generated unsuffixed alias.
Additional identities can use the ratified standard-theme vocabulary when neutral
and accent roles apply. `pri` owns its authored look directly; it does not
automatically mean glow or inherit the color named `pri`.

Each choice is one complete, structured shadow value containing one or more
layers. Keep Color/Alpha references so changes to those foundations propagate.
Retain the useful distinction between Box and Text layer grammars without
requiring a project to author both domains.

The immediate workshop should establish whether the ordinary need is that small
range or a pool of individual looks. Then settle required positions, direct-value
authoring if needed, reference and unit rules, and public naming. A visual strength
progression does not imply that every layer coordinate must numerically increase.

Do not carry forward the mandatory `base`, arbitrary variants, explicit review
order, or interpolation helper solely because they already exist. Range
derivation can be considered after a concrete authoring example demonstrates
repetition worth removing. Any accepted helper must leave its resolved values
inspectable.

## Remaining blueprint decisions

Gap/Radius and Time/Easing contracts are ratified. Their implementation status
does not hold up the remaining blueprint discussion.

- Motion composites are explicitly deferred. Their existing code and consumers
  are a later triage item, not an outstanding product workshop prerequisite.
- Shadow's flat mock and consumer-responsibility boundary are ratified. Its
  genuine mode overrides participate in the remaining shared Axis workshop.
- Resolve the remaining Spacing/Border width authoring and shared Axis questions,
  or explicitly defer them with clear scope boundaries.
- Identify any remaining decisions across the wider Founder Board needed to
  complete the overhaul blueprint. This domain audit is not the complete agenda.

The earlier implementation sequence is superseded by the founder's milestone
clarification. Architecture, cleanup, migration strategy, work ordering, and
verification belong in a subsequent runbook reviewed with the founder. A coded
foundation preview is not required to ratify the remaining product decisions.
