# @three-forma-styli/core

## 0.2.0 — 2026-07-22

### Minor changes

- Added explicit semantic typography roles, arbitrary role-local variants and
  weights, prepared-font capability validation, normal/italic/oblique modelling,
  longhand CSS recipes, typed manifests, and the interactive specimen generator.
- Preserved native OKLCH values for wide-gamut CSS and added profile-aware
  Display-P3 Figma/DTCG output without routing CSS through P3 component bytes.
- Added first-class mode metadata, typed system output foundations, configurable
  selectors, collision detection, and substantially stricter runtime validation.
- Removed the advertised but non-functional `separators` and `modeCategories`
  generator options. TFS owns stable token separators and structural mode
  categories; projects continue to control namespaces and CSS selectors.
- Aligned the `TypographySystem` type with runtime validation: atomic font-size
  modes may stand alone, while semantic roles require their font registry.
