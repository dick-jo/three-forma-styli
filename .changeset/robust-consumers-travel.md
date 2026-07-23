---
'@three-forma-styli/core': minor
'@three-forma-styli/compiler': minor
'@three-forma-styli/cli': minor
---

Harden real consumer workflows across the runtime, compiler and CLI.

Runtime color-theme configuration now preserves literal declared color names,
reports luminance diagnostics against the exact emitted CSS precision, removes
floating-point display noise, deep-freezes nested diagnostics, and rejects a
larger hostile persisted-JSON corpus.

Workspace packages now expose CSS Module declarations through an explicit
`types` condition and reject stale exports into removed TFS-owned artifacts.
Generated font, CSS import and specimen URLs encode filesystem path segments;
ambiguous prefixes and cross-platform-reserved output names fail early.
WOFF2 conversion manifests now identify the FontTools executable, exact
FontTools release, and Python runtime; copy-only font preparation neither
requires nor claims that external toolchain.

Scaffolds pin exact TFS and TypeScript releases, use non-mutating build/check
scripts, support scoped package names and deterministic package-manager
selection, and produce a packable private workspace package. The release gate
installs actual tarballs, exercises both scaffold shapes, packs the generated
package, and type-checks and bundles a production browser consumer.

The CLI depends directly on the two prompt controls it uses rather than the
umbrella Inquirer prompt suite, reducing every authoring install's dependency
surface without changing commands.

The compiler now exposes a read-only, validated project plan. The CLI presents
it through `build --dry-run`, and build/check/validate expose versioned JSON
success and failure envelopes with documented exit semantics.
