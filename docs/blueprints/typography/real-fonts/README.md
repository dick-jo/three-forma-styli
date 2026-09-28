# Real fonts: authoring, inspection and building

Status, 2026-09-28: **revised blueprint, awaiting workflow review**. Licensing is
outside TFS's scope by founder ruling. The mock has no licensing declarations or
permission steps. Existing production machinery still needs removal in the later
implementation milestone; this is not a claim that the revised input builds today.

## Where `fonts.ts` comes from

**You write it**, just like `color.ts` or `spacing.ts`. TFS does not generate it.
It points to files you have already placed in your design-system project:

```text
my-design-system/
  jetbrains-mono/
    JetBrainsMono[wght].ttf
    JetBrainsMono-Italic[wght].ttf
  fonts.ts          ← authored: source paths and preparation choices
  typography.ts     ← authored: roles, weights, sizes and styles
  font-size.ts      ← authored: the atomic size scale
  axes.ts           ← authored: the shared axes
  tfs.config.ts     ← authored: imports these declarations and configures output
  generated/        ← written by an explicit build
```

The directory name is illustrative. Source paths resolve relative to the project
configuration directory, not the location of an imported `fonts.ts` file.
Nothing reads the fonts merely because you type a path into TypeScript.

## The complete authoring loop

### 1. Put the font files in the project

Supply the normal and italic files you intend to use. TFS does not download fonts.
Existing preparation can convert TTF/OTF to WOFF2, or copy web-ready WOFF/WOFF2.

### 2. Inspect them if you need to learn what they offer

From the project directory, this existing command reads the actual binaries:

```sh
tfs fonts inspect \
  './jetbrains-mono/JetBrainsMono[wght].ttf' \
  './jetbrains-mono/JetBrainsMono-Italic[wght].ttf'
```

Relevant lines from the actual output, with source/coverage lines omitted:

```text
JetBrains Mono Regular
  family    JetBrains Mono
  face      normal, weight 100–800 (default 400)
  axes      wght 100–800

JetBrains Mono Italic
  family    JetBrains Mono
  face      italic, weight 100–800 (default 400)
  axes      wght 100–800
```

Here `default 400` is a fact stored in the variable font, not a TFS role default.
This command is optional, read-only, and works before any TFS config exists.
It does not create `fonts.ts`, prepare web assets or require copying a report
into the declarations. If you already know your fonts, begin with step 3.

### 3. Write the font declaration and role choices

[fonts.ts](./fonts.ts) supplies one identity and the paths:

```ts
export const fonts = {
	mono: {
		sources: [
			'./jetbrains-mono/JetBrainsMono[wght].ttf',
			'./jetbrains-mono/JetBrainsMono-Italic[wght].ttf',
		],
		category: 'mono',
	},
};
```

The key `mono` is your reference name. `category: 'mono'` chooses the existing
monospace fallback treatment; it does not discover or select the primary font.
The files supply its family name, physical styles and available weights.
An explicit CSS family-name override remains possible.

[typography.ts](./typography.ts) then offers a deliberate selection:

```ts
code: {
	font: 'mono',
	weights: { min: 400, max: 700 },
	weight: 'min',
	sizes: {
		base: { fontSize: 3, lineHeight: 1.5, letterSpacing: 0 },
	},
	styles: {
		normal: { weights: ['min', 'max'] },
		italic: { weights: ['min', 'max'] },
	},
}
```

The physical files offer **100–800**. This role offers **400 and 700**. You do
not repeat the physical range in `fonts.ts`: that would create a second claim
which could disagree with the file, especially after replacing it.

### 4. Run the project build

The recommended workflow uses the existing command:

```sh
tfs build .
```

That is the point at which TFS executes the authored project configuration,
reads the referenced files, obtains their family/style/range facts, and checks
role selections against those facts. It prepares web assets, calculates
supported adjusted fallbacks, and emits the configured CSS, TypeScript and
inspection evidence. Failed validation must not publish replacement output.

No separate preparation command, generated-file import or manual Fontpie
percentage transfer is required in the golden flow. FontTools remains a build
tool prerequisite where conversion/decompression requires it.

**Blueprint boundary:** [project.ts](./project.ts) shows the connection between
the files; it is an assembly excerpt for the future `tfs.config.ts`, not a
runnable current CLI configuration. The accepted Axis changes, new Font-size
proposal and removal of production licensing gates still need implementation.
The final output configuration belongs to the assembled-system review. Existing
project builds already connect font preparation and role validation internally.

### 5. Edit and rebuild

After changing a role or replacing a source file, rerun `tfs build .`. The next
build reads the current files and validates the current choices. A previous
inspection result does not authorize or supply the next build's capabilities.
The consuming application uses generated output; its ordinary typecheck does
not run font preparation.

## What catches an invalid weight?

| Stage                      | What it knows                                   | Result for `max: 900` with these files                                    |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| TypeScript while authoring | Declaration shape and available font identities | A number is allowed; it cannot infer a binary's range from a path string. |
| Optional `fonts inspect`   | Physical facts from the supplied files          | Displays 100–800; does not inspect role declarations.                     |
| Project build              | Both the current files and authored roles       | Rejects 900 before publishing output.                                     |

The existing validator's actual diagnostic is:

```text
Typography role "code" style "normal" weight "max" (900) is unavailable in font "mono"; available normal weights: 100-800
```

The review probe checks 400/700 in both styles and this failure using inspected
facts, not a manually declared 100–800 capability. A static face would supply
its individual weight, not an invented continuous range. No automatic editor
inspection, generated capability types, or background watcher is claimed here.

## Verification and previous preparation evidence

The current bounded probe uses existing source inspection, capability conversion
and role validation. It does not call the production preparation path or bypass
its obsolete permission gates. It writes no font files and needs only the two
TTFs, supplied read-only from Scatter in the recorded run:

```sh
pnpm exec tsc -p docs/blueprints/typography/real-fonts/tsconfig.json
node docs/blueprints/typography/real-fonts/verify.mjs \
  --source-root /Users/dickjones/project-local/scatter/packages/design-system/fonts/source
```

[inspection-results.json](./inspection-results.json) records source hashes,
measured capabilities and the validation result. `--write` refreshes that review
snapshot. The internal adapter connects inspected facts to the current core;
it is probe infrastructure, not another authoring step or proposed public API.

[Earlier CSS](./prior-preparation/fonts.css) and
[earlier results](./prior-preparation/results.json) preserve the preceding run's
conversion, four exact-weight fallback calculations, byte-preserving WOFF2 copy
and Chromium loading evidence. They are historical evidence, not output from
the revised input. The former executable probe is recoverable at commit
`7fd55ba`; the current probe deliberately has the narrower scope above.

Fallback calibration still covers bounded Latin sans/mono normal/italic cases.
It does not guarantee local fallback availability or identical wrapping on every
platform. The separate [system-font example](../fonts.ts) remains available when
no source files are supplied, with physical verification explicitly unavailable.

## Still to review

Review this authoring/build loop first. Then finish the atomic `start/step/count`
decision and wider role cases: scalar weights with additional styles,
size-specific weights, variants, mode changes, and CSS/TypeScript consumption.
The numbers in these mocks remain illustrative design choices.
