# Typography fallback metrics

Status: automatic measurement and adjusted-face generation are implemented for physical normal
and italic prepared faces. TFS emits a factual provenance manifest; it does not model human
approval states.

## What the project author supplies

The ordinary authoring contract stays small:

```ts
fonts: {
	supreme: { family: 'Supreme', category: 'sans', /* sources + license */ },
	jetbrains: { family: 'JetBrains Mono', category: 'mono', /* sources + license */ },
}
```

Typography roles already state the exact font, exposed weights and styles. That is enough intent
for the project compiler to derive fallback measurements after font preparation. Authors do not
enter Fontpie percentages or a separate fallback profile vocabulary.

An explicit `fallbacks` array opts that font out of automatic calibration and preserves the
author-owned stack. `typographyCss.fontFaces: 'none'` also leaves all face loading to the host.

## Implemented build order

One `tfs build` command:

1. copies WOFF/WOFF2 sources or converts licensed TTF/OTF sources to WOFF2;
2. inspects exact faces, ranges, axes, styles, metrics, coverage, features and embedding flags;
3. validates every role selection against those prepared capabilities;
4. instantiates each exposed variable-font weight exactly;
5. calculates metric overrides against the style- and weight-matched local fallback profile;
6. injects the private fallback family into the semantic role stack;
7. emits measured `@font-face` rules in `typography.css` and `fonts/fonts.css`;
8. writes `fonts/fallbacks.manifest.json` with every input, formula, raw value, rounded CSS value,
   warning and provenance record;
9. adds **force adjusted fallback** and **disable all generated font faces** controls to the
   specimen.

Unsupported styles, weights, optical sizing, custom variation coordinates or ambiguous prepared
faces fail the build. TFS never chooses a nearby weight or silently synthesizes a face.

## Current portable profiles

The first profile set is deliberately versioned compatibility input from `fontpie-calc@0.2.0`:

| Project category | prepared style | exposed weight | local face              |
| ---------------- | -------------- | -------------: | ----------------------- |
| `sans`           | normal         |          1–500 | Arial                   |
| `sans`           | normal         |       501–1000 | Arial Bold              |
| `sans`           | italic         |          1–500 | Arial Italic            |
| `sans`           | italic         |       501–1000 | Arial Bold Italic       |
| `mono`           | normal         |          1–500 | Courier New             |
| `mono`           | normal         |       501–1000 | Courier New Bold        |
| `mono`           | italic         |          1–500 | Courier New Italic      |
| `mono`           | italic         |       501–1000 | Courier New Bold Italic |

These names and constants reproduce Fontpie's existing normal/italic selection and published
averages; they are not inferred from the machine running the build. The manifest factually states
that their originating font-file version and hash were not recorded.

On macOS 15, the installed Arial/Courier files reproduce the pinned calibration averages
exactly. That is valuable evidence, not a universal-platform guarantee. `local('Arial')` and
the corresponding normal, bold and italic local names simply fail on systems without those
fonts; the browser then reaches the ordinary unadjusted generic family. Android coverage therefore
remains an explicit future profile, not something the current CSS pretends to solve.

## Formula contract

For an exact primary instance and a pinned local fallback face:

```text
primaryAverage  = sum(primary corpus advances) / (corpusLength × primaryUPM)
fallbackAverage = sum(fallback corpus advances) / (corpusLength × fallbackUPM)
S               = primaryAverage / fallbackAverage

size-adjust       = 100 × S %
ascent-override   = 100 × primaryAscent / (primaryUPM × S) %
descent-override  = 100 × abs(primaryDescent) / (primaryUPM × S) %
line-gap-override = 100 × primaryLineGap / (primaryUPM × S) %
```

Dividing metric overrides by `S` matters because `size-adjust` scales glyphs and metrics. TFS uses
raw font-table values; rounded display values and `naturalLineHeight` never feed the calculation.

The current `tfs-latin-ui-v1` calibration corpus is the versioned Fontpie/Next.js
frequency-weighted lowercase Latin sample. It is transparent in the manifest, including its text
and SHA-256.

## What Fontpie did—and did not do

Scatter's historical declarations reproduce Fontpie's published calculation. Fontpie was useful,
but its generated CSS looked more authoritative than its contract:

- Arial, Times New Roman and Courier New averages were hard-coded without a font-file hash or OS
  identity.
- `--weight` selected a regular or bold fallback constant; it did not instantiate the primary
  variable font at that weight.
- `--style` selected a normal or italic fallback constant; it did not inspect or create a missing
  primary style.
- one lowercase-Latin corpus was sampled;
- no actual font swap, line wrapping or CLS was measured.

TFS keeps the compatible constants but fixes the primary side: exact variable instances are
sampled per role/style/weight, prepared hashes are retained, and unsupported intent fails loudly.

## Why “perfect fallback” is not a real scalar

`size-adjust` can align one aggregate advance target; metric overrides can align the line box.
They cannot make Arial's individual glyph shapes equal Supreme's. A different string distribution
will produce a different width error.

Local Scatter stress measurements illustrate the boundary:

- adjusted Courier New and JetBrains Mono are effectively identical in fixed-column advance over
  prose, uppercase, numeric, route and punctuation samples;
- adjusted Arial improves ordinary Supreme prose averages, but deliberately hostile uppercase and
  punctuation strings still show roughly 6–11% inline-width differences at some weights.

That does not make the feature useless: it removes a major class of line-box and average-width
shift. The manifest reports the measurement and known provenance limits; browser observations are
evidence about a deployment environment rather than a TFS-owned lifecycle state.

## Browser-comparison guidance

The generated specimen can force the primary, adjusted fallback or completely
unadjusted state. The Workbench first verifies that both the intended primary
family/style/weight and private adjusted face are available; without those
checks, comparing two unintended fallback renderings can produce a dangerously
reassuring zero delta. It then reports three separate observations:

- editable phrase inline-width delta;
- constrained prose line-count delta;
- hostile uppercase, lowercase, numeric, currency and punctuation width delta.

These are deliberately not collapsed into one approval score. A fallback may be
excellent for ordinary prose and still diverge on a punctuation-heavy label.
Review every role, size, exposed weight and style at fixed widths. A useful
observation record names:

- browser, version, OS and available local face;
- resolved face;
- inline advance and constrained line count;
- block height and following-sibling position;
- delayed-font-swap CLS;
- whether the adjusted result improves on the unadjusted result.

Suggested comparison thresholds are stable role-default line counts, block-height delta no greater than
1 CSS pixel, baseline delta no greater than 0.5 CSS pixel, and controlled swap CLS no greater than
0.001. Those numbers are review policy, not hidden build-time truth.

## Deliberate deferrals

- Android/Roboto-compatible and other platform profile chains;
- oblique built-in fallback profiles;
- non-Latin and per-role calibration corpora. A custom primary corpus alone
  would be mathematically invalid because the fallback average must be measured
  against the exact same corpus; future support therefore needs a paired,
  provenance-bearing fallback-profile contract rather than a freeform text box;
- optical-size and arbitrary custom-axis policies;
- OS-conditional CSS and automatic Unicode-range partitioning.

## Standards and implementation anchors

- [CSS Fonts 5 metric overrides and size-adjust](https://www.w3.org/TR/css-fonts-5/#font-face-size-adjust-desc)
- [CSS Fonts 4 local face matching](https://www.w3.org/TR/css-fonts-4/#local-font-fallback)
- [Chromium fallback guidance](https://developer.chrome.com/blog/font-fallbacks/)
- [OpenType OS/2 metrics](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)
- [OpenType MVAR](https://learn.microsoft.com/en-us/typography/opentype/spec/mvar)
- [Next.js local fallback calculation](https://github.com/vercel/next.js/blob/canary/packages/font/src/local/get-fallback-metrics-from-font-file.ts)
- [FontTools variable-font instancer](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html)
