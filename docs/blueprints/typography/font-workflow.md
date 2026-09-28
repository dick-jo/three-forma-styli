# Actual fonts and preparation — workshop evidence

2026-09-28. The founder asks to review the real-font connection before progressing
through more role options. This is an authoring discussion and read-only audit;
no font regeneration, implementation change, or new product ruling occurs here.
The first mock's `start/step/count` proposal remains awaiting explicit review.

Following this audit, the founder requested the
[real-font mock](./real-fonts/README.md). Its latest revision explains when the
author writes each file and runs inspection/build commands. The founder has
excluded licensing machinery from TFS; the revised input reflects that ruling.
Current checks verify source inspection and physical weight validation. Earlier
preparation/browser evidence is preserved separately, not claimed as a current
build of the revised input. The founder subsequently accepted a continuing
authoring session with automatic checks, preview and output updates on save.
The current [Founder Board](../../founder-board.md#workflow-contract) owns that
direction; manual build/retry is no longer the primary authoring recommendation.

## Names and responsibilities

| Thing                  | Example                                   | Owner                                              |
| ---------------------- | ----------------------------------------- | -------------------------------------------------- |
| Authored font identity | `sans`                                    | The design-system author; roles refer to this key  |
| Source file            | `Supreme-Variable.woff2`                  | The font input declaration                         |
| CSS family name        | `Supreme`                                 | Prepared output, detected or explicitly configured |
| Physical capabilities  | Normal/italic, supported weights and axes | Inspection of the actual files                     |

`prose.font: 'sans'` means use the font registered under `sans`; it does not mean
the CSS generic `sans-serif`, an internal font name, or an automatically chosen
font. The current system-stack mock happens to associate that key with
`system-ui`. A prepared-font declaration can use the same key for a real family.

For URL-loaded webfonts, the `@font-face` family descriptor supplies the CSS
matching name independently of the binary's internal family name. `local()`
lookup has different requirements: it identifies an installed face using its
full or PostScript name. See [CSS family naming](https://www.w3.org/TR/css-fonts-4/#font-family-desc)
and [local face lookup](https://www.w3.org/TR/css-fonts-4/#local-font-fallback).

## Existing implementation and Scatter evidence

The current project compiler already:

- prepares project source files, copying web-ready assets or converting TTF/OTF
  to WOFF2;
- inspects names, weights, styles, axes, features and metrics;
- creates core font capabilities from the prepared manifest and resolves role
  font references without requiring authors to import generated manifests;
- validates requested role choices against those facts;
- calculates adjusted fallbacks for supported cases and emits primary/fallback
  CSS, font files and factual manifests.

Relevant implementation: `packages/compiler/src/project-build.ts`,
`packages/compiler/src/fonts/{prepare,inspect,adjusted-fallbacks,fallback-metrics}.ts`,
and `packages/core/src/typography/prepared-font.ts`.

Read-only inspection of Scatter's `packages/design-system/src/fonts.ts` and its
committed `generated/assets/fonts` manifests confirms:

- Supreme normal/italic WOFF2 faces are copied; JetBrains Mono normal/italic TTF
  sources are converted to WOFF2. Prepared weight ranges are 100–800.
- Fallback measurements are present for prose, heading, label and code, with
  eight style/weight measurements per role in that committed snapshot.
- Scatter documents its pinned FontTools toolchain for explicit regeneration;
  routine package checks consume committed artifacts.

This confirms existing source and generated evidence, not today's live site or
the result of rerunning preparation. Scatter's legacy role syntax is not a model
to copy into the overhaul.

FontTools performs conversion/decompression where needed. Fontkit supplies TFS's
inspection and primary-font sampling. TFS's fallback implementation uses pinned
Fontpie-derived fallback constants; it does not invoke the Fontpie CLI and patch
its output. Current automatic profiles cover sans/mono normal/italic with a
Latin calibration sample. Other fonts/platforms and exact text wrapping are not
universally covered. See [the existing fallback contract](../../typography-fallback-metrics.md).

## Earlier recommendation and current direction

Keep preparation and role authoring separate responsibilities within the shared
TFS workflow. Declare sources once; roles select the authored font identity.
The compiler supplies measured facts and generated CSS. Authors should not copy
font names, capability lists or fallback percentages between tools and files.
Keep a route for system or externally managed fonts without requiring preparation,
and distinguish their unavailable physical verification honestly.

The companion shows one real family from source declaration through role
reference, with inspection/validation checks and historical prepared output.
The accepted continuing session must make capabilities visible as soon as source
paths are supplied, before roles are complete; implementation is later work.
Demonstrate normal and italic, an available and unavailable weight, and the
existing externally managed/system-font boundary. Show the complete author input
before deciding which existing configuration is necessary or merely cumbersome.

Use the existing machinery as evidence; retaining every current option or output
is not automatic. Fallback adjustment should remove manual repetition while
reporting its limits. A logical font identity also does not make different fonts
visually interchangeable: changing the family can require role recalibration.
