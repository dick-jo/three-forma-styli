# Monorepo integration

TFS fits a monorepo as one ordinary private design-system package. The package
owns authored inputs and one generated subtree; applications consume package
exports. TFS does not copy the same contract into several application folders,
edit the workspace root, or require its compiler in an application bundle.

```text
packages/design-system/
├── src/                         authored system and font policy
├── fonts/source/                canonical font inputs and licences
├── tfs.config.ts                project assembly and output policy
├── package.json                 human-owned consumer boundary
└── generated/                   atomically replaced by TFS
    ├── runtime/                 ESM, declarations and styles
    ├── assets/fonts/            prepared web fonts
    ├── review/                  local specimens
    ├── design/                  interchange artifacts
    └── build.manifest.json
```

Scaffold that shape explicitly:

```sh
tfs init design-system \
  --workspace-package \
  --package-name @repo/design-system \
  --package-manager pnpm
```

## Consumer boundary

Each application declares `@repo/design-system: workspace:*` and imports the
global entry once at its framework-approved root:

```ts
import '@repo/design-system/styles.css';
```

Code consumes typed subpaths rather than reaching into `generated/`:

```ts
import { nativeColorModes } from '@repo/design-system/native-color-modes';
import { runtimeColorThemeConfig } from '@repo/design-system/runtime-color-theme';
import type { TypographySelection } from '@repo/design-system/typography';
import typography from '@repo/design-system/typography.module.css';
```

When the authored color system includes `colors.luminance` and an explicit
`colors.runtimeThemes.colorNames` subset, `runtimeColorThemeConfig` is the exact
browser-safe policy consumed by `@three-forma-styli/core/runtime`. Applications
do not repeat editable color names, alpha schedules, prefixes, or luminance
groups. Static design-system colors remain outside the user-authored payload.

This is the first-class answer to several applications needing the same output.
There is one generated package and many consumers—not several configured copy
destinations that can drift independently. A deployment tool may still copy the
package's public assets as part of its normal bundling process.

Project-wide naming and color-format policy belongs beside the system, not in
individual targets:

```ts
defineTfsProject({
	system,
	generator: {
		prefixes: { color: 'palette', typographyRole: 'copy' },
		colorFormat: { alphaModifier: 'opacity' },
	},
	output,
});
```

The resolved policy applies to runtime CSS and contracts, Workbench/review
output, TypeScript, DTCG and Figma artifacts together. TFS tests this as a
cross-target invariant; a project cannot quietly publish different namespaces
to different consumers.

## Command and CI contract

The scaffold deliberately separates authoring from ordinary repository checks:

| Command                | Writes         | FontTools                     | Intended use                      |
| ---------------------- | -------------- | ----------------------------- | --------------------------------- |
| `pnpm generate`        | `generated/**` | when conversion is configured | explicit design-system authoring  |
| `pnpm build`           | nothing        | no                            | fast committed-package validation |
| `pnpm check`           | nothing        | no                            | types plus routine validation     |
| `pnpm check:generated` | nothing        | when conversion is configured | dedicated regeneration/drift CI   |

`build --dry-run --json` exposes the resolved artifact graph, exports and
external prerequisites for CI orchestration without creating output.

For Turborepo-style hosts, declare the package's authored config, source, fonts,
licences, package manifest, exact TFS versions, and lockfile as inputs. The
committed `generated/**` tree is an input to ordinary validation. The heavy
drift task has no outputs because its candidate tree is private and discarded.
Do not cache regeneration until the pinned FontTools/Python identity is also in
the task key.

A conservative starting point is:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": []
		},
		"check": {
			"dependsOn": ["build"],
			"outputs": []
		},
		"check:generated": {
			"cache": false,
			"outputs": []
		}
	}
}
```

Treat this as host guidance, not a file TFS should inject. Existing repositories
usually have naming, dependency and cache policies that a generator cannot infer
safely.

## Dependency and security boundary

- Keep `@three-forma-styli/compiler` and `@three-forma-styli/cli` in the design
  package's `devDependencies`, pinned to one exact reviewed release.
- Applications normally consume only the generated private package. FontTools,
  fontkit, esbuild, prompts, and the workbench source toolchain do not enter their
  production graph.
- Applications that compile genuinely user-authored themes may explicitly use
  `@three-forma-styli/core/runtime`. That browser subpath is dependency-free in
  the emitted bundle; a future dedicated runtime package is an install-graph
  optimization, not a prerequisite for safe bundling.
- Run regeneration in a dedicated job with a pinned external font toolchain.
  Routine pull-request checks should never opportunistically download or execute
  FontTools.

## Adoption sequence

1. Add only the private package and its committed generated output.
2. Run its routine and heavy checks in isolation.
3. Pack it and prove a disposable framework consumer before importing it from an
   existing application.
4. Add the workspace dependency without changing production imports.
5. Migrate one application boundary, then test themes, P3 output, fonts and
   fallback behavior in a real browser.
6. Remove copied legacy output only after parity is demonstrated.

This keeps a large design-system migration reviewable without making TFS timid:
the source system and generated contract may change substantially, while each
consumer transition remains an explicit, reversible step.

TFS itself runs that rehearsal against a neutral generated package:

```sh
pnpm check:frameworks # packed package in a fresh Next.js application
pnpm check:monorepo   # generated package in a fresh pnpm/Turborepo workspace
```

It packs the released TFS toolchain, scaffolds and builds a workspace-package
project, packs that generated package, and installs the tarball into a fresh
Next.js application. The separate monorepo proof runs the workspace package's
routine build/check graph, requires generated bytes to remain unchanged, and
rejects compiler or interactive-tool leakage into the application's production
dependency graph. Both fixtures deliberately use generic author vocabulary and
package names; Scatter remains a downstream reference integration, not an
implicit core preset.
