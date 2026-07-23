# @three-forma-styli/compiler

## Unreleased

- Record exact FontTools executable, release, and Python runtime provenance in
  prepared-font manifests only when TFS performs WOFF2 byte conversion. Copy-only
  font preparation remains independent of Python and FontTools.
- Added read-only project planning so CI and authoring tools can inspect the
  validated artifact graph, package exports, font inputs, and prerequisites.

## 0.2.0 — 2026-07-23

### Initial package

- Extracted the import-safe project authoring contract, deterministic project
  compiler, font preparation, inspection, and adjusted fallback implementation
  from the interactive CLI package without changing generated artifacts.
