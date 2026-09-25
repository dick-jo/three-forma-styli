# One shared constraint across authored modes and customer palettes

Status, 2026-09-25: **domain-owned constraints and direct palette polarity ratified**.
This revision makes the complete context visible: ordinary values, their polarity,
Light-mode changes, and one shared rule. The customer example uses that same rule.
No production schema or Workbench code is changed.

## Approved placement

Keep the values first, followed by optional `constraints` in the same domain.
The [complete color.ts](./color.ts) is short enough to read in one glance:

```ts
export const colors = {
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.3, 0, 0),
		pri: oklch(0.7, 0.16, 285),
		neu: oklch(0.75, 0, 0),
		ink: oklch(0.9, 0, 0),
	},
	polarity: 'negative',
	constraints: {
		luminance: {
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['pri', 'neu', 'ink'],
		},
	},
	modes: {
		theme: {
			light: {
				tokens: {
					bg: oklch(0.8, 0, 0),
					ev: oklch(0.7, 0, 0),
					pri: oklch(0.3, 0.16, 285),
					neu: oklch(0.25, 0, 0),
					ink: oklch(0.1, 0, 0),
				},
				polarity: 'positive',
			},
		},
	},
};
```

The existing [axes.ts](../../axes/separate-files/axes.ts) registers Light and Dark.
With no mode selected at the root, TFS uses the ordinary palette. Dark has no
differences and needs no entry; selecting it restores ordinary values and polarity. Light
changes its values and polarity. The constraint stays shared.

`polarity` is a named Color property beside the palette it describes. The top
level is the complete ordinary Color definition; modes supply changes to it.
Omitting polarity from a mode retains the ordinary value. A palette can omit
polarity altogether when neither a directional check nor a consumer needs it.
There is no authoring `metadata` wrapper or separate constraint-owned mode map.
This preserves the existing direction and runtime payload meanings. Generated
contract migration from the current metadata representation belongs to later work.

The author can omit `constraints` entirely. Declaring it supplies the relationships
that TFS should check during authoring; it adds no tokens and changes no values.
`constraints` uses the existing TFS vocabulary. There is no separate `rules` API.

The approved blueprint replaces the current direct `colors.luminance` field with
`colors.constraints.luminance`. One optional section gives these relationships a
clear home without accumulating unrelated settings among the ordinary values.
No hue rule, callback mechanism, rule registry, severity setting, or general
constraint language is proposed.

## Expected results

| Palette         | Polarity   | Closest gap in OKLCH L      | Rule          |
| --------------- | ---------- | --------------------------- | ------------- |
| Ordinary / Dark | `negative` | `pri 0.70 - ev 0.30 = 0.40` | Passes `0.33` |
| Light           | `positive` | `ev 0.70 - pri 0.30 = 0.40` | Passes `0.33` |

The same 40 Color variables are emitted for both palettes. For example:

| Token            | Ordinary / Dark                        | Light                                  |
| ---------------- | -------------------------------------- | -------------------------------------- |
| `--clr-pri`      | `oklch(0.7000 0.1600 285.00)`          | `oklch(0.3000 0.1600 285.00)`          |
| `--clr-pri-a-lo` | `oklch(0.7000 0.1600 285.00 / 0.2500)` | `oklch(0.3000 0.1600 285.00 / 0.2500)` |

[expected-review.txt](./expected-review.txt) contains every name/value and the
measured results. Constraints and polarity generate no additional CSS variables.

## Feedback while authoring

If the author temporarily changes ordinary `pri.l` from `0.70` to `0.50`, the
useful feedback is:

> `pri` is 0.20 above the nearest background, `ev`; your rule requires 0.33.
> With the backgrounds unchanged, `pri` needs lightness of at least 0.63.

After the author changes `pri.l` to `0.63`, the check passes. The existing
calculation already supplies the measured gap, bound, and per-colour headroom.
This proposed wording is explanatory copy, not a new diagnostic schema.

The intended Workbench experience refreshes that feedback as relevant values
change. Editing a TS source file should also surface results through the normal
authoring/build tooling, without a mandatory separate test ceremony. Exact timing
and editor integrations belong to the implementation plan; no arbitrary numerical
relationship is promised as a TypeScript compile-time guarantee.

Temporary rule violations remain useful editing states. A caller deliberately
chooses when passing the check is required. Presence of `constraints` alone does
not mean “reject this draft”, automatically adjust colours, or enable a runtime
theme-building capability. The same rule data and calculation should serve
authoring feedback and a consumer such as Scatter.

## A customer supplies a palette

The [customer input](../luminance/customer-theme.ts) retains the existing runtime
shape: `polarity` plus the exact selected colours. The sample is:

```ts
export const customerTheme = {
	polarity: 'negative',
	colors: {
		bg: { l: 0.2, c: 0, h: 0 },
		ev: { l: 0.3, c: 0, h: 0 },
		pri: { l: 0.5, c: 0.16, h: 285 },
		neu: { l: 0.75, c: 0, h: 0 },
		ink: { l: 0.9, c: 0, h: 0 },
	},
};
```

The application uses its generated runtime configuration. The
[review excerpt](../luminance/runtime-contract.ts) now reads the rule from
`colors.constraints.luminance`; the threshold and identity lists are authored
only once. This source import illustrates the compiler's projection. A real
application imports the generated package, not its authoring source files.

```ts
const preview = generateRuntimeColorTheme(customerTheme, runtimeColorThemeConfig);
// Same requested colours; gap 0.20; luminance.deltaValid is false.

const accepted = enforceRuntimeColorTheme(customerTheme, runtimeColorThemeConfig);
// Rejects the failing rule. No automatic correction or borrowing a mode's values.
```

Changing the customer's `pri.l` to `0.63` makes the gap `0.33`, so acceptance
succeeds. The payload's own polarity supplies the direction; the active page
mode does not override it. A positive-polarity customer palette works through
the same existing calculation.

Runtime palette generation remains an optional project capability. Its authored
selection at `project.runtime.colorThemes.colors.include` determines the exact
accepted identities; this example uses `bg / ev / pri / neu / ink`. Missing,
unknown, or invalid colour values are rejected. Partial runtime palettes do not
silently inherit ordinary or mode values. Every identity used by the configured
rule must be present in that runtime selection; diagnose a mismatch rather than
dropping operands. Existing Groups may supply selections, without acquiring
automatic foreground/background meanings.

## What remains before leaving Color and Alpha?

The declaration, direct `polarity` property, optional-rule principle, and distinction
between feedback and enforcement are settled. The complete example reflects the
founder's authoring decisions.

Only two concrete runtime details remain to confirm. Recommendation:

| Runtime request                                                   | Proposed result                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Generate with no constraint configured                            | Validate the exact input, emit its colours, return `luminance: null` |
| Explicitly enforce a luminance constraint when none is configured | Report a configuration error; do not claim that enforcement passed   |

`null` makes “no check was requested” distinct from a successful check. These are
proposed output/error details for the already agreed optional-rule capability;
they are not implemented by this mock. The existing runtime still requires a
luminance configuration. Payload polarity keeps its established meaning and shape.

After confirmation of those two details, Color/Alpha can close and
the workshop can move to Spacing/Gap/Border radius/width. The later architecture
and implementation milestones own generic-Axis resolution, public typings,
diagnostic refresh, source locations, removal of redundant `enforce` metadata,
consumer migration, and checks across all supported runtime cases. Those tasks
do not require another philosophical constraint or polarity workshop. Future hue
rules remain deferred.

## Verification

The parent review script adapts this blueprint declaration to the existing core
validator and luminance calculation. It explicitly resolves this fixture's
ordinary/Dark/Light palettes and polarity, checks all 40 stable token names and
runtime parity, and exercises the customer draft/edit outcomes. The supporting
types check the registered Axis/Mode names and polarity vocabulary, not every
reference or required-polarity condition. No new compiler or live feedback
is implemented. The no-constraint runtime result above remains proposed.
Authoring and runtime diagnostics must agree at emitted precision; these concrete
values already fit that precision, so this probe does not implement normalization.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```
