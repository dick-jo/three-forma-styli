# Separate-file authoring mock

Status, 2026-09-16: **ordinary separate-file direction endorsed; typing surface remains illustrative**.
The founder likes the central `axes.ts` registry and this catalogue organization.
Update, 2026-09-24: application-owned attribute selection, shared defaults,
one controlling axis per authored value, and whole Shadow-position list
replacement are ratified. Combined-mode override syntax is outside this overhaul.
The review types are incomplete evidence; they do not enforce all those rules.
See the
[remaining review](../authoring-options.md#remaining-review-after-the-separate-file-mock).
This exercises the preferred named-mode catalogue across separate source files.
It is milestone-1 authoring evidence. The types in `support/` are review-only
declarations, not new public TFS exports or an implementation of the new compiler.
The [Founder Board](../../../founder-board.md) governs ratified contracts.

## Read the authored files first

| File                                                          | What to look at                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [axes.ts](./axes.ts)                                          | Theme and Size declared once; no imports of project domains                          |
| [color.ts](./color.ts)                                        | Shared accent, then two readable palettes; mode keys checked against the Axis source |
| [alpha.ts](./alpha.ts)                                        | The accepted named scale and six active positions                                    |
| [shadow.ts](./shadow.ts)                                      | References to those Color/Alpha definitions; a genuine optional Size calibration     |
| [spacing.ts](./spacing.ts)                                    | Named calibrations under Size with shared unit/count                                 |
| [border-radius.ts](./border-radius.ts) and [gap.ts](./gap.ts) | Short reference mappings; no mode repetition or evaluated Spacing imports            |
| [system.ts](./system.ts)                                      | Imports and combines the definitions once                                            |

Every file starts its main declaration immediately after imports. The typing
machinery stays in [support/authoring.d.ts](./support/authoring.d.ts). Read the
catalogues before that file; it is evidence for the editor experience, not
additional authoring work to ask of each project.

This is a focused example. The fuller accepted [Shadow mock](../../shadow/README.md)
still covers inset, text treatments, and inline Color expansion. Color Groups,
luminance policy, runtime palettes, typography, and cross-axis conflicts remain
part of their queued workshops. `regular`, the sample measurements, and the
public type names are not newly ratified by this mock.

## The small amount of TypeScript around the data

Shadow's header imports only types:

```ts
import type { axes } from './axes.js';
import type { colors } from './color.js';
import type { alpha } from './alpha.js';
import type { ShadowDraft } from './support/authoring.js';
```

Its ordinary `export const shadows = { ... }` catalogue follows. The final line
asks the editor to check those particular source definitions:

```ts
} as const satisfies ShadowDraft<typeof axes, typeof colors, typeof alpha>;
```

In plain terms: keep the exact names in this data, and check it against our
authored axes, palette, and Alpha scale. An author edits the catalogue; this
checking line does not need changing when a Color is added or a mode is renamed.
`satisfies` checks compatibility while preserving the expression's inferred type.
[TypeScript documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator).

The project does not duplicate a `ColorIdentity = 'bg' | 'pri' | ...` list.
The supporting type collects names from both shared Color data and the named
palettes. It also derives mode names from the Axis registry and Alpha choices
from the selected authored Alpha scale, with the ratified compiler-owned `non`.

## Editor behavior actually checked

The review uses the installed TypeScript language service to request completions,
including at real `color` and `alpha` fields in `shadow.ts`.
[Language Service API](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API).

| Editing                | Suggestions in this example                     |
| ---------------------- | ----------------------------------------------- |
| Axis name              | `theme`, `size`                                 |
| Size mode              | `regular`, `s`, `l`                             |
| Theme mode             | `light`, `dark`                                 |
| Shadow Color reference | `pri`, `bg`, `ev`, `ink`, `neu`, `shd`          |
| Shadow Alpha reference | `non`, `min`, `lo-x`, `lo`, `hi`, `hi-x`, `max` |

The checks also simulate source edits in memory:

- Adding a shared `duo` swatch adds `duo` to Shadow's Color suggestions.
- Renaming shared `pri` to `accent` removes `pri` and adds `accent`.
- Adding `display` to the Size registry adds it to the Size mode suggestions.

Those changes do not touch the files on disk or a second list of valid names.
Changing the allowed modes still requires valid resolved data for each selection;
autocomplete alone does not establish that completeness.

[checks/invalid-names.ts](./checks/invalid-names.ts) contains six deliberate errors:

| Invalid authoring         | Reason                         |
| ------------------------- | ------------------------------ |
| Axis `szie`               | Not in the authored registry   |
| Size mode `small`         | The authored choice is `s`     |
| Theme mode `s`            | That name belongs to Size      |
| Color `shaddow`           | Not an authored Color identity |
| Alpha `low`               | The available position is `lo` |
| Radius position `maximum` | The required position is `max` |

The expected-error comments keep the normal typecheck green while requiring
errors at those lines. The review script additionally removes those comments in
memory and verifies that TypeScript reports all six errors. To inspect a red
underline directly, try the same typo in the domain file or remove one of those
comments, then undo it.

## Imports and value references stay distinct

The review checks the complete local type/value import graph for cycles. No domain
imports `system.ts` back again. Shadow and Radius emit no runtime imports at all
in this example. The assembled system does import the actual domain objects.

Radius's `l: 2` remains a Spacing reference. The compiler is responsible for the
selected measurement; the Radius file does not fetch one fixed mode's values.
Likewise, Shadow's `{ color: 'shd', alpha: 'lo' }` remains a reference. The fixture's
review calculation checks these expected results:

| Theme | Size    | `--bdr-l` / `--gap-l` | Shadow Color L | `--shd-max` lengths, in px |
| ----- | ------- | --------------------- | -------------- | -------------------------- |
| light | regular | `16px`                | `0.2`          | `0 3 6`, then `0 20 48 -8` |
| dark  | regular | `16px`                | `0.06`         | `0 3 6`, then `0 20 48 -8` |
| light | s       | `12px`                | `0.2`          | `0 2 4`, then `0 12 32 -6` |
| dark  | s       | `12px`                | `0.06`         | `0 2 4`, then `0 12 32 -6` |
| light | l       | `20px`                | `0.2`          | `0 3 6`, then `0 20 48 -8` |
| dark  | l       | `20px`                | `0.06`         | `0 3 6`, then `0 20 48 -8` |

Both max layers use Alpha `lo`, or 0.25. Border width remains `1px`. The review
calculation checks 81 stable names including Color alpha ramps across all six
selections. It does not call the TFS compiler or produce CSS files.

These outcomes remain required in nested scopes too. Selecting light inside a
dark/small region should change the Color references while preserving the small
measurements. Selecting regular Size inside that region should restore ordinary
measurements while retaining the surrounding Theme. These are requirements for
later compiler/browser verification, not browser behavior tested by this fixture.

## A known name can still be missing from a mode

[checks/incomplete-palette.ts](./checks/incomplete-palette.ts) intentionally defines
`shd` in light but omits it from dark. Its reference has valid spelling, so the
editor's identity check accepts it. The separate review calculation identifies:

> Color `shd` is unavailable when Theme is `dark`.

This demonstrates the distinction between recognising a name and validating
resolved data. It does not silently borrow the light value. The incomplete
palette is an isolated negative example and is not imported by `system.ts`.

## Verify the evidence

From the repository root:

```sh
pnpm exec tsc -p docs/blueprints/axes/separate-files/tsconfig.json
node docs/blueprints/axes/separate-files/checks/verify.mjs
```

Both pass. [verify.mjs](./checks/verify.mjs) checks actual TypeScript suggestions,
diagnostics, source-edit propagation, and import relationships. Its final part
is a bounded calculation of this fixture's two axes and named references. It
constructs plain OKLCH review data and checks expected measurements and coverage;
it is not a general resolver or library implementation.

Limits remain explicit: these review types are not a complete validator for
units, numeric constraints, default selections, mode coverage, changed range
identities, or cross-axis collisions. Nested CSS behavior, generated consumer
contracts, runtime themes, and public type/helper design remain later work.
No production package, theme, compiler, or consumer source has changed.
