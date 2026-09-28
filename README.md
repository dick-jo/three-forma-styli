# Three Forma Styli (TFS)

A designer's opinionated shorthand for design systems. You write a few readable
TypeScript files of deliberate choices (colours, spacing, type, shadows, motion).
TFS derives the repetitive scales and emits framework-neutral CSS variables and
exact TypeScript types for your app.

> **Status: v0.5 rebuilt, on branch `v0.5-rebuild`; not yet published** (npm has 0.4.0).

## Try it

```sh
mkdir my-system && cd my-system && pnpm init
pnpm add -D ~/project-local/three-forma-styli/tfs typescript   # once published: pnpm add -D three-forma-styli
pnpm tfs init                                                  # adds the standard theme's files
pnpm tfs dev                                                   # builds generated/, serves Workbench, rebuilds on save
```

`tfs build` writes `generated/`; `tfs check` fails CI when it is stale;
`tfs fonts inspect <files>` shows what font files offer.

## Read first

- [docs/founder-board.md](docs/founder-board.md): every current product decision.
- [docs/progress.md](docs/progress.md): the rebuild runbook and where we are.

## Where things live

| Path                    | Job                                                                              |
| ----------------------- | -------------------------------------------------------------------------------- |
| `tfs/`                  | the one npm package, `three-forma-styli`: authoring helpers, build, CLI, runtime |
| `tfs/themes/standard/`  | the standard theme, and the example to read                                      |
| `tfs/tests/`            | tests, including the everything-project fixture                                  |
| `workbench/`            | the review UI opened by `tfs dev`; reads TFS's data file only                    |
| `figma-plugin/` (later) | reads TFS's Figma output only                                                    |
| `docs/`                 | the Board and the progress file, nothing else                                    |

## Recovery

The full pre-rebuild tree, including all old docs and notes, is tag `pre-v05-cleanup`.
