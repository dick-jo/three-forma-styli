# Three Forma Styli (TFS)

A designer's opinionated shorthand for design systems. You write a few readable
TypeScript files of deliberate choices (colours, spacing, type, shadows, motion).
TFS derives the repetitive scales and emits framework-neutral CSS variables and
exact TypeScript types for your app.

> **Status:** `three-forma-styli@0.5.0` is on npm. (0.4.0 was four `@three-forma-styli/*` packages.)

## Try it

A design system is one folder: config, family files, fonts, and `generated/`.

**Inside an existing app** (npm shown; pnpm/yarn work the same):

```sh
npm install -D three-forma-styli
npx tfs init        # creates ./design-system/
npx tfs dev         # finds ./design-system; builds its generated/, serves Workbench
```

The app imports `design-system/generated/styles.css` once, from its entry file.

**As its own project** (a system shared by several apps):

```sh
mkdir my-system && cd my-system && pnpm init
pnpm add -D three-forma-styli typescript
pnpm tfs init .     # this folder is the design system
pnpm tfs dev
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

## Developing TFS itself

`pnpm install && pnpm check` in this repo. To try unreleased changes in another project:
`pnpm build` here, then `npm install -D ~/project-local/three-forma-styli/tfs` there.
Publish from `tfs/` (`npm publish`; needs npm 2FA).

## Recovery

The full pre-rebuild tree, including all old docs and notes, is tag `pre-v05-cleanup`.
