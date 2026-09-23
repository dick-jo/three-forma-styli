# Axes and Modes workshop

Latest review, 2026-09-16: the preferred catalogue now has a
[separate-file authoring mock](./separate-files/README.md), with source-derived
editor suggestions, deliberate typo checks, and acyclic import evidence. Start
there to assess the current TypeScript experience. The shared grammar remains
under review.

Current review, 2026-09-15: the founder wants alternatives to the conditional
authoring layout and broader domain examples. Start with
[the authoring comparison](./authoring-options.md) and
[the mode-catalogue candidate](./mode-catalogue.ts). The conditional examples below
remain an unratified earlier proposal; they are not the selected source contract.

Status, 2026-09-10: **first authoring proposal, awaiting founder review**.
The [Founder Board](../../founder-board.md) already establishes independent axes,
authored mode names, sparse participation, and explicit handling of collisions.
The syntax and detailed rules here are proposals. This is milestone 1.

## Start with the ordinary example

Read [axes.ts](./axes.ts), then [system.ts](./system.ts). Main declarations follow
their imports, with domain choices and overrides inline. Supporting editor types
live separately in [review-types.ts](./review-types.ts).

- An **Axis** is a switchable concern: `theme` or `size`.
- A **Mode** is a choice on that axis: `dark` or `s`.
- Declare each axis, its choices, its initial choice, and its activation once.
- Write each domain's ordinary values once. Add `overrides` only for real changes.
- Each override reads: **when** these modes are active, **set** these values.

For example, the Spacing changes are:

```ts
overrides: [
	{ when: { size: 's' }, set: { base: 6, min: 3 } },
	{ when: { size: 'l' }, set: { base: 10, min: 5 } },
];
```

`set` has the same field structure as the domain's ordinary authored data; it
contains only changes. This one format also accommodates multiple axes and their
combinations. Participation is evident from `when`; authors do not additionally
repeat `axis: 'size'` or an `axes` list on each domain. That is a proposed
simplification of the earlier `axis`/`axes` source sketches, preserving their
shared, independent, and multiple-axis behavior.

Spacing retains the current generator inputs for this example: `base: 8` means
`--sp-1: 8px`, and numbered values are multiples of 8. It is not a token position
named base. `range: 12` generates twelve numbered values. The full Spacing workshop
will review those input names. Color's `tokens` field and the unwrapped ordinary
domain values here are illustrative context; this workshop does not ratify all
remaining domain source shapes by implication.

The example omits Alpha, Groups, Typography, and runtime palette construction to
keep this first reading focused. Their accepted contracts still apply and their
dedicated mocks remain queued. The Shadow values are illustrative, using the
ratified option of a Color reference without an Alpha position.

## Initial choices and explicit return to them

The proposed axis `default` selects the initial mode when no selection is
inherited or supplied. Root markup needs no attribute for that initial choice.
It does not generate an unsuffixed token or introduce a base position.

`regular` is an illustrative authored Size mode name. The proposal makes the
initial choice explicitly selectable too, so a nested region can return to it:

```html
<main data-theme-mode="dark" data-size-mode="s">
	<!-- Dark colors and small spacing. -->
	<section data-size-mode="regular">
		<!-- Still dark; ordinary spacing restored. -->
		<aside data-theme-mode="light">
			<!-- Light colors; ordinary spacing retained. -->
		</aside>
	</section>
</main>
```

Each axis takes its nearest applicable selection independently. Without a local
selection it follows the enclosing selection, then the declared default at the
root. Removing an attribute resumes that inherited choice. Selecting `regular`
explicitly returns Size to its initial choice even inside an `s` region.

This retains the earlier attribute-free ordinary state while adding a clear
named way to select it inside another mode. The exact standard Size vocabulary
is still for review; the example does not establish `regular` as a required name.

Resolve the current selection from the ordinary domain values plus matching
overrides. Do not accumulate patches from previously selected modes. A mode
without a domain override uses that domain's ordinary values, with any changes
from the other currently selected axes still applied.

## Expected values and references

These are expected outcomes, not output from today's compiler:

| Theme | Size    | `--clr-bg`        | `--sp-1` | `--gap-l` | `--bdr-l` | `--bdw` |
| ----- | ------- | ----------------- | -------- | --------- | --------- | ------- |
| light | regular | `oklch(0.96 0 0)` | `8px`    | `16px`    | `16px`    | `1px`   |
| light | s       | `oklch(0.96 0 0)` | `6px`    | `12px`    | `12px`    | `1px`   |
| light | l       | `oklch(0.96 0 0)` | `10px`   | `20px`    | `20px`    | `1px`   |
| dark  | regular | `oklch(0.24 0 0)` | `8px`    | `16px`    | `16px`    | `1px`   |
| dark  | s       | `oklch(0.24 0 0)` | `6px`    | `12px`    | `12px`    | `1px`   |
| dark  | l       | `oklch(0.24 0 0)` | `10px`   | `20px`    | `20px`    | `1px`   |

All named outputs demonstrated by the focused example:

| Tokens                               | Expected values                                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--clr-bg`, `--clr-ink`, `--clr-shd` | Light: OKLCH L `0.96`, `0.25`, `0.2`; dark: `0.24`, `0.88`, `0.06`. All C/H values are zero.                                                                                  |
| `--sp-min`                           | `4px` regular, `3px` small, `5px` large.                                                                                                                                      |
| `--sp-1` through `--sp-12`           | Regular: 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96px. Small: 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72px. Large: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120px. |
| `--gap-min / -s / -l / -max`         | Active Spacing `min / 1 / 2 / 3`: regular 4/8/16/24px, small 3/6/12/18px, large 5/10/20/30px.                                                                                 |
| `--bdr-min / -s / -l / -max`         | The same Spacing references in this example.                                                                                                                                  |
| `--bdw`                              | `1px` in every combination.                                                                                                                                                   |
| `--shd-min`                          | `0px 1px 2px` with the active `--clr-shd` value.                                                                                                                              |
| `--shd-lo`                           | `0px 2px 4px` with the active `--clr-shd` value.                                                                                                                              |
| `--shd-hi`                           | `0px 4px 8px` with the active `--clr-shd` value.                                                                                                                              |
| `--shd-max`                          | `0px 8px 16px` with the active `--clr-shd` value.                                                                                                                             |

Mode selection changes values while preserving these 29 token names. Additional
Color ramps are covered by the separate Alpha/Color contract and are outside this
focused output list. CSS and the generated TypeScript catalogue expose the same
stable names; selection changes their active values, not the identity unions.

Gap and Border radius need no repeated mapping or `spacingMode` declaration.
Shadow needs no Color-mode override merely to follow its Color reference. Border
width does not opt into Size by repeating `1px` for every mode.

These outcomes must also hold in nested scopes. CSS substitutes custom-property
references before inheritance, so declaring a dependent variable only at the
root cannot generally deliver that behavior. Correct local binding of dependent
Gap/Radius/Shadow values and Color ramps remains the compiler's responsibility;
authors should not repeat their definitions.
[CSS Custom Properties specification](https://www.w3.org/TR/css-variables-1/#cycles).
The example records the required outcome; it is not a verified CSS emission
strategy. Its implementation and browser verification belong to the runbook.

## Two axes changing the same decision

[contrast.ts](./contrast.ts) is a focused companion. It demonstrates a palette
choice, not an accessibility certification or a new Color constraint.

- `theme: dark` changes `bg` to L `0.24`.
- `contrast: high` changes `bg` to L `0.99`.
- Both could be selected at once. Neither change silently wins.
- A third entry explicitly chooses L `0.06` for that combination:

```ts
{
  when: { theme: 'dark', contrast: 'high' },
  set: { tokens: { bg: oklch(0.06, 0, 0) } },
}
```

| Theme | Contrast | Expected background L |
| ----- | -------- | --------------------- |
| light | standard | 0.96                  |
| dark  | standard | 0.24                  |
| light | high     | 0.99                  |
| dark  | high     | 0.06                  |

Proposed resolution rule: for a decision changed by several matching entries,
an entry settles another only when its `when` includes every condition in the
other entry and adds at least one. The explicit dark + high entry settles both
individual entries. The number of conditions alone does not establish priority
between unrelated conditions. Moving an entry within the list has no effect.

Without the combined entry, reject the unresolved collision, identifying the
Color, active modes, and conflicting entries. Reject duplicate conditions too.
For larger combinations the same rule applies: each changed decision needs one
unambiguous result. Disjoint changes combine normally. Authoring may also avoid
a collision by narrowing a condition, for example making the `0.99` choice apply
only to light + high.

Validation considers declared mode combinations, including selections inherited
across nested regions. It must not wait for a consumer to discover a conflict in
the browser. Checks apply to authored decisions; a Color changing its derived
Alpha ramps and Shadow references is ordinary dependency resolution.

## What can an override change?

Proposed shared rule: named records can contain only changed entries. Complete
values remain complete values. A Color replacement supplies its full Color value;
a Shadow position replacement supplies its entire layer list. Arrays are replaced
as a whole; there is no positional array merge or layer-index patch language.

For a rare real change to Shadow lengths, the same optional block could appear
on the ordinary Shadow definition:

```ts
overrides: [
	{
		when: { size: 's' },
		set: {
			ranges: {
				neu: {
					max: [{ x: 0, y: 6, blur: 12, color: { color: 'shd' } }],
				},
			},
		},
	},
];
```

The resolved `neu` range still has all four required positions. Its `max` uses
the smaller lengths and continues following the selected Color mode. This is an
optional example of genuine participation, not a recommended standard treatment.

Modes preserve the authored identity and position catalogue. An override cannot
add or remove tokens, change Spacing's numbered count, or select a different
short-name owner. Validate every resolved combination against its domain rules,
including units, ordered numeric scales, reference validity, and font facts.
Domain workshops will identify the exact permitted fields; this does not make
every field of every domain independently switchable.

## Activation by the environment

The existing direction also allows an environment-selected axis. For example,
the companion's Contrast registration could instead use:

```ts
contrast: {
  default: 'standard',
  modes: ['standard', 'high'],
  activation: {
    media: { high: '(prefers-contrast: more)' },
  },
}
```

The browser's preference chooses the authored mode; domain overrides keep the
same shape. The media feature reports a request for increased contrast.
[Media Queries specification](https://www.w3.org/TR/mediaqueries-5/#prefers-contrast).
The declared default applies when no activation matches. Several matching
non-default modes on one axis are ambiguous and must not acquire an accidental
source-order winner.

For this first proposal, each axis has one activation kind: an attribute or media
conditions. Combining automatic preference selection with manual overrides needs
an explicit product rule before adding a second activation source. An application
can already own that choice and apply the selected attribute. Responsive Size
activation would use the same media approach if needed; automatic breakpoints
are not assumed by this mock. Motion composites remain deferred.

## Review status and checks

Review the ordinary authoring first: the shared registry, the optional
`overrides / when / set` format, and the named initial mode. Then review the
combination and nested-scope behavior. Nothing here is newly ratified yet.

Against the current `codex/v05-reentry` review baseline, additions are workshop
artifacts and progress/decision-document links. No production source or generated
consumer contract is changed. The local types check the main examples' field
shapes and condition vocabulary; they do not implement collision resolution,
reference resolution, media activation, or all validation described here.

```sh
pnpm exec tsc -p docs/blueprints/axes/tsconfig.json
```

The editor check passes. An in-memory review calculation also checked all six
Theme/Size combinations, the stable 29-name catalogue, and the four Contrast
outcomes across all six entry orders. Removing the combined entry identifies
the illustrated conflict. These checks exercise the example and proposed rules;
they are not tests of TFS compiler support or nested browser behavior.

The complete remaining sequence is in the
[workshop progress list](../../v05-workshop-progress.md).
