# Typography workshop — first pass

Status, 2026-09-28: **Font-size and ordinary-role mock ready for review**.
Milestone 1 only. The [Founder Board](../../founder-board.md#typography) owns the
already ratified role grammar. This is the first focused example, not closure
of the whole Typography family or implementation of the new Axis model.

## Read the authored choices

```text
font-size.ts   Numbered size scale, ordinary values and Size mode differences
fonts.ts       One system font stack
typography.ts  One readable prose role using the scale
```

Read [font-size.ts](./font-size.ts), then [typography.ts](./typography.ts).
Each declaration appears immediately after its imports. No intermediate size
builders or interpolation helpers are required. The example values are
illustrative, not a new standard-theme calibration.

The atomic scale can stand alone. Roles are the optional semantic layer: a
role couples a font with a range of font size, weight, line height and letter
spacing choices. Font size stays a reference into the atomic scale.

## Atomic Font size: the proposal to review

Keep one linear scale and the established `--fs-min` plus `--fs-1…12` output.
For authoring, use `start`, `step`, and `count` instead of the legacy numerical
fields `base`, `increment`, and `range`. These field names are a **proposal**;
the scale calculation is the existing one.

| Input   | Meaning                                       | Example    |
| ------- | --------------------------------------------- | ---------- |
| `min`   | Independent value below the numbered scale    | `0.625rem` |
| `start` | Value of `--fs-1`                             | `0.75rem`  |
| `step`  | Amount added for each next numbered position  | `0.125rem` |
| `count` | Number of numbered positions, excluding `min` | `12`       |

Numbered position `n` is `start + step × (n − 1)`. Spacing uses `step × n`;
Font size needs an independent starting value because a useful text-size scale
can begin at 12px while increasing by 2px. Both retain an independent `min`.
There is no unsuffixed `--fs` or generated `--fs-max`.

Proposed mode boundary mirrors the Spacing workshop: unit and count are shared;
Size mode changes may adjust `min`, `start`, and/or `step`. Names stay stable.
Values must be finite, `0 < min < start`, `step > 0`, and count a positive integer.
Keep the existing linear model; this example proposes no ratios, fluid scaling,
breakpoints, or automatic mode selection.

| Token      | Ordinary / `regular` | `s`         | `l`         |
| ---------- | -------------------- | ----------- | ----------- |
| `--fs-min` | `0.625rem`           | `0.625rem`  | `0.6875rem` |
| `--fs-1`   | `0.75rem`            | `0.6875rem` | `0.8125rem` |
| `--fs-2`   | `0.875rem`           | `0.8125rem` | `0.9375rem` |
| `--fs-3`   | `1rem`               | `0.9375rem` | `1.0625rem` |
| `--fs-12`  | `2.125rem`           | `2.0625rem` | `2.1875rem` |

`regular` has no authored differences. Explicit selection restores ordinary
values; an unmarked descendant inherits its surroundings. This uses the existing
shared [axes.ts](../axes/separate-files/axes.ts), including `data-size-mode`.
The application decides when to select a mode.

## Ordinary role: already ratified grammar made visible

The prose role has one weight, `400`, used by all five authored sizes. Its
`fontSize: 3` means “use `--fs-3`”, not 3px. `lineHeight: 1.5` is a unitless
multiplier; `letterSpacing` numbers are in em. No repeated weight is needed.

| Role selection            | Font-size reference | Ordinary size at a 16px root | Weight | Line height |
| ------------------------- | ------------------- | ---------------------------- | ------ | ----------- |
| `prose`, `min`            | `--fs-1`            | 12px                         | 400    | 1.5         |
| `prose`, `s`              | `--fs-2`            | 14px                         | 400    | 1.5         |
| `prose`, omitted / `base` | `--fs-3`            | 16px                         | 400    | 1.5         |
| `prose`, `l`              | `--fs-4`            | 18px                         | 400    | 1.4         |
| `prose`, `max`            | `--fs-5`            | 20px                         | 400    | 1.4         |

The 16px root is an explanatory assumption, not a TFS declaration. The tokens
remain in rem. The role's `min` is its smallest offered text treatment; it need
not use the atomic scale's `min`.

Typography deliberately has a required `base` size: choosing a role alone is
enough to use it. `base` emits unsuffixed role-size names, such as
`--text-prose-font-size`, and the ordinary helper class `.text--prose`.
This does not add a base position to Time, Gap, Radius, or Shadow.

Expected CSS consumption, using existing generated helper class names:

```html
<p class="text--prose">Ordinary prose</p>
<p class="text--prose-max">The largest prose treatment</p>

<section data-size-mode="l">
	<p class="text--prose">Same role; its referenced size is now 1.0625rem.</p>
</section>
```

The existing generated TypeScript selection is `{ role: 'prose' }`, or
`{ role: 'prose', size: 'max' }`, passed to `typographyClassName` with the generated
CSS Module map. Framework components, HTML elements, color and layout stay
application-owned. A role name never chooses an HTML heading level.

When Size changes, these unchanged role references follow the atomic scale.
Authors do not repeat their roles in each mode. The compiler must rebind aliases
at affected scopes; the review probe demonstrates that obligation, including a
nested `regular` region inside `l`.

## Font boundary and remaining passes

The founder has brought the actual-font connection forward. The
[font workflow review](./font-workflow.md) distinguishes authored identities,
CSS names and inspected capabilities, and records the existing TFS/Scatter
preparation evidence. Review that complete workflow before expanding the role
mock; the basic scale input proposal remains open.

The [real-font companion](./real-fonts/README.md) is now ready: one complete
source declaration, a role offering normal/italic at 400/700, project wiring,
actual generated fallback CSS, and a rejected 900 weight. Existing preparation
functions ran against read-only Scatter files; temporary outputs were loaded in
Chromium. This is review evidence, not production overhaul implementation.

[fonts.ts](./fonts.ts) uses the existing system-font escape hatch. There is no
project font file to inspect, so it honestly reports `verification: 'unavailable'`.
That does not certify the physical font's weights or features. The companion
provides the prepared-font alternative for comparison.

1. **Now:** review the actual-font companion and the open atomic input proposal.
2. **Next:** finish sparse role
   sizes, role-local weight ranges and size-specific weights;
   categorical variants and physical styles; prepared font facts and useful
   derivation helpers. Use focused cases, not one overloaded declaration.
3. **Then:** any genuine role changes across Axes/Modes, the complete CSS/TS
   consumer surface, and Typography closure. Keep the ratified complete-value
   ownership rule; do not carry legacy `modeOverrides` forward as a new API.

Two current implementation details belong in the later hygiene review, not as
fresh founder choices: scalar weight `400` currently normalizes to a generated
`font-weight-base` token; system-font verification appears as an explicit source
property. The full consumer/font pass should expose these honestly before
deciding whether either surface needs simplification. This first pass adds no
new scalar-weight alias or new font-verification policy.

## Verification boundary

[expected-tokens.txt](./expected-tokens.txt) lists all 37 token names and their
values across ordinary/regular/s/l. It is evidence from the current generators,
not proof that the new authoring model is implemented.

The bounded probe adapts this mock's `start/step/count` to the current
`base/increment/range` fields and explicitly resolves this one Size axis. Existing
core authoring, validation, token generation, class generation and class selection
are reused. Browser checks cover all five role sizes in every mode and nested
restoration. The probe supplies the necessary scope declarations itself; it is
not a new generic-Axis compiler. Font appearance, physical capabilities and
visual calibration are not certified by these computed-style checks.

```sh
pnpm exec tsc -p docs/blueprints/typography/tsconfig.json
node docs/blueprints/typography/verify.mjs
```
