# Color and Alpha authoring review

Status, 2026-09-24: **first representative mock, awaiting founder review**.
Milestone 1 only. The Board's existing Color/Alpha, identity, Group, and Axis
contracts remain authoritative. No production schema or compiler is changed.
Numerical colour and opacity choices illustrate authoring, not a calibrated
standard theme or accessibility guarantee.

## Read these first

```text
color-alpha/
  color.ts             Palette, Theme differences, and authored Groups
  alpha.ts             One ordinary Alpha scale and one optional additional scale
  expected-tokens.txt  Every expected token, with light and dark values side by side
  review-types.ts      Supporting declarations; not another authoring chore
```

The files use the accepted [axes.ts](../axes/separate-files/axes.ts) registry.
Their main declarations follow the imports. There is no intermediate palette
builder, mapping loop, generated-package import, or duplicated identity union.

## What the example demonstrates

- **Ten swatches.** The complete standard neutral/accent vocabulary appears as
  `neu / pri / duo / tri / tet / pen`. `bg`, `ev`, `ink`, and `shd` serve the
  particular design system. A project can use fewer accents or custom identities.
- **Shared defaults.** The five accents stay constant. Light inherits the shared
  `shd`; Dark explicitly replaces it. The remaining four swatches have named
  Light/Dark values. Theme is the only axis directly changing any swatch.
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
both modes. The complete [expected token list](./expected-tokens.txt) shows every
name and value; it is review evidence, not production compiler output.
There is no `--a-neu-lo` duplicate, no unsuffixed `--a`, and Groups emit no extra
Color aliases. No brightness ramp is introduced by this example.

## Still to review before closing Color and Alpha

1. Founder review of these ordinary files and their outputs.
2. A focused companion for prefix-matched Groups and custom identity selections.
3. The existing `colors.luminance` policy, its OKLCH-L diagnostics, and the
   distinction between authoring a policy and enforcing it. No new automatic
   Shadow darkness rule is proposed.
4. Runtime palette authoring and application: exact selected payload, invalid or
   incomplete values, reuse of the policy and selected Alpha schedule, and the
   consumer contract. Preserve the current exact-input rule; partial runtime
   payloads need an explicit inheritance source. Authored shared defaults are
   not permission to silently fill untrusted runtime input.

These are planned companion examples, not permission to implement the overhaul.
The existing full Shadow mock remains authoritative for Shadow authoring.

## Verification boundary

The local TypeScript check covers the proposed field shapes, axis/mode vocabulary,
and real Alpha helper imports. Group-member spelling, value validity, resolved
palette completeness, and exclusivity are not fully encoded in these draft types.
The review calculation checks this example's identity coverage, Groups, Alpha
values, and token output using existing core functions after explicitly resolving
the two complete palettes. This does not exercise a new generic-axis compiler,
nested CSS, luminance enforcement, or browser runtime integration.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```

The review script reads current source without building packages. Passing `--write`
deliberately refreshes the token snapshot after a reviewed mock change.
