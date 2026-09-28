# Typography — weights and styles

Status, 2026-09-28: **proposal for founder review**. Milestone 1 only. Nothing here
is implemented; output below is hand-derived expected output, not generator output.

```text
fonts.ts         Two authored font identities (sans: Inter, mono: JetBrains Mono)
typography.ts    Four roles covering the weight/style cases
mistakes.ts      Authoring and consumer mistakes TypeScript rejects
review-types.ts  Review-only shapes; not public APIs
```

## Proposal

1. `styles` is a list: `['normal', 'italic']`. Omitted means `['normal']`.
   Every listed style comes in every weight the role offers. Replaces
   `styles: { italic: { weights: [...] } }`, which Scatter fills identically
   for every role.
2. A one-number `weights` role emits its number directly. No invented
   `font-weight-base` name, no selectable weight.
3. Style and weight choices become independent classes:
   `.text--body-style-italic` and `.text--body-weight-hi`, instead of one class
   per combination (`.text--body-style-italic-weight-hi`). Choosing italic keeps
   the size's weight; choosing a weight keeps the style.

Unchanged ratified grammar: one-number or `min / lo / hi / max` weights with real
endpoints; `weight` names the role default; a size may set its own `weight`;
resolution order role → size → variant → explicit choice.

## The four cases

| Role      | `weights`               | Default | Size overrides    | Styles         |
| --------- | ----------------------- | ------- | ----------------- | -------------- |
| `prose`   | `400`                   | —       | —                 | normal         |
| `code`    | `400`                   | —       | —                 | normal, italic |
| `body`    | `300 / 400 / 500 / 700` | `lo`    | `l`, `max` → `hi` | normal, italic |
| `heading` | `600 / 800` (sparse)    | `min`   | `max` → `max`     | normal         |

## Expected tokens (ordinary values)

```css
/* prose — one weight, normal only */
--text-prose-font-family: Inter, …fallbacks;
--text-prose-font-style-normal: normal;
--text-prose-font-style: var(--text-prose-font-style-normal);
--text-prose-font-size: var(--fs-3);
--text-prose-font-weight: 400; /* today: var(--text-prose-font-weight-base) */
/* …min, s, l, max the same pattern; no --text-prose-font-weight-base */

/* code — one weight, two styles */
--text-code-font-style-normal: normal;
--text-code-font-style-italic: italic;
--text-code-font-weight: 400;

/* body — range; size defaults differ */
--text-body-font-weight-min: 300;
--text-body-font-weight-lo: 400;
--text-body-font-weight-hi: 500;
--text-body-font-weight-max: 700;
--text-body-font-weight: var(--text-body-font-weight-lo);
--text-body-l-font-weight: var(--text-body-font-weight-hi);
--text-body-max-font-weight: var(--text-body-font-weight-hi);
--text-body-font-style-normal: normal;
--text-body-font-style-italic: italic;

/* heading — sparse range */
--text-heading-font-weight-min: 600;
--text-heading-font-weight-max: 800;
--text-heading-font-weight: var(--text-heading-font-weight-min);
--text-heading-l-font-weight: var(--text-heading-font-weight-min);
--text-heading-max-font-weight: var(--text-heading-font-weight-max);
```

## Expected classes

| Role      | Size classes                     | Style classes           | Weight classes          |
| --------- | -------------------------------- | ----------------------- | ----------------------- |
| `prose`   | `text--prose`, `-min/-s/-l/-max` | `-style-normal`         | none                    |
| `code`    | `text--code`, `-min/-s`          | `-style-normal/-italic` | none                    |
| `body`    | `text--body`, `-l/-max`          | `-style-normal/-italic` | `-weight-min/lo/hi/max` |
| `heading` | `text--heading`, `-l/-max`       | `-style-normal`         | `-weight-min/max`       |

`body` today: 8 combination classes. Proposed: 2 style + 4 weight classes.

## Consumer usage

```html
<p class="text--prose">Ordinary prose, 400</p>
<code class="text--code text--code-style-italic">Italic code, 400</code>
<p class="text--body-l">Large body, 500 by its size default</p>
<p class="text--body-l text--body-style-italic">Same, italic, still 500</p>
<p class="text--body-l text--body-weight-max">Large body, 700</p>
<h2 class="text--heading-max">Largest heading, 800</h2>
```

```ts
{ role: 'code', fontStyle: 'italic' }        // today: must also name a weight
{ role: 'body', size: 'l', weight: 'max' }
{ role: 'heading', weight: 'max' }
```

## Where each mistake is caught

TypeScript while editing (`mistakes.ts`, verified with `tsc`):

- `weight: 'lo'` on a one-number role
- default `weight: 'hi'` when heading offers only `min / max`
- `styles: ['oblique']`
- consumer `{ role: 'prose', fontStyle: 'italic' }`, `{ role: 'code', weight: 'max' }`,
  `{ role: 'heading', weight: 'lo' }`

The running session on save, against the actual files (illustrative wording):

```text
✗ code: offers italic, but font "mono" has no italic face.      (italic file removed)
✗ code: weight 900 is outside JetBrains Mono's 100–800 (normal, italic).  (weights: 900)
```

The mock's TypeScript messages are mock-grade (`… not assignable to type 'never'`).
Readable editor errors belong to the implementation.

## Scatter migration

- Four `styles: { normal: { weights: [...] }, italic: { weights: [...] } }`
  → `styles: ['normal', 'italic']`.
- Two CSS `composes: code-s code-style-normal-weight-max` sites
  → `composes: code-s code-weight-max`.
- TS selections such as `{ role: 'label', fontStyle: 'italic', weight: 'lo' }` stay valid.

```sh
pnpm exec tsc -p docs/blueprints/typography/weights-styles/tsconfig.json
```
