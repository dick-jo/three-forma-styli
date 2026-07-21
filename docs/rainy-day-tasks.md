# Rainy Day Tasks

Low-priority cleanup and consistency tasks to tackle when time permits.

## Terminology Consistency

- [ ] Audit all code and comments for "luminosity" - should be "luminance"

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
