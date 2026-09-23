# Shadow authoring workshop

Status, 2026-09-10: blueprint ratified and representative mock reviewed. The
workshop is complete, including one flat catalogue and consumer responsibility
for CSS property selection, with no target declarations or required compatibility
API. The [Founder Board](../../founder-board.md#shadow--flat-catalogue) records
the accepted contract.

This is milestone-1 blueprint work, not runnable input for today's TFS generator.
The helper has an editor declaration only. Values are illustrative and need
standard-theme calibration during the later implementation/review milestone.

## Read the domain directly

[shadow.ts](./shadow.ts) starts with `export const shadows` immediately after its
imports. Every authored choice and helper call appears inline in one `ranges`
catalogue:

- `neu`: ordinary elevation using Color `shd`.
- `inset`: a separately authored inner-shadow treatment, also using `shd`.
- `text`: an optional treatment tuned for text. It uses Color `shd` directly,
  without selecting an Alpha position.
- `glow-neu` and `glow-pri`: one glow design applied to two selected colors by
  the inline `shadowsForColors()` call.

`text` is an ordinary authored identity, like `inset`. It neither creates a new
subdomain nor assigns a CSS property. Other author-chosen names are possible.
The optional treatments can be omitted when only ordinary elevation is needed.

[context.ts](./context.ts) supplies the separate Color/Alpha inputs. Its `shd`
swatch differs between light and dark. Those inputs use existing source shapes;
this example does not propose a new Color or Axis API.

## Positions and measurements

Every range supplies `min / lo / hi / max`. A position means an ordered choice,
not the shadow's x/y location. Authors decide whether the progression changes
color/Alpha, offsets, blur, spread, or several of those. No one number measures
all possible shadow progressions.

| Field    | Meaning                                                             |
| -------- | ------------------------------------------------------------------- |
| `x`      | Horizontal offset                                                   |
| `y`      | Vertical offset                                                     |
| `blur`   | Softness of the shadow's edge                                       |
| `spread` | Expansion or contraction of the shadow area                         |
| `inset`  | Draw an inner box shadow when true; omission/false means outer      |
| `color`  | Reference to Color, optionally selecting an existing Alpha position |

One position contains one or more ordered layers; the number may differ between
positions. `unit: 'px'` applies to all length numbers, including those inside the
helper. An author can choose another supported CSS length unit.

An inner shadow gets its own chosen measurements and colors. In the example,
`inset.lo` produces:

```css
--shd-inset-lo: inset 0px 2px 4px var(--clr-shd-a-lo-x);
```

The identity's name is a label. The layer's `inset: true` field causes the inner
shadow. It applies per layer, allowing several inner shadows or a deliberate
combination of inner and outer effects in one value. See the
[CSS Box Shadow definition](https://www.w3.org/TR/css-backgrounds-3/#propdef-box-shadow).

## One design across several colors

The inline helper call writes its measurements and Alpha choices once, and takes
its colors from `colors: ['neu', 'pri']`. No placeholder Color reference or
replacement instruction is needed. `prefix: 'glow'` supplies the naming prefix;
`...shadowsForColors(...)` includes the resulting named ranges at that point in
the catalogue.

For instance, the proposed `glow-pri.lo` result is ordinary complete Shadow data:

```ts
[
	{ x: 0, y: 0, blur: 3, color: { color: 'pri', alpha: 'lo-x' } },
	{ x: 0, y: 0, blur: 12, color: { color: 'pri', alpha: 'min' } },
];
```

Every layer receives the selected color for that copy. Measurements, layer order,
Alpha choices, and any inset setting remain intact. The same operation can take
an explicit color selection, a resolved Color group, or the authored Color library.
The two-color selection here matches the actual example inputs.

The result is one set of glow tokens. Consumers can use those values with either
`box-shadow` or `text-shadow`, because these particular layers use the fields
shared by both properties. A separately tuned text glow could instead have an
authored identity such as `text-glow-pri`; that name is not generated merely
because a value is being used on text.

The local import points to [review-helpers.d.ts](./review-helpers.d.ts), a
single declaration for checking this example. It contains no implementation and
has no Box/Text overloads. The public implementation and detailed type signatures
belong to the later architecture/runbook milestone.

## Validation and consumer responsibility

Ratified boundary:

- TFS validates what it authors: the four required positions, nonempty layer
  lists, valid fields and units, finite numbers, Color/Alpha references, selected
  default range, and unique generated names. Blur is nonnegative; offsets and
  spread may be negative. The helper validates its selection and result names.
- TFS emits each value faithfully. It does not drop spread/inset or rewrite a
  value according to the property a consumer might use. Omitted Alpha uses the
  referenced Color directly. There is no extra Shadow opacity schedule.
- The consumer chooses an appropriate CSS property. `text-shadow` accepts offsets,
  blur, and color but not spread or inset; `box-shadow` supports those additional
  fields. These CSS rules apply regardless of a token's name. See the
  [CSS Text Shadow definition](https://www.w3.org/TR/css-text-decor-3/#text-shadow-property).
- No authored `targets`, `validFor`, or similar field is required. A target
  assertion could catch a mismatch while authoring, but does not enforce arbitrary
  handwritten CSS usage. There is no demonstrated need to add that feature now.
- No generated compatibility registry, property-specific token subset, or
  target-aware selector is required for this scope. Typed output still guarantees
  the actual token identities and names; it does not promise that every token
  is suitable for every CSS property.

This supersedes the previous recommendation to make derived CSS compatibility
information a prerequisite for flattening the catalogue. It also removes the
previous source hierarchy of separate Box and Text sections.

Shadow darkness remains an authoring and visual-review decision. A component
can omit the property or use ordinary CSS `none` when removing an existing shadow.
No dedicated no-shadow token or extra position is needed. Alpha's separately
ratified `non: 0` boundary remains unchanged.

## Every token in this example

[expected-tokens.css](./expected-tokens.css) gives all **20 names and complete
values**. This is an illustrative expansion, not current compiler output.

| Range      | `min`                | `lo`                | `hi`                | `max`                |
| ---------- | -------------------- | ------------------- | ------------------- | -------------------- |
| `neu`      | `--shd-min`          | `--shd-lo`          | `--shd-hi`          | `--shd-max`          |
| `inset`    | `--shd-inset-min`    | `--shd-inset-lo`    | `--shd-inset-hi`    | `--shd-inset-max`    |
| `text`     | `--shd-text-min`     | `--shd-text-lo`     | `--shd-text-hi`     | `--shd-text-max`     |
| `glow-neu` | `--shd-glow-neu-min` | `--shd-glow-neu-lo` | `--shd-glow-neu-hi` | `--shd-glow-neu-max` |
| `glow-pri` | `--shd-glow-pri-min` | `--shd-glow-pri-lo` | `--shd-glow-pri-hi` | `--shd-glow-pri-max` |

The optional `defaultRange: 'neu'` selection gives that authored range the short
names. With no selection, all ranges keep their identity in the name. Selecting
a range creates no base position, unsuffixed `--shd`, or second set of aliases.
An authored Shadow catalogue must contain at least one range.

Consumers can use the same glow token in both of these declarations:

```css
box-shadow: var(--shd-glow-pri-lo);
text-shadow: var(--shd-glow-pri-lo);
```

Compared with the preceding mock, the 16 elevation, inset, and shared-glow tokens
keep their values. The eight duplicated `--shd-text-glow-*` examples are removed;
four newly illustrated `--shd-text-*` values show a distinct, compact text treatment
and omitted Alpha. This is a change to the review example only. The flat grammar
can still express `text-glow-neu` and `text-glow-pri` as ordinary authored identities
when a project wants those distinct treatments or needs to preserve those names.
Production consumer migration belongs to the later triage/runbook milestone.

## Changes across modes

Color references follow the active Color mode. Offsets, blur, and spread are
written once when unchanged. Actual changes to those measurements should use the
shared Axis pattern. The exact generic Axis authoring syntax and simultaneous
change rules still need their own workshop; this mock invents no Shadow modes.

CSS variable references resolve before inheritance. A nested theme that changes
Color variables therefore needs dependent shadow declarations bound in that
scope, including the Color alpha-ramp dependencies. This is a generator
responsibility; authors must not repeat unchanged shadow definitions. See the
[CSS custom-property resolution rules](https://www.w3.org/TR/css-variables-1/#cycles).
Consumer responsibility for choosing a CSS property does not remove this
requirement for correct generated references.

## Workshop boundary and checks

The flat mock and its consumer-responsibility boundary are accepted. The next
recommended cross-domain blueprint workshop is the shared Axis model; follow
the [workshop progress list](../../v05-workshop-progress.md). Keep categorical
Shadow variants, layer-interpolation helpers, and
new darkness constraints outside this overhaul unless a concrete requirement
reopens them.

The only code changes are review artifacts against `codex/v05-reentry`; there are
no library, compiler, theme, Workbench, or consumer changes. Local supporting types
check names and structure, not every runtime validation rule. The helper remains
a declaration only. Check the example without building or generating the library:

```sh
pnpm exec tsc -p docs/blueprints/shadow/tsconfig.json
```
