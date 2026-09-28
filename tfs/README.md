# three-forma-styli

A designer's opinionated shorthand for design systems. Write a few readable
TypeScript files of deliberate choices (colour, spacing, type, shadow, motion);
TFS derives the scales and writes framework-neutral CSS variables, typography
classes and exact TypeScript types for your app.

## Start

Inside an app (npm shown; pnpm and yarn work the same):

```sh
npm install -D three-forma-styli
npx tfs init     # creates ./design-system/ from the standard theme
npx tfs dev      # builds design-system/generated/, serves Workbench, rebuilds on save
```

The app imports `design-system/generated/styles.css` once. For a design system
that is its own project, run `npx tfs init .` inside that project instead.

## Commands

| Command                      | Does                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `tfs init [dir]`             | start a design system (default `./design-system`; `.` = this folder)                   |
| `tfs dev [dir]`              | build, serve Workbench, rebuild on every save; invalid edits keep the last good output |
| `tfs build [dir]`            | run every check, then write `generated/`                                               |
| `tfs check [dir]`            | fail if `generated/` is out of date (for CI)                                           |
| `tfs fonts inspect <files…>` | show what font files offer                                                             |

## What an app gets

`generated/styles.css` (all CSS: tokens, fonts, typography classes),
`generated/tokens.d.ts` (exact names and group types, `cssVar()`),
`generated/typography.d.ts` (`typographyClassName()`), and optional
`generated/color-theme.js` with `three-forma-styli/runtime` for customer themes.

Font files are converted with [FontTools](https://github.com/fonttools/fonttools)
(`pip install fonttools brotli`) when a design system ships TTF/OTF fonts.
Requires Node 24+.

Source and design decisions: https://github.com/dick-jo/three-forma-styli
