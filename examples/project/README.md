# Portable project example

Run from the repository root:

```sh
pnpm build
node packages/cli/dist/index.js build examples/project
```

The single command creates the complete movable `generated/` handoff. Inspect
`index.css`, `system.generated.ts`, `typography.generated.module.css`,
`typography.specimen.html`, and `build.manifest.json` first.

Serve the generated review artifact over localhost:

```sh
node packages/cli/dist/index.js review serve examples/project --open
```
