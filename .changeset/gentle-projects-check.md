---
'@three-forma-styli/compiler': minor
'@three-forma-styli/cli': minor
---

Add a non-mutating generated-output check that fully rebuilds a project in a
private sibling stage and reports missing, changed, and unexpected files.

Add a lightweight committed-output validator for routine monorepo build paths.
It verifies manifest ownership/version, exact file inventory and hashes, and
workspace package wiring without running font preparation or regeneration.

Expose the workflow as `tfs check <path>` and add an opt-in
`tfs init --workspace-package` scaffold with package-safe runtime exports,
explicit generation, fast routine checks, and a dedicated drift-check script.
