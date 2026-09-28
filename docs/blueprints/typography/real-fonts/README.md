# Real-font authoring mock

Status, 2026-09-28: **ready for founder review**. Milestone 1 only.
This example uses actual JetBrains Mono 2.304 normal/italic files from Scatter as
read-only inputs. It executes existing preparation and typography functions in
a temporary directory. It changes neither package source nor Scatter artifacts.

## Read these files in order

```text
fonts.ts               The files you supply; one authored identity, mono
typography.ts          The code role, selecting mono and its intended treatments
project.ts             The two declarations connected at the project boundary
expected-fonts.css     Prepared primary faces and calculated fallback CSS
expected-results.json  Measured values, source/output hashes and check results
```

[fonts.ts](./fonts.ts) is the full input declaration. There is no `family`,
`verification`, list of capabilities, fallback percentage, or preparation helper
to author. The existing preparation policy uses TTF/OTF conversion and web-ready
WOFF/WOFF2 copying by default. This example also keeps the existing `swap` display
default. Optional explicit choices remain possible; omission is intentional.

The license block is existing compiler input, shown in full so its verbosity is
visible for review. Retaining every current field is not automatically ratified
by demonstrating the workflow. Its exact ergonomics can enter architecture/hygiene
triage; this mock introduces no new licensing policy or approval step.

The two occurrences of `mono` have distinct jobs:

- the object key is the author's identity, referenced by roles;
- `category: 'mono'` chooses the current generic/adjusted fallback policy.

Renaming the key would not change the physical font or its category. No extra
font alias catalogue or generated-file import is required.

[typography.ts](./typography.ts) is a small, complete role:

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

The file can physically supply weights 100–800. The design system deliberately
offers 400 and 700 in normal and italic. File inspection discovers what is
possible; the role declares what should be used. This is the ratified sparse
weight-range grammar, with the role's actual offered endpoints. A role with one
weight can use the earlier scalar example; ranges are not compulsory.

`base` alone is a valid size range. `fontSize: 3` uses the preceding mock's
ordinary `--fs-3: 1rem`; line height is 1.5 and tracking is zero. Numerical
calibration and the proposed atomic `start/step/count` inputs remain separate
review matters. This font example does not implicitly ratify them.

[project.ts](./project.ts) shows the blueprint wiring. It is an assembly excerpt,
not a current CLI config: the new Font-size/Axis shape still needs the later
implementation. The probe explicitly adapts the ordinary scale to today's
`base/increment/range` fields. The existing project compiler already supplies
prepared facts to roles internally; importing a generated manifest is not an
authoring requirement. Final output configuration remains for the assembled review.

## What preparation actually produced

| Input or choice                   | Observed result                         |
| --------------------------------- | --------------------------------------- |
| Font identity                     | `mono`                                  |
| Family, discovered from the files | `JetBrains Mono`                        |
| `JetBrainsMono[wght].ttf`         | Normal WOFF2 face, weight range 100–800 |
| `JetBrainsMono-Italic[wght].ttf`  | Italic WOFF2 face, weight range 100–800 |
| Requested role treatments         | Normal 400/700, italic 400/700          |
| Fallback measurements             | Four exact primary-font instances       |
| Invalid role weight 900           | Rejected, with available range 100–800  |

Generated primary declarations retain the variable range. They do not make
separate primary font files for each role weight. The source filename's brackets
are URL-encoded automatically in CSS.

The resulting role-family token is:

```css
--text-code-font-family: 'JetBrains Mono', '__tfs-mono-adjusted-fallback', ui-monospace, monospace;
```

The private fallback family is generated output, not another identity the author
maintains. This is one of its four emitted faces:

```css
@font-face {
	font-family: '__tfs-mono-adjusted-fallback';
	src: local('Courier New');
	font-style: normal;
	font-weight: 400;
	ascent-override: 102.02%;
	descent-override: 30%;
	line-gap-override: 0%;
	size-adjust: 99.98%;
}
```

Those percentages are calculated for these files and the current pinned fallback
profile. They are not copied author input or universal defaults. The complete
[CSS](./expected-fonts.css) includes normal/italic and regular/bold local faces.

The complete current diagnostic for an authored 900 endpoint is:

```text
Typography role "code" style "normal" weight "max" (900) is unavailable in font "mono"; available normal weights: 100-800
```

## Alternatives and boundaries

- **Already web-ready files:** the probe supplies the produced WOFF2 files as
  source input on a second run. TFS copies their bytes unchanged. Fallback
  measurement may still need FontTools to inspect an exact variable instance.
- **Author-managed fallback stack:** an explicit `fallbacks` list skips automatic
  adjusted-fallback calculation in the current API; that boundary is checked.
- **System or externally managed font without file facts:** the preceding
  [system-font declaration](../fonts.ts) uses `verification: 'unavailable'` and
  a normal scalar-weight role. It requires no source preparation and makes no
  physical-capability claim. Its ergonomics remain visible for review.

Inspection and conversion do not choose attractive typography. The author still
calibrates size, weight, leading and tracking. Current fallback profiles cover a
bounded Latin sans/mono normal/italic use case. These checks establish primary
font loading and the calculation's output, not local fallback availability,
identical glyph widths, swap behaviour or zero layout shift on every platform.

## Review recommendation

Keep one font declaration and direct role references, with preparation inside
the project generation workflow. Let files supply their measured facts and
names; retain an optional CSS family-name override. Generate fallback CSS for
supported cases and keep the explicit author-managed route.

The main review is whether this division feels natural: **files and preparation
choices in `fonts.ts`; design decisions in `typography.ts`; the build connects
them**. The existing license and physical-style selection syntax is visible to
judge, not protected from simplification by its implementation history.

After this review, finish the atomic input decision and the wider role cases:
scalar weight with multiple physical styles, size-specific weights, categorical
variants, genuine mode changes, and the complete CSS/TS consumer experience.
The scalar/style case needs a focused check because today's authored style
selections take weight aliases while scalar weights normalize internally.

## Reproduce the evidence

The probe expects the actual source folder, containing `jetbrains-mono` with both
TTFs and `OFL.txt`. It does not download fonts, install tools, or write to that
folder. The recorded run used FontTools 4.60.1 and CPython 3.14.0 already installed
on this machine. The source and output hashes are in the results file; other
source versions/toolchains should produce an inspectable evidence difference.

```sh
pnpm exec tsc -p docs/blueprints/typography/real-fonts/tsconfig.json
node docs/blueprints/typography/real-fonts/verify.mjs \
  --source-root /Users/dickjones/project-local/scatter/packages/design-system/fonts/source
```

`--write` deliberately refreshes the two evidence artifacts after a reviewed
input/toolchain change. Their formatting is normalized for reading; their
values come from current source functions. Full prepared manifests and binary
outputs exist only during the probe and are removed afterwards. The committed
JSON is a review extract, not a proposed replacement manifest schema.

TypeScript checks the authored shapes and font identity references. The browser
loads both prepared webfonts and checks all four actual role selections at 16px
with 24px line height. No screenshot or visual calibration verdict is implied.
