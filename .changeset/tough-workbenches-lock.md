---
'@three-forma-styli/core': minor
'@three-forma-styli/compiler': minor
---

Make Workbench typography calibration genuinely mode-scoped: every non-default
typography mode now has resolved review cases and source paths, so display or
compact edits cannot be exported as global recipe changes. Freeze public
generator and CSS defaults and return isolated resolved configuration objects
for deterministic repeated generation.

Report FontTools whenever variable WOFF2 fallback sampling requires it, route
decompression through the identified converter boundary, and record exact tool
provenance in the adjusted-fallback manifest. Build locks now contain
inspectable ownership metadata and safely recover exited same-host writers and
old pre-metadata locks.
