# Real fonts: authoring, inspection and building

Status, 2026-09-28: **ongoing authoring-session direction accepted**. Licensing is
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
  generated/        ← valid session updates and final build output
```

The directory name is illustrative. Source paths resolve relative to the project
configuration directory, not the location of an imported `fonts.ts` file.
TypeScript itself does not read font binaries. The running TFS session does so
when you save their source paths; its implementation remains later work.

## The complete authoring loop

### 1. Put the font files in the project

Supply the normal and italic files you intend to use. TFS does not download fonts.
Existing preparation can convert TTF/OTF to WOFF2, or copy web-ready WOFF/WOFF2.

### 2. Start one continuing authoring session

Start TFS once and leave it running while editing. The intended session opens
the Workbench, observes your declarations and source files, and automatically
checks saved changes. The exact command is an architecture decision, not a new
CLI name ratified by this mock.

When you supply the source paths in step 3, the session displays font capabilities
before your roles are complete. A valid whole design system is not a prerequisite
for learning what the files offer. This automatic experience is not implemented
by the current probe.

Standalone inspection is also available today without any configuration. From
the project directory, this existing command reads the actual binaries:

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
into the declarations. It is not an extra required step in the ongoing session.

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

### 4. Save, review and continue editing

On save, the running session reads the changed declarations/files and checks
role selections against the inspected facts. Valid changes update the preview
and generated CSS/TypeScript used by the application. Invalid changes report
the problem and retain the last valid output. Changing a font file triggers
fresh inspection; an earlier report is not the authority for a replacement file.

Preparation and supported adjusted-fallback calculation belong inside this
workflow. Authors should not manually run a build to discover each mistake.

No separate preparation command, generated-file import or manual Fontpie
percentage transfer is required in the golden flow. FontTools remains a build
tool prerequisite where conversion/decompression requires it.

**Blueprint boundary:** [project.ts](./project.ts) shows the connection between
the files; it is an assembly excerpt for the future `tfs.config.ts`, not a
runnable current CLI configuration. The accepted Axis changes, new Font-size
proposal and removal of production licensing gates still need implementation.
The final output configuration belongs to the assembled-system review. Existing
project builds already connect font preparation and role validation internally.

### 5. Produce the finished output

The explicit build repeats the checks and generates the final artifacts:

```sh
tfs build .
```

This also works without an interactive authoring session, including in automation.
The consuming application uses generated output; its ordinary typecheck does not
run font preparation. Existing project builds perform file-based validation;
the accepted continuous feedback experience still requires implementation.

## What catches an invalid weight?

| Stage                                          | What it knows                                         | Result for `max: 900` with these files                                    |
| ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| TypeScript while authoring                     | Declaration shape and available font identities       | A number is allowed; it cannot infer a binary's range from a path string. |
| Optional `fonts inspect`                       | Physical facts from the supplied files                | Displays 100–800; does not inspect role declarations.                     |
| Running authoring session (accepted direction) | Current files and authored roles, updated after saves | Reports 900 automatically and retains the last valid output.              |
| Explicit final build                           | Both the current files and authored roles             | Rejects 900 before publishing output.                                     |

The existing validator's actual diagnostic is:

```text
Typography role "code" style "normal" weight "max" (900) is unavailable in font "mono"; available normal weights: 100-800
```

The review probe checks 400/700 in both styles and this failure using inspected
facts, not a manually declared 100–800 capability. A static face would supply
its individual weight, not an invented continuous range. The accepted session
does not imply TypeScript numeric-range inference or generated capability types.
The probe proves inspection/validation only, not the continuing session.

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

The authoring-session direction is accepted. Next finish the atomic
`start/step/count` decision and wider role cases: scalar weights with additional styles,
size-specific weights, variants, mode changes, and CSS/TypeScript consumption.
The numbers in these mocks remain illustrative design choices.
