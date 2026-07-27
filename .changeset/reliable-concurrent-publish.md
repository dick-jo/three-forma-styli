---
'@three-forma-styli/core': patch
'@three-forma-styli/themes': patch
'@three-forma-styli/compiler': patch
'@three-forma-styli/cli': patch
---

Verify prebuilt package entrypoints during `prepack` instead of rebuilding and
cleaning shared workspace output. The release gate now reproduces concurrent
package packing so Changesets publishing cannot race package builds.
