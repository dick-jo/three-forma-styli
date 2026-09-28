# TFS v0.5 progress

The agreed runbook and where we are. Decisions live in [founder-board.md](./founder-board.md).

## Position

- Blueprint complete and ratified, 2026-09-28.
- Runbook agreed 2026-09-28: **clean slate**. Rebuild as one package against the
  Board; copy in only the proven parts listed below; delete everything else.
- `three-forma-styli@0.5.0` published 2026-09-28 (git tag `v0.5.0`, on `master`). Recovery: tag `pre-v05-cleanup` (full pre-cleanup tree, docs and history) and
  published tag `@three-forma-styli/*@0.4.0`.
- Scatter depends on npm `0.4.0` (pinned) and is untouched until step 13.

## Runbook

One reviewable step at a time; each ends with its checks passing and a commit.

| Step | Work                                                                                                              | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Recovery tag; delete stale docs, examples and blueprint mocks; short Board; new README; this runbook              | done   |
| 2    | Delete old packages/scripts; single-package skeleton; `define*()` + types; everything-project fixture type-checks | done   |
| 3    | Checks and mode resolution for every family                                                                       | done   |
| 4    | `tokens.css` with mode blocks and re-binding, verified in a browser                                               | done   |
| 5    | Typography: classes, whole-row tokens, `./typography`; fonts copied in (no licensing)                             | done   |
| 6    | `./tokens`: identity names, exact group types, `var()` helpers                                                    | done   |
| 7    | Runtime colour themes + luminance copied in; `./runtime`; decide `native-color-modes`                             | done   |
| 8    | `tfs build`, `tfs check`, `tfs dev` (watch, last valid output), `tfs fonts inspect`; knip in CI                   | done   |
| 8b   | Workbench rewritten: live read-only view served by `tfs dev`, disposable sliders                                  | done   |
| 9    | Standard theme (0.4.0 values, JetBrains Mono for label) + `tfs init`                                              | done   |
| 10   | Founder test drive: a new project started with `tfs init`; fix what it finds                                      | done   |
| 11   | Merge `v0.5-rebuild` to `master`; publish 0.5 to npm                                                              | done   |
| 12   | Figma, preliminary: sync the new project's tokens (chosen modes; shadows/text as styles)                          |        |
| 13   | Scatter upgrade to 0.5: separate agreed scope, values unchanged                                                   |        |
| 14   | Codebase tour (finish-line checks already pass; see below)                                                        |        |

## Kept list

Files deliberately copied from `pre-v05-cleanup`, with the reason. Anything not
listed here was not carried over.

| From                                                                              | To                                     | Why                                                                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `docs/blueprints/system/`                                                         | `tfs/tests/fixtures/everything/`       | the ratified assembled mock; now imports the real package                                                   |
| mock `support/types.ts`                                                           | `tfs/src/define/*.ts`                  | review types became the real authoring types                                                                |
| `packages/core/src/utils.ts` `oklch()`                                            | `tfs/src/define/color.ts`              | 3-line constructor, same output                                                                             |
| `packages/core/src/alpha/authoring.ts` `deriveAlphaScale`                         | `tfs/src/define/color.ts`              | same maths; test pins 0.4.0 values                                                                          |
| `apps/workbench/`                                                                 | nothing                                | rewritten from scratch in 8b; no old code kept                                                              |
| `.github/requirements-fonttools.txt`                                              | unchanged; used by CI                  | FontTools + Brotli for WOFF2 conversion                                                                     |
| `packages/compiler/src/fonts/inspect.ts` (style/format detection)                 | `tfs/src/fonts/inspect.ts`             | family, style, weight range, container vs extension check; provenance, embedding flags and warnings dropped |
| `packages/compiler/src/fonts/fonttools.ts` (the two commands)                     | `tfs/src/fonts/convert.ts`             | `ttLib.woff2 compress/decompress`; version/Python provenance dropped                                        |
| `packages/compiler/src/fonts/fallback-metrics.ts` (formula + 8 Fontpie constants) | `tfs/src/fonts/fallback.ts`            | same numbers; test pins 0.4.0's JetBrains Mono output                                                       |
| `packages/core/src/runtime/theme.ts` (strict parsing, custom properties, enforce) | `tfs/src/runtime/theme.ts`             | same validation; prefix/alpha-modifier options dropped; ratified null-rule behaviour added                  |
| `packages/core/src/constraints/luminance.ts`                                      | `tfs/src/runtime/luminance.ts`         | same formula and diagnostics; empty-group case removed (rule lists are validated)                           |
| JetBrains Mono TTFs + `OFL.txt` (from Scatter)                                    | `tfs/tests/fixtures/everything/fonts/` | real test font; OFL permits redistribution with its licence                                                 |
| `esbuild` config loading (from `packages/cli/src/config/load-module.ts`)          | `tfs/src/session/config.ts`            | same approach; also yields the watch list for `tfs dev`                                                     |
| `LICENSE`, `.prettierrc`, `.gitattributes`                                        | unchanged                              | repository configuration                                                                                    |

CSS mode re-binding was rewritten in step 4 rather than copied (the old version
handled one axis only).

## Notes

- `Register` (in `tfs.config.ts`) is how `defineX()` checks mode and colour names
  across files; the stock pattern used by TanStack Router and similar libraries.
- Releases: bump `tfs/package.json`, `npm publish` from `tfs/` (needs npm 2FA), tag
  `vX.Y.Z`. Trusted publishing from CI is the later upgrade. The four old
  `@three-forma-styli/*` packages get deprecated after Scatter moves (step 13).

## Backlog

- **Drop the Python dependency:** replace FontTools with a WebAssembly WOFF2 library from
  npm, so `npm install` is all TFS needs. Must produce byte-identical output (the font
  tests and committed snapshots prove it). Raised by the rkgk setup, 2026-09-28.

## Finish-line checks

Run 2026-09-28, after step 9. All pass.

1. **Nothing old by accident:** the kept list above is complete.
2. **Old vocabulary gone:** no `isDefault`, `defaultScale`, `defaultRange`,
   `modeOverrides`, `variants`, `license`, `verification`, `strategy`, `increment`,
   `tfsSystem`, `shadow--`, `displayOrder`, `defaultStyle` or `dtcg` in any source file.
3. **No dead code:** `knip` clean (runs in `pnpm check`).
4. **Boundaries:** Workbench imports only `svelte` and TFS's public `WorkbenchData`
   type (type-only; no TFS code in its bundle).
5. **Size:** ~60,200 lines in 384 files → ~7,300 authored lines in 131 files
   (`tfs/src` 3,981 · tests 1,318 · theme 259 · Workbench 1,311 · docs 393), plus
   1,199 lines of committed generated snapshots. Every folder matches the README.
