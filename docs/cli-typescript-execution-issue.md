# CLI TypeScript Execution Issue

> **Status:** Open issue requiring fix
> **Date:** 2025-12-08
> **Affects:** `@three-forma-styli/cli` package, specifically the `tfs build` command

## Summary

The CLI has a fragile mechanism for executing user TypeScript theme files. This causes issues when other Claude Code sessions (or users) try to use the tool in fresh directories.

## The Two Use Cases That Must Work

| Use Case | Description | Current Status |
|----------|-------------|----------------|
| **1. CLI Theme Generation** | User runs `npm i @three-forma-styli/cli` → `tfs init` → edits `.ts` files → `tfs build` | ⚠️ Fragile |
| **2. Programmatic Use (e.g., Scatter)** | App runs `npm i @three-forma-styli/core` → imports functions → generates CSS at runtime from user input | ✅ Works well |

## Use Case 2 is Already Solid

The `@three-forma-styli/core` package is clean and framework-agnostic. It exports:

- `generateCssVariables(designSystem, config?)` — takes a DesignSystem object, returns CSS string
- `oklch()` — color helper
- All TypeScript types

Example usage in Scatter or any webapp:

```typescript
import { generateCssVariables, oklch, type DesignSystem } from '@three-forma-styli/core';

// Build from user input
const system: DesignSystem = {
  colors: {
    default: {
      bg: oklch(userL, userC, userH),
      // ...
    }
  },
  // ...
};

const css = generateCssVariables(system);
// Inject css into <style> tag
```

## Use Case 1: The Problem

When a user runs `tfs build .`, the CLI needs to execute their `index.ts` to get the `DesignSystem` object. But `.ts` files can't run directly in Node — they need compilation.

### Current Implementation

Located in `packages/cli/src/commands/build.ts`:

```typescript
const evalScript = `
  import('${inputPath}').then(async (module) => {
    let designSystem = module.default || module.theme || module.designSystem;
    // ... extraction logic ...
    console.log(JSON.stringify({ designSystem, config }));
  }).catch(err => {
    console.error('Import error:', err.message);
    process.exit(1);
  });
`;

const result = execSync(`npx tsx --eval "${evalScript}"`, {
  encoding: 'utf-8',
  cwd: path.dirname(inputPath)
});
```

### Why This Breaks

1. **tsx dependency** — Must be installed in user's project or globally
2. **Dynamic import resolution** — The `import()` inside the eval script needs to resolve `@three-forma-styli/core`, but module resolution in this shelled-out context is fragile
3. **Environment sensitivity** — Different Node versions, package managers (npm/yarn/pnpm), and monorepo setups cause subtle breakages
4. **Shell escaping** — The eval script is passed as a string argument, which can have escaping issues

## Proposed Solutions

### Option A: Bundle tsx More Tightly

The CLI already has `tsx` as a dependency (`"tsx": "^4.19.2"`). But the `--eval` approach and dynamic imports are the issue, not tsx itself.

**Verdict:** Doesn't address the root cause.

### Option B: Compile Then Import (Recommended)

```
tfs build .
  → Use esbuild to compile user's .ts files to a temp .js bundle
  → Import the compiled .js using standard Node import
  → Extract DesignSystem, generate CSS
  → Delete temp files
```

**Pros:**
- Controlled compilation step
- Standard Node imports (no dynamic import resolution issues)
- esbuild is extremely fast
- Works reliably across environments

**Cons:**
- Adds esbuild as dependency
- Slightly more code

### Option C: Use tsx Programmatically via `tsImport`

The `tsx` package exports a `tsImport()` function for programmatic use:

```typescript
import { tsImport } from 'tsx/esm/api';

const module = await tsImport(inputPath, import.meta.url);
const designSystem = module.default || module.designSystem;
```

**Pros:**
- No shell escaping issues
- Uses existing tsx dependency
- May resolve modules more reliably

**Cons:**
- Still depends on tsx's module resolution
- Less control than explicit compilation

## Recommendation

**Option B (compile then import)** is likely the most robust solution. It separates concerns:
1. Compilation (controlled, predictable)
2. Import (standard Node, well-understood)

## Files to Modify

- `packages/cli/src/commands/build.ts` — Main fix location
- `packages/cli/package.json` — Add esbuild dependency if using Option B

## Cleanup Note

The file `packages/core/convert-colors.mjs` is development debris from converting Scatter's LCH colors to OKLCH. It doesn't belong in the core package and can be:
- Deleted entirely, or
- Moved to a `scripts/` folder at the repo root for reference
