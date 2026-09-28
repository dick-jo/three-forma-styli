# TFS v0.5 progress

The agreed runbook and where we are. Decisions live in [founder-board.md](./founder-board.md).

## Position

- Blueprint complete and ratified, 2026-09-28.
- Runbook agreed 2026-09-28: **clean slate**. Rebuild as one package against the
  Board; copy in only the proven parts listed below; delete everything else.
- Recovery: tag `pre-v05-cleanup` (full pre-cleanup tree, docs and history) and
  published tag `@three-forma-styli/*@0.4.0`.
- Scatter depends on npm `0.4.0` (pinned) and is untouched until step 10.

## Runbook

One reviewable step at a time; each ends with its checks passing and a commit.

| Step | Work                                                                                                              | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Recovery tag; delete stale docs, examples and blueprint mocks; short Board; new README; this runbook              | done   |
| 2    | Delete old packages/scripts; single-package skeleton; `define*()` + types; everything-project fixture type-checks | done   |
| 3    | Checks and mode resolution for every family                                                                       | done   |
| 4    | `tokens.css` with mode blocks and re-binding, verified in a browser                                               |        |
| 5    | Typography: classes, whole-row tokens, `./typography`; fonts copied in (no licensing)                             |        |
| 6    | `./tokens`: identity names, exact group types, `var()` helpers                                                    |        |
| 7    | Runtime colour themes + luminance copied in; `./runtime`; decide `native-color-modes`                             |        |
| 8    | `tfs build`, `tfs check`, `tfs dev` (watch, last valid output, Workbench data)                                    |        |
| 9    | Standard theme ported with unchanged values                                                                       |        |
| 10   | Scatter upgrade to 0.5: separate agreed scope, values unchanged                                                   |        |
| 11   | Capstone: Figma (chosen modes; shadows/text as styles)                                                            |        |

## Kept list

Files deliberately copied from `pre-v05-cleanup`, with the reason. Anything not
listed here was not carried over.

| From                                                      | To                                   | Why                                                       |
| --------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `docs/blueprints/system/`                                 | `tfs/tests/fixtures/everything/`     | the ratified assembled mock; now imports the real package |
| mock `support/types.ts`                                   | `tfs/src/define/*.ts`                | review types became the real authoring types              |
| `packages/core/src/utils.ts` `oklch()`                    | `tfs/src/define/color.ts`            | 3-line constructor, same output                           |
| `packages/core/src/alpha/authoring.ts` `deriveAlphaScale` | `tfs/src/define/color.ts`            | same maths; test pins 0.4.0 values                        |
| `apps/workbench/`                                         | `workbench/` (outside the workspace) | kept per runbook; rejoins in step 8 via the data file     |
| `.github/requirements-fonttools.txt`                      | unchanged                            | needed by FontTools in step 5                             |

Planned copies: font inspection, FontTools conversion, fallback metrics
(`packages/compiler/src/fonts/`); OKLCH helpers, runtime themes, luminance
(`packages/core/src/{runtime,constraints}/`); CSS mode re-binding details
(`packages/core/src/generator/typography.ts`); Workbench UI (`apps/workbench/`).

## Notes

- `Register` (in `tfs.config.ts`) is how `defineX()` checks mode and colour names
  across files; the stock pattern used by TanStack Router and similar libraries.
- Release tooling (changesets) was removed with the old packages; the package is
  `private` until step 10 decides how 0.5 is published.
- Check 2 (banned words) runs from step 2. Check 3 (`knip`) is added at step 8,
  once the CLI makes exports reachable.

## Finish-line checks

The cleanup is done when all of these pass:

1. **Nothing old by accident**: every carried-over file is in the kept list.
2. **Banned words**: a test fails if code contains old vocabulary (`isDefault`,
   `defaultScale`, `defaultRange`, `modeOverrides`, `variants`, `license`,
   `verification`, `strategy`, `increment`, `tfsSystem`, `shadow--`, …).
3. **No dead code**: `knip` reports no unused files or exports.
4. **Boundaries**: `workbench/` and `figma-plugin/` import nothing from TFS
   internals; they read generated files only.
5. **Final review**: full file tree with line counts vs the ~60k starting point;
   every folder matches the README's "where things live".
