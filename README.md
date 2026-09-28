# Three Forma Styli (TFS)

A designer's opinionated shorthand for design systems. You write a few readable
TypeScript files of deliberate choices (colours, spacing, type, shadows, motion).
TFS derives the repetitive scales and emits framework-neutral CSS variables and
exact TypeScript types for your app.

> **Status: v0.5 rebuild in progress.** The published version is 0.4.0 on npm.
> This branch is being rebuilt from scratch against the agreed design; until the
> runbook reaches step 8 it does not build a project.

## Read first

- [docs/founder-board.md](docs/founder-board.md): every current product decision.
- [docs/progress.md](docs/progress.md): the rebuild runbook and where we are.

## Where things live

Target layout (being built; see progress):

| Path                   | Job                                                                              |
| ---------------------- | -------------------------------------------------------------------------------- |
| `tfs/`                 | the one npm package, `three-forma-styli`: authoring helpers, build, CLI, runtime |
| `tfs/themes/standard/` | the standard theme, and the example to read                                      |
| `tfs/tests/`           | tests, including the everything-project fixture                                  |
| `workbench/`           | the review UI opened by `tfs dev`; reads TFS's data file only                    |
| `figma-plugin/`        | later; reads TFS's Figma output only                                             |
| `docs/`                | the Board and the progress file, nothing else                                    |

## Recovery

The full pre-rebuild tree, including all old docs and notes, is tag `pre-v05-cleanup`.
