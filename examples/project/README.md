# Portable project example

Run from the repository root:

```sh
pnpm build
node packages/cli/dist/index.js build examples/project
```

The single command creates one package-shaped `generated/` handoff. Inspect:

- `runtime/tokens.js` for the compact consumer contract and typed helpers;
- `runtime/typography.js` for semantic role/size/variant capabilities;
- `runtime/styles/` for browser-ready CSS;
- `review/index.html` for the visual Workbench;
- `design/` for design-tool interchange;
- `build.manifest.json` for exact provenance and ownership.

Serve the generated review artifact over localhost:

```sh
node packages/cli/dist/index.js review serve examples/project --open
```

The detailed resolved system belongs in the build manifest and Workbench. It is
deliberately not a normal application runtime export.
