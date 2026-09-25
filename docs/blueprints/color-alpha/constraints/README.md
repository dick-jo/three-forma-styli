# Optional constraints alongside authored values

Status, 2026-09-25: **declaration proposal ready for founder review**.
The authoring principle is agreed; this property layout and the placement of
polarity are proposals. No production schema or Workbench code is changed.

## Recommendation

Keep the values first, followed by optional `constraints` in the same domain.
The [complete color.ts](./color.ts) is short enough to read in one glance:

```ts
export const colors = {
	tokens: {
		bg: oklch(0.2, 0, 0),
		ev: oklch(0.3, 0, 0),
		pri: oklch(0.5, 0.16, 285),
		neu: oklch(0.75, 0, 0),
		ink: oklch(0.9, 0, 0),
	},
	constraints: {
		luminance: {
			polarity: 'negative',
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['pri', 'neu', 'ink'],
		},
	},
};
```

The author can omit `constraints` entirely. Declaring it supplies the relationships
that TFS should check during authoring; it adds no tokens and changes no values.
`constraints` uses the existing TFS vocabulary. There is no separate `rules` API.

This would replace the current direct `colors.luminance` field with
`colors.constraints.luminance`. One optional section gives these relationships a
clear home without accumulating unrelated settings among the ordinary values.
No hue rule, callback mechanism, rule registry, severity setting, or general
constraint language is proposed.

## What the author experiences

With the supplied values, the useful feedback is:

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

## Why keep it in the domain?

The alternative would give the system a separate constraint catalogue:

```ts
// constraints.ts — alternative only
export const constraints = {
	colors: {
		luminance: {
			polarity: 'negative',
			minimumLuminanceDelta: 0.33,
			backgroundColors: ['bg', 'ev'],
			foregroundColors: ['pri', 'neu', 'ink'],
		},
	},
};

// assembly — alternative only
export const system = { colors, constraints };
```

| Layout                    | Authoring consequence                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `colors.constraints`      | Values and their intended relationships are visible together; one optional section           |
| Separate system catalogue | Another declaration and assembly connection; rules are further from the values they describe |

Recommend the first for the current scope. Both luminance separation and the
founder's hypothetical hue separation concern Color. Neither establishes a need
for a system-wide constraint catalogue. File extraction remains ordinary TS
organisation if a real source file grows; it does not require a new owner for
the data. Exact exported types remain later architecture work.

## One detail this example does not settle

The existing luminance calculation needs a direction. Here, `negative` means
foregrounds must be lighter than backgrounds; `positive` means the reverse.
The proposed single-palette declaration includes it explicitly so the check has
all the information it needs. It does not infer a direction from a Theme name or
turn polarity into another Axis.

How that direction is supplied for multiple authored modes, and how it relates
to a customer's runtime polarity, is still open. The next example must show that
without duplicating the shared rule or inventing an override precedence. This
mock establishes neither generic merging of constraint objects nor a second
polarity value that silently wins over an existing one.

## Verification

The parent review script adapts this proposed declaration to the existing core
validator and luminance calculation. It verifies the same failing/passing
diagnostics as the preceding companion, checks declared identities, and confirms
identical emitted tokens. The supporting types check the shape, not exact member
names against the palette. No proposed compiler or live feedback is implemented.
Authoring and runtime diagnostics must agree at emitted precision; these concrete
values already fit that precision, so this probe does not implement normalization.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```
