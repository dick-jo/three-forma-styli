# v0.5 review

This is the morning review surface for the v0.5 foundation. It separates the
small product decisions worth human ownership from the larger body of automated
evidence.

## Status

- The ratified Family → Domain → Identity grammar is implemented.
- Alpha, Color groups, runtime-theme policy, and Typography use the new model.
- Alpha has a first-class Workbench matrix, focused editor, draft/reset flow,
  capture state, and packed-browser proof.
- The reference project builds one deterministic, package-shaped output tree.
- Generated application contracts are split by capability and contain no
  framework runtime.
- The complete packed-release and ecosystem gate passes.
- A disposable migration of Scatter's real design-system package also builds,
  checks for drift, and type-checks as a consumer. The real Scatter checkout was
  not modified.
- Nothing has been published and no production consumer has been migrated.

## Fifteen-minute ownership review

Read these in order:

1. [Founder Board](./founder-board.md) — product thesis, grammar, dependency
   graph, package boundaries, and deliberate deferrals.
2. [`examples/project/tfs.config.ts`](../examples/project/tfs.config.ts) — one
   complete authoring surface.
3. Locally generated `examples/project/generated/runtime/tokens.d.ts` — compact
   token identities, groups, and exact CSS-variable helpers.
4. Locally generated `examples/project/generated/runtime/typography.d.ts` —
   semantic typography selection and class resolution.
5. Locally generated `examples/project/generated/review/index.html` — visual
   Workbench and build diagnostics.
6. [Migration guide](./v05-migration.md) — the intentional breaking changes.

The generated declarations total 909 lines in the reference package, split into
five focused entrypoints. Ordinary component code imports `./tokens` and/or
`./typography`; it does not import a 4,200-line resolved-system object.

## Consumer ergonomics proven

The generated token contract type-checks patterns such as:

```ts
import {
  colorRampStyle,
  colorVariable,
  type ColorIdentity,
  type ColorIdentityIn,
} from '@repo/design-system/tokens';

export const BUTTON_COLORS = ['neu', 'pri', 'pos', 'neg'] as const
  satisfies readonly ColorIdentity[];

export type NetworkColor = ColorIdentityIn<'network'>;

colorVariable('network-ethereum', 'lo-x'); // --clr-network-ethereum-a-lo-x
colorRampStyle('pri', '--button-color');
```

Invalid project-invented colors, group members, typography roles, sizes,
weights, styles, and variants fail in TypeScript. Detailed numeric and derivation
facts remain in the manifest and Workbench rather than bloating ordinary imports.

## Scatter proof

A durable sibling review project at `../../tfs-v05-scatter-review` was migrated
from Scatter's current `packages/design-system` against this worktree using its
real Supreme and JetBrains Mono sources. It generates 34 files and passes
byte-for-byte drift checking and a strict external consumer typecheck. It is a
local review surface, not a deployable package or production source of truth.

The required authored migration is deliberately small:

1. move `ALPHA_SCHEDULE` to top-level named `alpha`, omitting compiler-owned
   `non`;
2. add Color groups for `core`, `sentiment`, `network`, and `special`;
3. move the exact custom-theme selection into
   `project.runtime.colorThemes`;
4. move typography's old `base + variants` size data into `sizes`, remove
   `displayOrder`, and declare each role's inherited default `weight`;
5. rename Motion's authored container from `recipes` to `composites`;
6. enable the compact `tokens` contract, disable the detailed `system` contract,
   and replace the package export `./system` with `./tokens`.

No visual values were recalibrated in that proof. Scatter's current palette,
P3-capable OKLCH CSS path, modes, fonts, typography tuples, motion, and shadows
were preserved while only their v0.5 structure changed.

## Automated evidence

`pnpm check:release` covers:

- formatting, coordinated versions, builds, package-boundary checks, and all
  unit/type tests;
- 253 core tests, 102 compiler tests, and 29 CLI tests;
- Svelte Workbench source diagnostics and byte equality with compiler-owned
  assets;
- `publint` for every public package;
- concurrent packing and an isolated packed-package TypeScript consumer;
- clean tarball installs, standalone and workspace scaffolds, and generated
  package packing;
- production browser, Next 16, Svelte 5, and pnpm/Turborepo consumers;
- Chromium runtime-theme and Workbench interaction tests.

The release browser proof now enters the Alpha lab as well as Color, Typography,
Motion, and overview flows; adding a visual lab without updating release evidence
therefore fails CI.

The packed-browser test also guards two public-boundary regressions caught during
this pass: core declarations no longer leak Culori's ambient types, and generated
runtime contracts preserve `non` as literal `0`.

## Deliberate deferrals

These are not half-implemented:

- generic multi-axis authoring and collision resolution;
- formal ordered-range grammar for Motion and Shadow beyond the v0.5 composite
  terminology correction;
- partial runtime-theme payload inheritance;
- generic grouping controls outside Color without a real grouping-level case;
- WCAG contrast diagnostics alongside the existing OKLCH-L constraint;
- Figma plugin work;
- framework-specific Text components.

Each is isolated behind an existing boundary so it can be added without
invalidating the v0.5 grammar.

## Release sequence after approval

1. Review the six surfaces above and the Workbench.
2. Apply the documented migration to Scatter on its own integration branch.
3. Regenerate, migrate `./system` consumers to `./tokens`, and run Scatter's full
   application checks and visual review.
4. Version and publish the coordinated v0.5 packages using Changesets.
5. Replace Scatter's local workspace references with the approved release policy
   and re-run CI before merging.
