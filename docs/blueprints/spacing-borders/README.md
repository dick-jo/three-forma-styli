# Spacing, Gap, Border radius and Border width

Status, 2026-09-25: **representative mock and recommendations for founder review**.
Milestone 1 only. No production source, standard theme, or consumer is changed.
The existing Axis and four-position Gap/Radius contracts remain authoritative.
Numerical choices illustrate authoring, not a new standard-theme calibration.

## Read the authored files

```text
spacing.ts        One generated scale, then optional Size differences
gap.ts            Four chosen Spacing references
border-radius.ts  Four independently chosen Spacing references
border-width.ts   One structural width
system.ts         Assembly with the existing central axes.ts
alternatives.ts   Rem units and genuine mapping/width changes
expected-tokens.txt  Every resolved token across ordinary/regular/s/l
```

The main declarations immediately follow imports. The supporting review types
reuse the existing Axis catalogue and four-position range type; authors do not
declare another position list or read another domain's computed values.

## Spacing

```ts
export const spacing = {
	unit: 'px',
	min: 4,
	step: 8,
	count: 12,
	modes: {
		size: {
			s: { min: 3, step: 6 },
			l: { min: 5, step: 10 },
		},
	},
};
```

`step: 8` generates multiples of eight: `--sp-1: 8px`, `--sp-2: 16px`,
through `--sp-12: 96px`. `min: 4` supplies the separate smaller value
`--sp-min: 4px`. `count: 12` counts numbered positions; there are 13 Spacing
tokens including `min`. It does not establish a twelve-token global limit.

**Naming recommendation:** replace the old numerical inputs `base` and `range`
with `step` and `count`. The multiplication is unchanged. There is no generated
`base` position, unsuffixed `--sp`, or `--sp-max`; the final numbered position is
the endpoint. `min` is an explicit authored value, not automatically half a step.

The registered `regular` mode has no differences and needs no entry. With no mode
selected at the root, ordinary values apply. Selecting `regular` inside `s`
restores ordinary values; unmarked descendants inherit their surrounding values.
The application selects Size. This mock does not assume viewport breakpoints.

**Recommendation:** one Spacing scale, with a shared unit and count; modes change
`min` and/or `step`. Keep the same token identities in every mode. Additional
simultaneous named Spacing scales or arbitrary authored lists are not proposed
without a concrete need. The existing linear ruler is the intended foundation.

## Gap and Radius

```ts
export const gap = {
	min: 'min',
	s: 1,
	l: 3,
	max: 6,
};

export const radius = {
	min: 'min',
	s: 1,
	l: 2,
	max: 3,
};
```

`gap.l: 3` means **use Spacing position 3**, not 3px. `radius.l: 2` means
use Spacing position 2. Each domain has its own four deliberate choices. In this
example a layout gap can be larger than a corner radius without inventing any
measurements outside Spacing.

The positions remain the ratified `min / s / l / max`. All four are required,
with strictly increasing resolved values. A reference is `'min'` or an existing
integer Spacing position. Fractions, absent positions, and duplicate/reversed
resolved values are invalid. They inherit the referenced unit; authors do not
relabel an 8px reference as 8rem or repeat `spacingMode` selections.

Both mappings follow the active Spacing values automatically. They need no
`modes` entry merely to follow Size. If an author wants a different mapping in
Large, the [alternative](./alternatives.ts) adds only:

```ts
modes: {
	size: {
		l: { max: 4 },
	},
},
```

That changes `--bdr-max` from Spacing position 3 to position 4: `40px` in Large,
instead of `30px`. Other positions keep their mappings and follow Large Spacing.
Each position is one reference value; the resolved range must still be ordered.
This uses the approved mode pattern; it is an optional authoring example.

## Border width

```ts
export const width = {
	unit: 'px',
	value: 1,
};
```

**Recommendation:** retain one scalar `--bdw`, independent of Spacing. The
ordinary example stays `1px` across all Size modes. Do not introduce a Border
width scale solely to make its shape resemble another domain.

When a width genuinely changes, the alternative uses the same `modes.size.l`
structure with `{ value: 2 }`. No extra identity or width token is created.
Zero remains a valid authored width, but TFS does not generate a separate
"no border" token. A component can simply omit a border or use CSS `none`.

## Expected output and use

| Token       | Ordinary / regular | s    | l     |
| ----------- | ------------------ | ---- | ----- |
| `--sp-min`  | 4px                | 3px  | 5px   |
| `--sp-1`    | 8px                | 6px  | 10px  |
| `--sp-12`   | 96px               | 72px | 120px |
| `--gap-l`   | 24px               | 18px | 30px  |
| `--gap-max` | 48px               | 36px | 60px  |
| `--bdr-l`   | 16px               | 12px | 20px  |
| `--bdr-max` | 24px               | 18px | 30px  |
| `--bdw`     | 1px                | 1px  | 1px   |

[expected-tokens.txt](./expected-tokens.txt) lists all **22 stable names**:
13 Spacing, four Gap, four Radius, one Width. The semantic references are retained
alongside their resolved lengths. There is no unsuffixed `--gap` or `--bdr`.

Consumers can write `padding: var(--sp-2)`, `gap: var(--gap-l)`,
`border-radius: var(--bdr-s)`, and `border-width: var(--bdw)`.
Changing the enclosing `data-size-mode` selects the corresponding values. Correct
dependent values in nested scopes remain a compiler requirement; this numerical
probe does not demonstrate a new CSS emitter or browser integration.

The Rem alternative uses `min: 0.25`, `step: 0.5`, `count: 12`. It emits
`--sp-min: 0.25rem`, `--sp-1: 0.5rem`, `--sp-12: 6rem`; the same Gap/Radius
mappings follow in rem. It assumes no fixed pixels-per-rem conversion. Width
stays at its independently authored `1px`. Other valid CSS length units remain
possible; the precise shared unit type belongs to architecture work.

## What needs a verdict?

1. Spacing's `step` / `count` names and single linear scale, with shared unit/count
   and mode-specific `min` / `step`.
2. Border width stays a scalar, with mode changes only when genuinely needed.
3. Review the representative files/output to confirm Gap/Radius's already agreed
   mappings and automatic Size following are clear.

Existing numeric rules carry forward: finite `step > 0`, `0 <= min < step`, a
positive integer count, valid ordered references, and finite nonnegative width.
The example does not require new helpers, a second scale catalogue, or a base token.

After approval, move to the Time/Easing confirmation mock. Public types, compiler
resolution, migrations from `base`/`range` and repeated old modes, complete CSS
length-unit validation, and nested-scope output checks belong to the later runbook.

## Verification boundary

The local types check fields and registered Axis/Mode names. Numeric reference
bounds and resolved ordering use the current core validator. The probe explicitly
resolves these fixtures, adapts `step`/`count` to current `base`/`range` inputs, and
uses the existing four generators. It checks all main outputs, rem propagation,
genuine mapping/width changes, and invalid reference/numeric examples. Existing
unit validation only checks unit spelling; it does not yet prove that every
accepted string denotes an appropriate CSS length. No generic-Axis compiler or
new production API is implemented.

```sh
pnpm exec tsc -p docs/blueprints/spacing-borders/tsconfig.json
node docs/blueprints/spacing-borders/verify.mjs
```
