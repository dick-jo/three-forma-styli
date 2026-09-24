# Domain authoring across Axes and Modes: alternatives

Focused follow-up, 2026-09-24: the founder requests
[input/output evidence](../color-alpha/baseline/README.md) for removing
`axes.default` and requiring complete ordinary values. That narrow proposal is
pending review; the original shared-data/initial-mode model below is retained
for comparison. Other ratified Axis rules stand.

Status, 2026-09-24: **catalogue model, shared defaults, one controlling axis per
authored value, and complete Shadow-list replacement ratified**.
Application-owned attribute selection was ratified on 2026-09-23.
The founder accepted the [2026-09-23 recommendation](#current-recommendation-2026-09-23).
Earlier conditional/combined-mode examples below preserve the comparison and are
superseded. There is no remaining combined-mode syntax workshop in this overhaul.
The [Founder Board](../../founder-board.md#axis-selection) records the current law.
The founder understands the Axis/Mode concept and has reviewed the separate-file
catalogue example. The original `overrides / when / set` list has not been accepted.
This document is the current comparison; the earlier examples remain available
as evidence. The [Founder Board](../../founder-board.md) governs existing verdicts.

Follow-up, 2026-09-15: the founder is comfortable with the named mode catalogue
as the working direction and asks how dependencies and TypeScript authoring fit
together. The dependency discussion below sets proposed expectations for the
next mock; the complete shared source contract is not yet ratified.

Update, 2026-09-16: the [separate-file mock](./separate-files/README.md) now
demonstrates the source-derived editor suggestions, typo checks, and one-way
imports requested below. Its supporting types remain review declarations, not
new public library exports.

Keep the endorsed ordinary layout and exercise its remaining cases in the
representative domain mocks, including Typography, before closing the shared
Axis workshop. An isolated Spacing example is insufficient evidence.

## What the earlier source did

Current [Color authoring](../../../packages/themes/src/default/color.ts) declares
`COLOR_MODES` as a named catalogue, then maps those entries to the current array
shape. [Spacing](../../../packages/themes/src/default/spacing.ts) uses the same
idea, with `default`, `small`, and `large` entries. Each repeats fields such as
`unit` and `range` and names its own default.

The valuable reading experience is the catalogue of named alternatives. The
shared Axis registry can own mode identity, initial selection, and activation;
authors need not repeat that metadata or perform the object-to-array conversion
in each domain.

## Three substantive choices

| Layout                                      | What the author sees                                              | Strength                                                          | Cost for TFS                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A. Ordinary values plus conditional changes | Values first, then `when / set` entries                           | One format handles individual axes and combinations               | Routine authoring reads as a sequence of changes; comparing modes takes more scanning                       |
| B. Shared values plus named mode catalogues | Common settings, then `regular / s / l` or `light / dark` entries | Related decisions stay together; ordinary modes are visible peers | Rare cross-axis combinations still need an explicit authoring form                                          |
| C. Choices beside each value                | A token row includes all of its mode values                       | Excellent for comparing one swatch or measurement                 | Axis labels repeat across rows; reading a whole palette or coupled composite requires piecing rows together |

**Recommendation for further mocks: B.** It best matches the founder's preference
for readable catalogues and the useful part of the previous Color authoring.
This is a product judgment, not a claim of a universally best TypeScript format.

### A. Conditional changes: the previous proposal

```ts
export const spacing = {
	unit: 'px',
	range: 12,
	base: 8,
	min: 4,
	overrides: [
		{ when: { size: 's' }, set: { base: 6, min: 3 } },
		{ when: { size: 'l' }, set: { base: 10, min: 5 } },
	],
};
```

The first values implicitly represent the initial mode, while its peers appear
elsewhere as changes. The format is expressive, but that asymmetry is a credible
reason for the authoring to feel less natural. Merely renaming `overrides` would
not address it.

### B. Shared values and mode catalogues: recommended candidate

```ts
export const spacing = {
	unit: 'px',
	range: 12,
	modes: {
		size: {
			regular: { base: 8, min: 4 },
			s: { base: 6, min: 3 },
			l: { base: 10, min: 5 },
		},
	},
};
```

Read it as: pixels throughout, twelve numbered tokens, three Size calibrations.
`base` retains the current Spacing multiplication input name; it is not a new
position. Its naming is still for the Spacing workshop. The Axis registry still
declares the allowed modes and chooses the initial `regular` selection; domains
only supply their values. `regular` remains an illustrative mode identity.

Each `modes` catalogue is organized by axis, then mode. Fields inside a mode have
the same structure as ordinary domain fields. Domains with no genuine changes
stay flat. Authors can put common values at the top and only differences under a
mode, or place all differing values under their respective named modes.

The proposal has one composition rule: **common domain data + the selected entry
from each participating axis**. Omitted fields retain common data. Do not silently
copy values from a sibling mode. If the selected combination leaves a required
value missing, validation fails. Every combination must resolve to the same
identity/position catalogue and satisfy the domain's ordinary validity rules.

This is a deliberate difference from automatically inheriting the default mode's
data. The registry's default chooses an initial mode; it is not a hidden data
parent for the other modes. For example, `dark` inherits the shared `pri` in the
mock, but does not inherit a missing `ink` from `light`.

### C. Choices beside each value

`byMode` below is hypothetical notation to illustrate this option. It is not an
existing helper, a proposed required export, or a function implemented for review.

```ts
export const spacing = {
	unit: 'px',
	range: 12,
	base: byMode('size', { regular: 8, s: 6, l: 10 }),
	min: byMode('size', { regular: 4, s: 3, l: 5 }),
};

export const colors = {
	tokens: {
		bg: byMode('theme', {
			light: oklch(0.96, 0, 0),
			dark: oklch(0.24, 0, 0),
		}),
		ink: byMode('theme', {
			light: oklch(0.25, 0, 0),
			dark: oklch(0.88, 0, 0),
		}),
	},
};
```

This is a strong alternative for seeing a Color identity and all of its values on
one row. For Spacing it separates the minimum from the step they must coordinate
with. For Shadow it needs a deliberate boundary: select a complete layer list,
not independently vary arbitrary coordinates without checking the result.
Supporting this everywhere would broaden which authored values accept mode-aware
wrappers. Do not offer B and C as parallel public forms merely because both are
possible; first choose the reading experience TFS wants to standardize.

Putting all domain changes into a global theme file is another possible layout.
It makes one mode easy to review, but scatters a domain's choices between its own
file and global mode files. That fits the founder's preferred domain-first reading
less well. A Workbench can eventually present either view of the same source.

## See B across the domains

[mode-catalogue.ts](./mode-catalogue.ts) is a coherent candidate across Color,
Alpha, Spacing, Gap, Radius, Width, Time, Easing, and Shadow. It adds no authoring
helper and leaves the main declaration immediately after imports. Values are
illustrative. This is a review fragment, not a complete production project or a
replacement for each domain's dedicated representative mock.

| Domain          | Demonstration                                                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color           | Shared `pri` once; light/dark palettes beside each other under `modes.theme`                                                                                                                                                                                |
| Alpha           | The accepted six-position scale stays ordinary data; no modes added                                                                                                                                                                                         |
| Spacing         | Shared unit/count; named Size calibrations                                                                                                                                                                                                                  |
| Gap and Radius  | Spacing references once; they automatically follow the selected scale                                                                                                                                                                                       |
| Border width    | One scalar; no empty modes section                                                                                                                                                                                                                          |
| Time and Easing | The accepted scales and pool remain simultaneously available; no modes added                                                                                                                                                                                |
| Shadow          | Its ordinary range remains first. It follows Color automatically. A small Size catalogue demonstrates a genuine change to the `max` layer list only                                                                                                         |
| Typography      | The next focused mock must show atomic Font size changing with Size, unchanged role references following, and optional role line-height/tracking calibration using the same catalogue pattern. Its font preparation and role schema are not improvised here |

The optional Shadow Size example is deliberately not a standard-theme prescription.
It shows how the same grammar handles a real exception. A Shadow position supplies
a complete replacement layer list. The other three positions retain their common
values; the resolved range always contains all four positions. The earlier full
[Shadow mock](../shadow/README.md), including inline Color expansion and inset
examples, remains the accepted domain review.

Expected selected outputs from the candidate:

| Theme / Size    | `--clr-bg`        | `--gap-l` and `--bdr-l` | `--bdw` | `--t-lo` | `--shd-max` offsets/blur/spread                  |
| --------------- | ----------------- | ----------------------- | ------- | -------- | ------------------------------------------------ |
| light / regular | `oklch(0.96 0 0)` | `16px`                  | `1px`   | `100ms`  | Layers `0/3/6/0` and `0/20/48/-8` px             |
| dark / regular  | `oklch(0.24 0 0)` | `16px`                  | `1px`   | `100ms`  | Same lengths; Color references change            |
| light / s       | `oklch(0.96 0 0)` | `12px`                  | `1px`   | `100ms`  | Layers `0/2/4/0` and `0/12/32/-6` px             |
| dark / s        | `oklch(0.24 0 0)` | `12px`                  | `1px`   | `100ms`  | Small lengths and dark Color references together |
| light / l       | `oklch(0.96 0 0)` | `20px`                  | `1px`   | `100ms`  | Ordinary Shadow lengths                          |
| dark / l        | `oklch(0.24 0 0)` | `20px`                  | `1px`   | `100ms`  | Ordinary lengths and dark Color references       |

Both max layers reference `shd` at Alpha `lo` (0.25). For example, in dark/s the
expected resolved value is:

```text
0px 2px 4px oklch(0.06 0 0 / 0.25),
0px 12px 32px -6px oklch(0.06 0 0 / 0.25)
```

These are illustrative values. Actual CSS may preserve variable references with
correct local binding. The token names stay the same across all combinations.

## Multiple axes and the remaining hard case

The catalogue allows one domain to contain both `modes.theme` and
`modes.contrast`. Different authored decisions combine independently. Two active
entries writing the same authored decision require explicit resolution; file
order does not choose a winner. This includes selected default-mode entries:
under B, `light` is a selected entry too, not a weak inherited palette.

The original [conditional companion](./contrast.ts) demonstrates the conflict
itself. Its syntax and inheritance assumptions do not automatically transfer to
B. A follow-up catalogue companion must show light/high as well as dark/high,
with explicit combined choices wherever both entries write the same Color.
Do not hide that issue behind a cosmetic rename or declare B ratified before
that example is satisfactory. How to spell combined choices remains open.

Nested selection, explicit return to the initial mode, environment activation,
and correct scoped dependency binding still need to work whichever authoring
layout is chosen. A mode catalogue changes author input; it does not waive these
requirements. Detailed resolution and compiler design remain later work.

The DTCG Resolver specification also uses named context maps and shared token
sources. That supports the usefulness of this general organization, but it does
not prescribe TFS's TypeScript authoring shape. Its ordered conflict resolution
also differs from TFS's accepted requirement for explicit collision handling.
[DTCG Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/).

## Authoring dependencies and TypeScript

References can remain one-way. An Axis registry declares available selections;
it does not need to import domains. Spacing supplies measurements to Gap and
Radius. Color and Alpha supply references for Shadow. Font size and prepared font
facts supply Typography roles. Sharing an Axis does not make its participating
domains depend on each other.

The proposed file structure follows those relationships:

- `axes.ts` contains the shared registry and imports no project domain.
- Each domain file owns its authored data and can use upstream types for editor
  guidance. It does not import the assembled design system.
- An entry file imports the domain definitions and assembles the system once.
- Authored input does not import its own generated token package for typing.
  The generated package is downstream consumer output; authoring suggestions
  should be derived from source definitions without requiring an initial build.

For example, the assembly file can remain ordinary data:

```ts
import { axes } from './axes.js';
import { colors } from './color.js';
import { spacing } from './spacing.js';
import { radius } from './border-radius.js';
import { shadows } from './shadow.js';

export const designSystem = {
	axes,
	colors,
	spacing,
	border: { radius },
	shadows,
};
```

This is a focused assembly sketch, not a complete project or a new helper API.
Domain files must not import this entry file back to discover their own types.

Radius can keep `l: 2` as a Spacing reference. The compiler uses the selected
Spacing calibration to derive the length; the Radius module need not read
`spacing.modes.size.regular.base` and calculate a fixed length while loading.
Likewise, `{ color: 'shd', alpha: 'lo' }` is reference data. It does not require
Shadow to fetch the selected Color value when its module is evaluated.

Editor types can use upstream source definitions to suggest axis/mode names,
Color identities, and Alpha positions. Preserve literal authored names so those
suggestions remain precise. Type-only imports are erased from emitted JavaScript
and therefore add no runtime import dependency.
[TypeScript documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export).
They do not make circular type inference safe by themselves; keep the source
typing relationships one-way too. An authoring helper may also import actual
upstream data when it needs it, provided the dependency stays one-way.

After the definitions are assembled, TFS validates references and resolves
domain dependencies for the selected modes. Invalid references fail. Any
supported reference mechanism that could express a real cycle must reject it
with a diagnostic identifying the chain; standard domain references need not
be generalized into arbitrary bidirectional dependencies.

The separate-file mock now addresses these review requirements:

1. Separate Axis, Color/Alpha, and Shadow files plus a small assembly file,
   retaining the immediate domain declaration and catalogue reading experience.
2. Editor suggestions and deliberate invalid axis/mode/Color/Alpha names, with
   types derived from authored sources rather than a duplicated identity list.
3. A source identity available in one mode but missing from another: distinguish
   spelling checks from resolved per-mode completeness checks.
4. Radius following selected Spacing and Shadow following selected Color, with
   stable token names and the already required nested-scope behavior.

The original broad mock did not prove these typing guarantees. The separate-file
example checks suggestions and diagnostics through the TypeScript language
service and verifies the example calculations. Nested browser behavior is still
unverified. Exact public helper/type signatures and compiler implementation
remain later decisions.

## Remaining review after the separate-file mock

The following records the 2026-09-16 recommendation. Application-owned selection
has since been ratified; the current exclusivity proposal below could remove the
need for a combined-mode authoring feature in this overhaul.

The founder's 2026-09-16 response endorses the ordinary registry and separate-file
authoring direction. Preserve that progress. The following are recommendations
for completing the review, not newly ratified features:

1. **Two axes changing one authored decision.** Theme and Contrast can both
   change `ink`. A focused companion should show the intended palettes for both
   light/high and dark/high and the smallest readable way to author them.
   Independent changes should still combine without extra declarations. Keep
   the existing requirement for explicit conflict resolution; avoid source-order
   priority or a general conditional-expression language. If the use case does
   not justify combination support now, explicitly defer it and reject overlaps.
2. **Who selects the active mode.** Attribute selection is the ordinary case.
   Decide the small boundary for direct environment activation, including the
   case where an application offers a manual choice alongside an OS preference.
   The recommendation is for the application to own that preference policy and
   supply its final attribute selection. Direct media activation can remain a
   separate, bounded case; do not imply that arbitrary overlapping media-query
   strings have a solved priority or validation rule.
3. **Confirm the existing resolution rules in the remaining domain mocks.**
   Shared data plus selected-mode data must produce complete values and a stable
   token catalogue. A missing dark `shd` does not silently borrow light `shd`.
   Replacing a Shadow position replaces its layer list, rather than blending
   array entries. Typography should demonstrate its actual scale/role needs.
   These examples should test the chosen pattern without restarting the layout
   comparison for every domain.

Nested selection and dependent values following their local scope remain
required outcomes. Implementation strategy, browser verification, validation
coverage, performance, and exact exported types belong to the later architecture
and implementation milestones. Their absence from a review mock is not a reason
to reopen the ordinary authoring layout.

## Current recommendation, 2026-09-23

Ratified on 2026-09-24. The following preserves the recommendation's original
wording; references to a pending ruling are historical. The Board owns the verdict.

The founder asks whether a sensible limitation can avoid competing axes, approves
application-owned attribute selection, and asks for plain explanations of shared
defaults, Shadow replacement, and nested scopes. The activation ruling is recorded
in the Board. The following exclusivity and replacement details remain proposals.

### One controlling axis per authored value

Recommend that a particular authored value can have alternatives on at most one
axis. Shared values may still supply its ordinary value. Reject a second axis
that also supplies alternatives for that same value, even if the author expects
their active modes not to coincide. No priority numbers or file-order winner.

The boundary is a complete domain value: one Color swatch, one numeric Spacing
input, or the complete layer list at one Shadow range position. Do not split an
OKLCH value into separately controlled channels or a Shadow list into separately
controlled array indexes. Domain-specific boundaries must remain explicit in the
upcoming mocks; this is not a generic arbitrary-object merge facility.

This does not restrict an entire domain to one axis, and it does not count
indirect changes through references as competing authorship:

| Case                                                                           | Result under the proposed limit                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Theme supplies `ink`; Contrast also supplies `ink`                             | Reject the competing alternatives                        |
| Size changes a Shadow position's layer list; its Color reference follows Theme | Allowed                                                  |
| Radius references Spacing whose calibration changes with Size                  | Allowed; no Radius mode entry needed                     |
| Two axes change different complete authored values in a domain                 | Allowed, subject to the domain's resolved validity rules |

For a real light/dark/high-contrast palette requirement, the author could instead
declare four choices on one palette axis, such as `light`, `dark`, `light-high`,
and `dark-high`. The application selects one. Those names are illustrative.
The cost is explicitly authoring the needed combined palettes. If an actual
consumer later demonstrates that this limit is too restrictive, revisit it with
that evidence. A speculative combination resolver is not justified by the current
examples. This recommendation replaces the previous next-step recommendation;
it is not yet ratified and no mock validator implements it.

### Shared defaults are the top-level domain data

The founder expects an ordinary/default set to supply values omitted by a mode.
The current catalogue can express that directly:

```ts
export const colors = {
	tokens: { shd: oklch(0.2, 0, 0) }, // Shared default for every Theme mode.
	modes: {
		theme: {
			light: { tokens: { bg: oklch(0.96, 0, 0) } },
			dark: { tokens: { bg: oklch(0.24, 0, 0) } },
		},
	},
};
```

Both palettes use the shared `shd`. A mode may replace it explicitly. If neither
shared data nor the selected mode provides a required `shd`, report the missing
value. If `shd` exists only inside `light`, that is a light-specific value; the
current proposal does not treat it as shared merely because `axes.theme.default`
selects `light` initially. Keep these meanings distinct:

- Top-level domain values: defaults used wherever a mode does not replace them.
- Axis `default`: the initially selected mode, not a second data inheritance path.

The user may have meant a named initial-mode palette by “default set”; that
interpretation must not be silently equated with shared top-level data. The
recommendation is to keep the shared location already present in the mock and
confirm it with the concrete example, rather than add implicit sibling-mode
inheritance or a new `defaults` wrapper.

### A Shadow position contains a whole list of shadows

Illustrative values, expressed in plain terms:

```text
shared lo:       [tight shadow, soft shadow]
small-mode lo:   [one gentler shadow]
result in small: [one gentler shadow]
```

If a mode supplies `lo`, that is its complete list. Do not keep the old second
layer, concatenate the lists, or guess how list items correspond. If it omits
`lo`, retain the entire shared list. Other positions are unaffected. This is the
proposed replacement rule, not a new feature authors must configure.

### Nested scopes are an implementation check

The example means an ordinary light section inside a dark page. Changing only
Theme should leave Size alone. The author should get that through the generated
CSS; no additional source declarations or scoping system are proposed. Correct
binding of dependent custom properties needs implementation verification because
variable references are resolved before inheritance. That requirement remains in
the later runbook and is not another founder decision.
[CSS Custom Properties specification](https://www.w3.org/TR/css-variables-1/#cycles).

## Review and verification boundary

The founder has ratified B's ordinary catalogue and the exclusivity/default/list
rules above. Remaining domain mocks confirm their application, including
Typography's scale/role relationship. Public types and implementation remain
later work. The review declarations do not yet enforce every ratified rule.

The candidate is included in the existing local TypeScript check. It checks
syntax, imports, and Alpha data; it is not a full
validator for the proposed catalogue, references, or combination completeness.
No production library, theme, compiler, or consumer files are changed.

Verification: the local TypeScript check passes. An in-memory example calculation
checked the six Theme/Size selections, the Shadow measurements shown above, and
91 stable token names including Color alpha ramps. This checks the illustration;
it is not evidence of compiler implementation or correct nested browser behavior.
