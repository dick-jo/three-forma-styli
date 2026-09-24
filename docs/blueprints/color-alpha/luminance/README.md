# Ordinary colours and an optional luminance rule

Status, 2026-09-24: **representative companion ready for founder review**.
Milestone 1 only. The functions exercised here already exist. This review does
not implement new runtime optionality or relocate the authored policy.

```text
luminance/
  color.ts             Ordinary authored palette, with no luminance policy
  runtime-contract.ts  Runtime-facing config excerpt for a project choosing a rule
  customer-theme.ts    The same colours as customer input, then one deliberate edit
  expected-results.txt Measured outcomes, diagnostics, and all emitted Color variables
```

## A. Author your own palette

```ts
export const colors = {
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.3, 0, 0),
		pri: oklch(0.5, 0.16, 285),
		neu: oklch(0.75, 0, 0),
		ink: oklch(0.9, 0, 0),
	},
};
```

TFS generates those colours faithfully. There is no luminance setting to fill in,
no required foreground/background classification, and no adjustment to `pri`.
With the selected Alpha schedule, the five swatches emit 40 Color variables.

For example:

```text
--clr-bg:       oklch(0.2000 0.0000 0.00)
--clr-ev:       oklch(0.3000 0.0000 0.00)
--clr-pri:      oklch(0.5000 0.1600 285.00)
--clr-pri-a-lo: oklch(0.5000 0.1600 285.00 / 0.2500)
```

These illustrative values deliberately fail the optional rule below. That does
not make their token definitions invalid or oblige the author to adopt that rule.

## B. Let customers submit palettes subject to your product's rule

Scatter chooses this rule for its custom palettes:

```ts
luminance: {
  minimumLuminanceDelta: 0.33,
  backgroundColors: ['bg', 'ev'],
  foregroundColors: ['pri', 'neu', 'ink'],
}
```

In plain terms: keep every selected foreground at least `0.33` away from every
selected background in the intended light/dark direction. The measurement is
**OKLCH lightness (`L`)**, not a WCAG contrast ratio. These are base swatches;
the calculation does not check Alpha variants, compositing, or actual component
foreground/background pairings. It is a chosen palette rule, not an accessibility
certification.

The lists select identities for this rule. They do not require named Groups in
`colors.groups`, and a Group named `background` acquires no automatic behaviour.

The current Board places an optional authored rule at `colors.luminance`.
`runtime-contract.ts` shows the portion available to the application after
generation. It is a review excerpt, not a request to maintain the same rule in
two files. Whether the authored rule should stay in Color is still under review;
the calculation and acceptance example do not depend on deciding that now.

### Preview and report

The application imports its generated configuration and calls the existing API:

```ts
const preview = generateRuntimeColorTheme(customerTheme, runtimeColorThemeConfig);

preview.customProperties; // The requested colours, including their Alpha variants.
preview.luminance.deltaValid; // false
preview.luminance.actualDelta; // 0.20
preview.luminance.requiredDelta; // 0.33
```

For this dark-background palette, the nearest pair is `ev` at `0.30` and `pri`
at `0.50`. Their gap is `0.20`. Nothing is recoloured or rejected merely because
the editor asked to preview and measure it.

The diagnostics also explain a possible edit: with these backgrounds unchanged,
foregrounds must have `L >= 0.63`. `pri` is short by `0.13`. Alternatively, an
author could change the backgrounds; TFS does not choose the edit.

### Accept only if the rule passes

At its acceptance boundary, the application requests enforcement:

```ts
const accepted = enforceRuntimeColorTheme(customerTheme, runtimeColorThemeConfig);
// Throws RuntimeLuminanceConstraintError: measured 0.20, requires at least 0.33.
// Application persistence/application occurs only after a successful check.
```

The customer then changes `pri.l` to `0.63`, as shown in `correctedTheme`:

```ts
const accepted = enforceRuntimeColorTheme(correctedTheme, runtimeColorThemeConfig);
// Succeeds: 0.63 - 0.30 = 0.33. The exact boundary is allowed.
```

| Request                                    | Outcome with the original five colours              |
| ------------------------------------------ | --------------------------------------------------- |
| Ordinary token generation, no rule         | Emit the authored colours                           |
| Runtime preview with the rule              | Emit the same colours and report the failing gap    |
| Runtime acceptance with the rule           | Reject the palette                                  |
| Runtime acceptance after the customer edit | Accept; only `pri` and its Alpha variants change    |
| Runtime preview missing `ink`              | Reject malformed input before a preview is produced |

There is no contradiction in allowing a failing editor preview but refusing to
save it as a valid customer palette. The application owns when each action runs.
These functions return data or throw; they do not save records or change the DOM.

Light-background palettes use the same rule in the opposite direction. Today's
runtime payload calls dark backgrounds `negative` polarity and light backgrounds
`positive` polarity. This indicates a direction for the calculation; it does not
select a Theme mode or an application attribute. The review verifies both
directions. Diagnostics measure the values at emitted CSS precision.

## Recommendation to review

1. **Ordinary token authoring needs no rule.** Keep the existing simple path.
2. **A luminance rule is optional project policy.** It can be useful for checking
   a deliberately authored palette as well as customer input. Merely declaring
   it does not imply recolouring tokens or rejecting editor previews.
3. **The caller deliberately requests enforcement.** Preserve the distinction
   between useful diagnostics and accepting a palette under a rule.
4. **Runtime colour generation should also work without a luminance policy.**
   This is the proposed simplification; it is not supported by today's generator
   or runtime-contract builder. They currently require the rule even for previews.

Policy-free runtime generation would still validate the input shape, identities,
and colour values. Omit a rule rather than inventing a zero-threshold placeholder.
The exact optional result types and treatment of `polarity` without a rule belong
in the next runtime contract mock, after agreement on this direction.

One concrete code-hygiene item follows from the existing behaviour: generated
contracts include an `enforce` list, but the current runtime functions do not read
it. Calling `generateRuntimeColorTheme` reports diagnostics; calling
`enforceRuntimeColorTheme` enforces regardless of that list. Do not treat the list
as an operative switch in examples. Recommend removing redundant enforcement
configuration in the later architecture pass, subject to consumer triage.

## Evidence and boundary

The parent review script executes the existing core functions against these
inputs. It checks ordinary generation, parity with runtime output, failing
diagnostics, rejection on acceptance, the exact passing boundary, both polarities,
one malformed-input case, and unchanged output when optional policy data is
declared during ordinary generation. The snapshot includes all 40 Color variables
before and after the customer edit and the diagnostic values.

The script uses a small explicit adapter from the ordinary catalogue to the
current generator's legacy input. It does not implement generic Axes. No new
runtime API, Workbench UI, persistence flow, or Scatter change is implemented.
The runtime-facing config is a handwritten review excerpt; this script does not
generate it through the project compiler.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```

Scatter source evidence was read in the preceding review: its theme editor uses
`generateRuntimeColorTheme` for diagnostics; `features/theme/schema.ts` calls
`enforceRuntimeColorTheme` to determine applicability; the collection edit route
uses that acceptance boundary. These examples use simpler values and do not claim
to be a live production verification or Scatter's actual current palette.
