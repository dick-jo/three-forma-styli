# Rainy Day Tasks

Low-priority cleanup and consistency tasks to tackle when time permits.

## Terminology Consistency

- [x] Audit active code and current documentation for "luminosity"; public TFS
      vocabulary remains "luminance", with the actual metric identified as
      `oklch-l` wherever diagnostics are exposed.

## Code Cleanup

- [ ] Review and remove any unused exports from core package
- [ ] Add JSDoc comments to all public API functions

## Testing

- [ ] Expand tests for validatePartialDesignSystem
- [x] Add tests for generate() with partial inputs
- [x] Rename TransparencySchedule → AlphaSchedule (terminology consistency)
- [x] Add tests for flexible AlphaSchedule keys

## Documentation

- [ ] Document the constraint system with examples
- [ ] Add examples for each token family

## Preview Package

- [x] Update preview to use new API (generateCss instead of generateCssVariables)
- [x] Fix preview type/build errors
