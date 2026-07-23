---
'@three-forma-styli/core': minor
---

Allow semantic typography recipes to opt into explicit, role-local tuple
overrides for non-default typography modes. Mode overrides can change font size,
weight, line height, and letter spacing without inventing a parallel role or
changing existing atomic `--fs-*` behaviour.

Make the interactive typography specimen genuinely mode-aware: alternate modes
now load their generated tokens, controls and labels show resolved tuples, and
copied drafts preserve default recipes versus mode overrides. Calibration edits
also apply to the editable glyph sample and its metric context together.
Slider controls no longer quantize precise authored line-height or tracking
values when another field is edited.
