# TFS Founder Board

The current product decisions for Three Forma Styli (TFS). Decisions only; the
reasoning and history live in git (tag `pre-v05-cleanup` holds the long-form record).
Change this file when the founder rules; do not append history.

## What TFS is

A designer's opinionated shorthand. Author deliberate values once, derive the
repetitive scales, keep stray colours and measurements out of the product, and emit
framework-neutral CSS and exact TypeScript types. Small, complete and dependable
beats general-purpose. Readable authoring files are the primary product.

- Consistency across domains is a requirement. Reuse the same shapes and names;
  differences need a real design reason.
- TFS does not know application components (Button, Text). Apps own components,
  HTML semantics and which mode is active.
- Invalid or ambiguous input fails; nothing is silently repaired.
- Rebuilding must not change how an existing design looks: real values are ported
  as-is. Example numbers in tests and docs are illustrative.

## Vocabulary

| Term       | Meaning                                                  |
| ---------- | -------------------------------------------------------- |
| Family     | A design concern, one authoring file (color, typography) |
| Domain     | One kind of decision in a family (alpha, gap, font size) |
| Identity   | An authored name (`pri`, `label`)                        |
| Reference  | One domain using another's identity (gap → spacing)      |
| Scale      | Ordered values available together (`--sp-*`, `--fs-*`)   |
| Range      | Ordered choices owned by one identity (a role's sizes)   |
| Position   | A place in a scale or range (`min`, `lo`, `3`)           |
| Group      | A named selection of identities                          |
| Axis       | An independently switchable condition (theme, size)      |
| Mode       | One choice on an axis (dark, light, s)                   |
| Constraint | An optional authored rule checked as values change       |

Standard themes use the identity vocabulary `neu / pri / duo / tri / tet / pen`
(neutral, then first to fifth accent) where those identities apply. Custom
identities are always allowed. No preset or alias registry.

### Position patterns

| Positions                           | Used by                    | Completeness                                      |
| ----------------------------------- | -------------------------- | ------------------------------------------------- |
| `min / 1 / 2 / … / n`               | Spacing, Font size         | generated from inputs                             |
| `min / s / l / max`                 | Gap, Radius                | all four                                          |
| `min / lo / hi / max`               | Time, Shadow; role weights | all four; weights: endpoints, middles optional    |
| `min / lo-x / lo / hi / hi-x / max` | Alpha                      | all six, plus fixed `non: 0`                      |
| `min / s / base / l / max`          | Role sizes                 | `base` required; `s` needs `min`, `l` needs `max` |

Only role sizes have a `base` (emitted unsuffixed). Each pattern is defined once
in code and reused by types, checks, output and Workbench.

## Authoring conventions

- One file per family, one `defineX({...})` call per domain:
  `axes.ts`, `color.ts` (alpha + colours), `spacing.ts` (spacing + gap),
  `border.ts` (radius + width), `shadow.ts`, `motion.ts` (time + easing),
  `typography.ts` (font size + fonts + roles), `tfs.config.ts` (assembly).
- `defineX()` helpers check names inside the file and against other files
  (colours, fonts, axes, modes) while typing.
- **Unnamed ordinary scale.** Where a domain can have several scales, the ordinary
  one sits unnamed at the top level and gets short token names; named extras go in
  `scales` / `ranges` and include their name. No `defaultScale` / `defaultRange`.
- **No hidden fallbacks.** A property lives in one place: on the owner (same for
  everything) or on each entry (stated every time).
- Helpers may remove repetition but return plain data; resolved values stay
  inspectable.

## Axes and modes

- `axes.ts` registers each axis, its modes and its HTML attribute
  (e.g. `data-theme-mode`, `data-size-mode`).
- Top-level values are the complete ordinary set. `modes: { axis: { mode: {...} } }`
  supplies only changes. A mode cannot add identities or change what exists
  (counts, names, weights on offer), only values.
- The app sets the attribute. With nothing set, ordinary values apply. Selecting a
  mode with no changes restores ordinary values, even inside another mode.
  Unmarked descendants inherit.
- Each complete value is controlled by at most one axis. No combined-mode syntax.
- References follow upstream changes automatically (Shadow follows Color, Gap
  follows Spacing, roles follow Font size). Correct CSS in nested scopes is TFS's job.
- Whole Color swatches and whole Shadow layer lists are replaced, never merged.

## Domains

### Alpha (`color.ts`)

```ts
defineAlpha({
  values: { min, 'lo-x', lo, hi, 'hi-x', max },    // → --a-min … --a-max
  scales: { pri: { values: {...} } },              // → --a-pri-*
})
```

Six values strictly increase, `max < 1`; `--a-non: 0` is fixed.
`deriveAlphaScale({ distribution: 'linear', ... })` is optional sugar.

### Color (`color.ts`)

```ts
defineColors({
  tokens: { bg: oklch(...), pri: oklch(...), ... },   // → --clr-pri, --clr-pri-a-lo …
  polarity: 'negative',
  groups: { accents: { identities: ['pri', 'duo'] }, net: { match: { prefix: 'net-' } } },
  constraints: { luminance: { minimumLuminanceDelta, backgroundColors, foregroundColors } },
  modes: { theme: { light: { tokens: {...}, polarity: 'positive' } } },
})
```

- Every colour gets an alpha ramp from the ordinary Alpha scale.
- `polarity` is optional: negative = lighter foregrounds, positive = darker.
- Groups resolve at build time to exact literal lists and exact TypeScript types,
  including prefix groups. They add no CSS. Groups exist for Color only until
  another domain has a real need.
- The luminance constraint measures OKLCH L separation (not WCAG contrast). It gives
  feedback while authoring; it does not block edits or correct colours.

### Runtime colour themes (`three-forma-styli/runtime`)

- Configured at `project.runtime.colorThemes`; for customer palettes at runtime.
- Exact input validation; each customer palette supplies its own polarity.
- No rule configured → `luminance: null`. Enforcing without a rule is a
  configuration error. No ignored `enforce` metadata.
- Payload meaning is preserved: schema version 2, `colorIdentities`, literal
  `non: 0`, native OKLCH output. The existing `native-color-modes` output is
  reviewed in runbook step 7 (Scatter imports it).

### Spacing and Gap (`spacing.ts`)

```ts
defineSpacing({ unit: 'px', min: 4, step: 8, count: 12, modes: {...} })   // --sp-min, --sp-n = step × n
defineGap({ min: 'min', s: 1, l: 3, max: 6 })                            // --gap-*
```

- Finite `step > 0`, `0 <= min < step`, positive integer `count`. Unit and count
  shared across modes; modes change `min` / `step`.
- Gap positions reference Spacing (`'min'` or an existing number), strictly
  increasing, and follow Spacing through modes.
- No `--sp-max`, unsuffixed `--sp`, or `--gap`.

### Border (`border.ts`)

```ts
defineBorder({ radius: { min: 'min', s: 1, l: 2, max: 3 }, width: { unit: 'px', value: 1 } });
```

Radius references Spacing like Gap (`--bdr-*`). Width is one non-negative scalar
(`--bdw`), zero allowed.

### Shadow (`shadow.ts`)

```ts
defineShadows({
  unit: 'px',
  min: [...], lo: [...], hi: [...], max: [...],        // → --shd-min … --shd-max
  ranges: { inset: {...}, ...shadowsForColors({ prefix: 'glow', colors, range }) },
})
```

- Each position is a non-empty layer list: `x, y, blur, color: { color, alpha? }`,
  optional `spread`, `inset`. Blur >= 0; offsets and spread may be negative.
- Named ranges emit `--shd-{name}-*`. A project may have only named ranges.
- `shadowsForColors` copies one design per Color (`glow-pri`, `glow-duo`).
- The app chooses `box-shadow` vs `text-shadow`. No classes, no none-token.

### Time and Easing (`motion.ts`)

```ts
defineTime({ unit: 'ms', values: { min, lo, hi, max }, scales: { anim: {...} } })  // --t-*, --t-anim-*
defineEasings({ neu: cubicBezier(...), duo: linear(), tri: linear([[0,0], ...]) })  // --ease-*
```

- Time: four strictly increasing values per scale, `ms` or `s`. Any Time token
  serves duration or delay.
- Easing: cubic Bézier and Linear points only, plain data. No Steps, no bounce
  type, no easing dependency.
  `cubicBezier(x1, y1, x2, y2)` → `{ type: 'cubicBezier', value: [x1, y1, x2, y2] }`.
  `linear(points)` → `{ type: 'linear', value: [[input, output], ...] }`; inputs
  ordered, equal inputs allowed (jumps), outputs may overshoot; `linear()` is the
  constant-speed identity. CSS strings are output only.
- Motion composites are deferred (not in this overhaul).

### Typography (`typography.ts`)

**Font size**

```ts
defineFontSize({ unit: 'rem', min: 0.625, start: 0.75, step: 0.125, count: 12, modes: {...} })
```

`--fs-n = start + step × (n − 1)`; finite, `0 < min < start`, `step > 0`,
positive integer count. `count` shared; modes change `min`, `start`, `step`, `unit`.

**Fonts** — two kinds, told apart by `files`:

```ts
defineFonts({
	mono: { files: ['./JetBrainsMono.ttf', './JetBrainsMono-Italic.ttf'], category: 'mono' },
	system: { name: 'system-ui', fallbacks: ['sans-serif'] },
});
```

- With `files`: TFS reads family/styles/weights, checks roles against them, copies
  `.woff2/.woff` or converts `.ttf/.otf` to WOFF2 (FontTools), emits `@font-face`
  and size-matched fallback faces. Optional `name` overrides the CSS family,
  optional `display`.
- Name only: TFS writes the family name; the OS, app or a font service loads it;
  nothing is checked.
- Font licensing is outside TFS: no licence fields, attestations or permission gates.

**Roles**

```ts
label: {
  font: 'mono',
  textTransform: 'uppercase',                          // role-wide
  weights: { min: 400, lo: 500, hi: 600, max: 700 },   // or one number: weights: 400
  styles: ['normal', 'italic'],                         // omitted → normal
  sizes: {
    s:    { fontSize: 1, weight: 'lo', lineHeight: 1.25, letterSpacing: 0.015 },
    base: { fontSize: 2, weight: 'lo', lineHeight: 1.2,  letterSpacing: 0.01 },
  },
  modes: { size: { s: { sizes: { base: { lineHeight: 1.1 } } } } },
}
```

- Role-wide: `font`, `textTransform`, `styles`, `weights`. Per size, stated every
  time: `fontSize` (a Font size position), `weight`, `lineHeight` (unitless),
  `letterSpacing` (em).
- Weights: one number (role-wide, emitted as that number) or increasing
  `min / lo / hi / max` with real endpoints; omitted middles are not offered.
- Every listed style is offered in every role weight, checked against font files.
- Role modes change size values only; never font, weights, styles or sizes.
- No variants. A recurring named look is another role (`label-loud`).
- Resolution: size → explicit style/weight choice.

## Outputs

**CSS**

- `tokens.css`: all variables, `:root` plus one block per mode, with references
  re-bound inside mode blocks.
- Per role size: granular tokens (`--text-label-s-font-size`, …,
  `--text-label-font-weight-max`) plus a whole-row `font` token
  (`--text-label-s`). Letter-spacing and text-transform stay separate.
- **Classes only where one variable cannot do the job in one line.** That is
  typography only: `text--label-s` (size row), `text--label-style-italic`,
  `text--label-weight-max`, global and CSS Modules. No other classes.
- `@font-face` and fallback faces for file fonts.
- Token names must not collide; the build rejects collisions.

**TypeScript** (generated, dependency-free ESM + `.d.ts`)

- `./tokens`: identity names per domain, exact group types
  (`ColorGroup<'accents'>`), and `var()` helpers.
- `./typography`: typed selection → class names
  (`{ role: 'label', size: 's', weight: 'max', fontStyle: 'italic' }`).
- No full resolved-value dump for apps; detailed data is for Workbench only.
- Public colour types are structural (no Culori types required by consumers).

**Figma** — capstone, built last.

- The author chooses which modes carry through (plan limit: 4 modes per collection).
- Unsupported values (e.g. easing) are left out and listed.
- **Shadows and text styles are Figma styles, not variables.** Variables cover
  colours, numbers and strings only.

## Workflow

Where the design system lives is the consumer's choice. TFS writes one output
folder (`generated/`) and never edits the host `package.json`. Both setups are
first-class: **its own package** (several apps share one system; the author writes
the `exports` block once) and **a folder inside one app** (imported by path).
`generated/` is committed to git: apps build without running TFS or FontTools,
design changes are visible in review, and `tfs check` catches forgotten rebuilds.

1. Author the family files and `tfs.config.ts`.
2. Run `tfs dev` once. It opens Workbench and watches files and fonts.
3. On save: TypeScript has already checked names and shapes; TFS checks numbers
   and font files, updates Workbench, and writes output. An invalid edit reports
   errors and keeps the last valid output.
4. Adding font files shows their styles and weights before roles are finished.
5. `tfs build` repeats every check for final output; `tfs check` fails CI when
   committed output is stale. `tfs fonts inspect <files>` works standalone.
6. Apps consume generated CSS/TS only. FontTools runs during TFS generation,
   never during an app's own typecheck or build.

## Architecture

```text
tfs/            the one npm package: three-forma-styli
  src/define/   defineX() helpers and authoring types, one file per family
  src/resolve/  checks and mode resolution, one file per family
  src/emit/     CSS, ./tokens, ./typography, Workbench data
  src/fonts/    inspection, conversion, fallback metrics
  src/color/    OKLCH, luminance, runtime colour themes
  src/session/  tfs dev, build, check
  src/runtime/  three-forma-styli/runtime (small, no dependencies)
  themes/standard/
  tests/        including the everything-project fixture
workbench/      UI; reads the data file TFS writes, nothing else
figma-plugin/   capstone; reads TFS's Figma output, nothing else
```

- Entry points: `three-forma-styli` (authoring), `three-forma-styli/runtime`
  (apps), `tfs` CLI.
- The standard theme is the readable example. The everything-project is a test.
- Workbench stays largely as-is; no product-design pass in this overhaul.
