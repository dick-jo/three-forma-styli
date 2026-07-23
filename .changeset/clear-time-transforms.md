---
'@three-forma-styli/core': minor
'@three-forma-styli/compiler': minor
'@three-forma-styli/themes': minor
---

Correct the time authoring model by replacing the misleading `time.modes`
contract with simultaneously emitted `time.scales`. Generated system contracts
now separate switchable color/size modes from time scales and expose
`TfsTimeScale`; their schema advances to version 2.

Add validated role- and recipe-level `textTransform` typography decisions.
Resolved transform tokens flow through global helpers, CSS Modules, TypeScript
contracts, mode overrides, derived-range safeguards, and interactive specimens
without modifying source text or hardcoding role policy in core.
