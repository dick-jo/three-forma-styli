# Typography test drive

This example is deliberately Scatter-shaped without containing or modifying licensed font assets. The checked-in manifest is metadata-only; create a real one with `tfs fonts prepare` before shipping.

For the intended one-command workflow, start from
`tfs.config.example.ts`: it keeps font preparation, role intent, and every output
in one portable source config. It intentionally refuses to build while Supreme's
self-hosting permission remains unconfirmed. The separate commands below remain
useful as targeted diagnostics and expert escape hatches.

From the repository root, after `pnpm build`:

```sh
node packages/cli/dist/index.js build examples/typography/theme.ts \
  --output /tmp/tfs-typography.css

node packages/cli/dist/index.js build examples/typography/theme.ts \
  --format typescript \
  --output /tmp/tfs-typography.generated.ts

node packages/cli/dist/index.js build examples/typography/theme.ts \
  --format specimen \
  --output /tmp/tfs-typography.html
```

Or generate the same three files as one disposable review bundle:

```sh
pnpm typography:review
```

This writes to your operating system's temporary directory and prints the exact
path. Start with its `REVIEW.md`, then compare the copied authoring config with the
three generated artifacts. It is contract evidence only: the checked example
includes font metadata, not licensed font files, so use the real-font flow below
before shipping.

Inspect the three outputs together: CSS contains the atomic `--fs-*` scale plus the semantic longhand tuples; TypeScript contains the role/variant/style/weight-safe contract a future local `Text` component can consume; the specimen makes every role base and variant, valid weight/style pair, wrapping width, and dense UI context visible.

To exercise the integrated font pipeline, copy `tfs.config.example.ts` to a
disposable project, point it at licensed source files, and run `tfs build .`.
The generated `typography.css` contains verified `@font-face` blocks first,
followed by `.text--…` helpers, while `fonts/` retains the prepared binaries,
license text, standalone CSS, and authoritative manifest.

For the lower-level preparation command, copy `fonts.config.example.ts`, point it at licensed
source files, and verify each license attestation. The Supreme entry intentionally
sets `allowWebEmbedding: false`; preparation must remain blocked until written
self-hosting permission is recorded. You can remove that family to test JetBrains
independently. Then run:

```sh
node packages/cli/dist/index.js fonts prepare ./path/to/fonts.config.ts

node packages/cli/dist/index.js build examples/typography/theme.ts \
  --format specimen \
  --output /tmp/tfs-typography.html \
  --font-css ./path/to/generated/fonts.css
```

The command will not transform bytes unless `allowTransformations: true` is explicit. It never subsets fonts implicitly.
