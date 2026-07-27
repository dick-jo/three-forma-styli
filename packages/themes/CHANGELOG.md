# @three-forma-styli/themes

## 0.4.0

### Patch Changes

- @three-forma-styli/core@0.4.0

## 0.3.0

### Minor Changes

- e7572c6: Add first-class layered box/text shadow recipes, semantic color references,
  strict interpolation helpers, global and CSS Module helpers, DTCG shadow
  composites, typed runtime contracts, and an interactive shadow specimen.
- 1b7b42a: Require every semantic motion recipe to declare its reduced-motion behavior.
  Generate matching `prefers-reduced-motion` CSS overrides, typed normal/reduced
  JavaScript contracts, DTCG extension data, stable Workbench review states, and
  interactive standard/reduced playback without globally erasing essential
  feedback.
- b4c2c69: Author reusable luminance separation policy and an explicit runtime-editable
  color subset as part of a color system, rename the public threshold to
  `minimumLuminanceDelta`, and generate a literal `runtime-color-theme` contract
  for strict browser theme processing.

  Project compiler configurations may now customize the shared generator naming
  and color-format policy once; CSS, TypeScript, design interchange, review, and
  runtime contracts resolve from the same configuration.

- 777f8df: Correct the time authoring model by replacing the misleading `time.modes`
  contract with simultaneously emitted `time.scales`. Generated system contracts
  now separate switchable color/size modes from time scales and expose
  `TfsTimeScale`; their schema advances to version 2.

  Add validated role- and recipe-level `textTransform` typography decisions.
  Resolved transform tokens flow through global helpers, CSS Modules, TypeScript
  contracts, mode overrides, derived-range safeguards, and interactive specimens
  without modifying source text or hardcoding role policy in core.

- 63fd508: Add property-agnostic semantic motion recipes with arbitrary author names,
  duration-scale references, cubic Bézier easing tokens, composite CSS fragments,
  and equivalent millisecond/second values in generated TypeScript contracts.

### Patch Changes

- Updated dependencies [e7572c6]
- Updated dependencies [25d8ea3]
- Updated dependencies [1b7b42a]
- Updated dependencies [b4c2c69]
- Updated dependencies [78891b2]
- Updated dependencies [7786d60]
- Updated dependencies [777f8df]
- Updated dependencies [bdbc97e]
- Updated dependencies [ba640e9]
- Updated dependencies [b2e6127]
- Updated dependencies [4e49cd6]
- Updated dependencies [709cfa3]
- Updated dependencies [8fe03a3]
- Updated dependencies [63fd508]
- Updated dependencies [9237f2c]
- Updated dependencies [604853a]
  - @three-forma-styli/core@0.3.0

## 0.2.0 — 2026-07-22

### Minor changes

- Replaced hidden typography defaults with a fully authored reference system
  containing inspectable prose, heading and label roles.
- Retained the former starter under the explicit `legacy` export.
- Calibrated the modern Small/Default/Large density modes as modest coordinated
  steps while keeping structural border width stable.
