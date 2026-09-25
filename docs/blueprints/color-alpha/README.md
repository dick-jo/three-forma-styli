# Color and Alpha authoring review

Status, 2026-09-24: **first representative mock, awaiting founder review**.
The [ordinary-palette input/output model](./baseline/README.md) is now ratified:
complete top-level values, no `axes.default`, and application-selected modes.
This main mock has been updated to match. Previous versions remain in Git.

Milestone 1 only. The Board's existing Color/Alpha, identity, Group, and Axis
contracts remain authoritative. No production schema or compiler is changed.
Numerical colour and opacity choices illustrate authoring, not a calibrated
standard theme or accessibility guarantee.

## Read these first

```text
color-alpha/
  color.ts             Palette, Theme differences, and authored Groups
  alpha.ts             One ordinary Alpha scale and one optional additional scale
  expected-tokens.txt  Every token: ordinary, light, and dark values side by side
  review-types.ts      Supporting declarations; not another authoring chore
  groups/              Focused explicit/prefix Group input and resolved output
  luminance/           Ordinary authoring beside optional diagnostics and acceptance
  constraints/         Endorsed inline declaration; shared rule uses palette polarity
```

The files use the accepted [axes.ts](../axes/separate-files/axes.ts) registry.
Their main declarations follow the imports. There is no intermediate palette
builder, mapping loop, generated-package import, or duplicated identity union.

## What the example demonstrates

- **Ten swatches.** The complete standard neutral/accent vocabulary appears as
  `neu / pri / duo / tri / tet / pen`. `bg`, `ev`, `ink`, and `shd` serve the
  particular design system. A project can use fewer accents or custom identities.
- **Complete ordinary palette.** All ten swatches appear together at the top.
  Dark needs no entry because it has no differences. Light changes `bg`, `ev`,
  `ink`, `neu`, and `shd`; the five accents keep their ordinary values. Theme is
  the only axis directly changing any swatch. No selected mode is needed for a
  usable palette, and the axis list's order does not choose a mode.
- **One ordinary Alpha scale.** Six authored active positions, plus the automatic
  `non: 0` boundary. The opaque swatch itself remains available as `--clr-pri`.
- **An optional second scale.** `pri` uses the existing `deriveAlphaScale` helper
  inline. It produces the ordinary explicit values `0.1 / 0.2 / 0.3 / 0.4 / 0.5 / 0.6`.
  The helper is optional; authors may write those six values themselves.
- **One selected scale for Color ramps.** Omission of `colors.alphaScale` selects
  `alpha.defaultScale`, here `neu`. Setting `alphaScale: 'pri'` would change the
  opacities of all Color ramps without changing their token names. It would not
  change which standalone Alpha scale receives short names.
- **Two optional Groups.** `accents` and `glow` name selections of existing
  identities. A Color can belong to both; groups do not duplicate its tokens.
  `glow` carries no intrinsic TFS behaviour. An author can pass its identity list
  to the already ratified Shadow helper when they want that expansion.

Alpha scale `pri` and Color `pri` are independent authored identities. Sharing
the name does not connect them: Color `pri`, like every swatch here, uses the
selected `neu` Alpha schedule. No extra opacity schedule is hidden in Color.

## Expected output

The table uses compact numbers; the complete token list preserves the existing
formatter's fixed decimal precision.

| Example          | Light                        | Dark                     |
| ---------------- | ---------------------------- | ------------------------ |
| `--clr-pri`      | `oklch(0.6 0.16 285)`        | Same                     |
| `--clr-pri-a-lo` | `oklch(0.6 0.16 285 / 0.25)` | Same                     |
| `--clr-shd`      | `oklch(0.12 0 0)`            | `oklch(0.06 0 0)`        |
| `--clr-shd-a-lo` | `oklch(0.12 0 0 / 0.25)`     | `oklch(0.06 0 0 / 0.25)` |
| `--a-lo`         | `0.25`                       | Same                     |
| `--a-pri-lo`     | `0.3`                        | Same                     |

Every swatch has its own unsuffixed colour plus
`a-non / a-min / a-lo-x / a-lo / a-hi / a-hi-x / a-max`.
Each Alpha scale has `non / min / lo-x / lo / hi / hi-x / max`.

That is **80 Color variables + 14 Alpha variables = 94 names**, stable across
the ordinary set and both modes. The complete [expected token list](./expected-tokens.txt) shows every
name and value; it is review evidence, not production compiler output.
There is no `--a-neu-lo` duplicate, no unsuffixed `--a`, and Groups emit no extra
Color aliases. No brightness ramp is introduced by this example.

## Still to review before closing Color and Alpha

1. Founder review of these ordinary files and their outputs.
2. Runtime palette authoring and application: exact selected payload, invalid or
   incomplete values, reuse of the policy and selected Alpha schedule, and the
   consumer contract. Preserve the current exact-input rule; partial runtime
   payloads need an explicit inheritance source. Authored shared defaults are
   not permission to silently fill untrusted runtime input.

These are planned companion examples, not permission to implement the overhaul.
The existing full Shadow mock remains authoritative for Shadow authoring.

The founder endorsed the [Groups companion](./groups/README.md) on 2026-09-24:
explicit/prefix selections, exact resolved members, inline Shadow usage, and
application consumption. The existing resolver's loss of exact member types when
resolving a prefix during authoring remains a later API/architecture triage item.
The [luminance companion](./luminance/README.md), continuous authoring-feedback
principle, and [domain-owned constraint declaration](./constraints/README.md) were
endorsed on 2026-09-25. Polarity comes from the palette/theme mode as already
established; the rule does not redeclare it. No new Shadow darkness rule is proposed.

## Luminance workshop starting point

The founder questions the relationship between minimum lightness separation and
ordinary design-system authoring. Keep that question visible rather than carrying
the current configuration placement forward merely because it exists.

Read-only source inspection, 2026-09-24; no Scatter changes or live deployment
verification:

- Scatter's `packages/design-system/src/design-system.ts` declares a minimum
  OKLCH-L delta of `0.33`, backgrounds `bg / ev`, and foregrounds `pri / neu / ink`.
  Its source still uses an earlier TFS shape; it is consumer evidence, not the
  new authoring blueprint.
- `apps/main/src/features/theme/themeBuilder/validation.ts` calls
  `generateRuntimeColorTheme` and reads its diagnostics to report validity and
  per-colour headroom. An invalid separation is useful editor state.
- `apps/main/src/features/theme/schema.ts` calls `enforceRuntimeColorTheme` when
  determining whether a custom palette is applicable. The collection edit route
  uses that boundary to reject invalid palettes before persistence.
- In current TFS, ordinary Color generation does not require a luminance policy.
  If supplied, its configuration and identity references are validated; this is
  distinct from enforcing the palette's actual separation.
- `packages/compiler/src/workspace/contracts.ts` currently requires both
  `colors.luminance` and `project.runtime.colorThemes` to generate a runtime theme
  contract. That coupling deserves an explicit product decision.

The [luminance companion](./luminance/README.md) now shows ordinary token authoring
without a policy beside Scatter-style custom palette diagnostics and acceptance.
The same five colours compile normally and can be previewed, but fail a requested
`0.33` separation rule with a measured `0.20` gap. A deliberate customer edit reaches
`0.33` and passes. Both polarities and all emitted values are verified.

The founder endorsed optional policy, explicit enforcement, and runtime generation
without compulsory luminance configuration on 2026-09-25. The last capability is
not implemented today. The subsequent authoring verdict puts continuous feedback
inside the primary design-system authoring flow. The
[declaration](./constraints/README.md) now records the endorsed domain-owned
`constraints` section. The exact optional runtime contract remains for review.
The mock's accidental duplication of polarity inside the shared rule has been
corrected: the theme/mode supplies it, and the same rule works in both directions.
No automatic correction or mandatory rule is ratified.

The current generated `enforce` metadata is also recorded for architecture triage:
the runtime functions ignore it, and the chosen API determines enforcement. The
review does not present that metadata as an operative switch.

## Verification boundary

The local TypeScript check covers the proposed field shapes, axis/mode vocabulary,
and real Alpha helper imports. Group-member spelling, value validity, resolved
palette completeness, and exclusivity are not fully encoded in these draft types.
The review calculation checks this example's identity coverage, Groups, Alpha
values, and token output using existing core functions after explicitly resolving
the ordinary palette and both modes. The individual Light/Dark values are unchanged
from the earlier mock. This does not exercise a new generic-axis compiler,
nested CSS, or browser application integration.
The Groups companion also checks the existing resolver/validator against explicit
and prefix inputs, automatic membership, declaration order, seven invalid inputs,
and unchanged Color generation. Its Shadow helper remains declaration-only.
The luminance companion executes existing runtime preview/enforcement functions,
checks ordinary/runtime output parity, and records all 40 Color variables before
and after the customer edit. Its configuration is a handwritten contract excerpt;
no new runtime schema or policy-free runtime generation is implemented.
The constraint declaration is adapted to the same existing core calculation and
validator; its failing/passing diagnostics and token output agree with the preceding
example. Both palette polarities use the same rule. These fixtures do not implement
live authoring feedback or a generic-Axis compiler.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```

The review script reads current source without building packages. Passing `--write`
deliberately refreshes the token snapshot after a reviewed mock change.
